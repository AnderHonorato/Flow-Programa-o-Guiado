"""Transporte HTTP e transações das operações do Flow."""
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from threading import Lock
import json
import logging
import os
import time
import hashlib

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from servidor.banco import criar_banco
from servidor.configuracao import Configuracao
from servidor.esquemas import Cadastro, CorrecaoManual, Credenciais, NovaTentativa, RevisaoHumana, Sincronizacao
from servidor.modelos import Auditoria, EventoProgresso, Progresso, Sessao, Tentativa, Usuario, VersaoCatalogo, agora
from servidor.seguranca import HASH_FICTICIO, criar_sessao, hash_senha, resumo_token, verificar_senha
from servidor.servicos.catalogo import AtualizacaoCatalogo, encontrar_aula, ler_catalogo, validar_catalogo
from servidor.servicos.correcao import CorrecaoIndisponivel, CorretorGPT
from servidor.servicos.progresso import aplicar_evento, estado_vazio, mesclar
from servidor.servicos.contas import conferir_acesso, expirar_restricao

bearer = HTTPBearer(auto_error=False)


def usuario_publico(usuario):
    return {'id': usuario.id, 'nome': usuario.nome, 'email': usuario.email, 'papel': usuario.papel}


def tentativa_publica(tentativa):
    return {'id': tentativa.id_cliente, 'idServidor': tentativa.id, 'usuarioId': tentativa.usuario_id,
            'aulaId': tentativa.aula_id, 'arquivos': tentativa.arquivos,
            'criadaEm': tentativa.criada_em_cliente, 'recebidaEm': tentativa.recebida_em.replace(tzinfo=timezone.utc).isoformat(),
            'status': tentativa.status, 'feedback': tentativa.feedback, 'versao': tentativa.versao,
            'enunciado': tentativa.enunciado}


def criar_aplicacao(configuracao=None, corretor=None, migrar=True):
    config = configuracao or Configuracao()
    motor, fabrica = criar_banco(config.banco_url)

    @asynccontextmanager
    async def ciclo_vida(app):
        if migrar and os.getenv('MIGRAR_AO_INICIAR', '1') == '1':
            from servidor.migracoes.executar import atualizar
            atualizar(motor)
        yield
        motor.dispose()

    app = FastAPI(title='Flow Programação Guiada — API', version='0.6.0', lifespan=ciclo_vida)
    app.state.motor = motor
    app.state.banco = fabrica
    app.state.corretor = corretor or CorretorGPT(config.chave_openai, config.modelo_openai)
    app.state.metricas = {'requisicoes': 0, 'erros': 0, 'duracaoTotalMs': 0}
    app.add_middleware(CORSMiddleware, allow_origins=config.origens, allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                       allow_headers=['Authorization', 'Content-Type'], allow_credentials=False)
    acessos = defaultdict(deque)
    trava_acessos = Lock()

    @app.middleware('http')
    async def protecoes(request, proximo):
        inicio = time.monotonic()
        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            total = 0
            partes = []
            async for parte in request.stream():
                total += len(parte)
                if total > config.limite_requisicao:
                    return JSONResponse({'detail': 'Requisição excede limite de 2 MB.'}, status_code=413)
                partes.append(parte)
            request._body = b''.join(partes)
        resposta = await proximo(request)
        resposta.headers['X-Content-Type-Options'] = 'nosniff'
        resposta.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        resposta.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        if request.url.path.startswith('/api'):
            resposta.headers['Cache-Control'] = 'no-store'
        app.state.metricas['requisicoes'] += 1
        app.state.metricas['erros'] += int(resposta.status_code >= 500)
        app.state.metricas['duracaoTotalMs'] += round((time.monotonic() - inicio) * 1000, 2)
        return resposta

    def banco(request: Request):
        with fabrica() as sessao:
            if motor.dialect.name == 'sqlite' and request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
                sessao.execute(text('BEGIN IMMEDIATE'))
            if (motor.dialect.name == 'postgresql' and request.method in {'PATCH', 'DELETE'}
                    and request.url.path.startswith('/api/admin/usuarios/')):
                # Antes de autenticar/travar o ator: evita deadlock entre duas
                # moderações administrativas cruzadas e protege o último admin.
                sessao.execute(text('SELECT pg_advisory_xact_lock(740125020)'))
            try:
                yield sessao
            except Exception:
                sessao.rollback()
                raise

    def autenticar(request: Request, credenciais: HTTPAuthorizationCredentials | None = Depends(bearer), db=Depends(banco)):
        if not credenciais:
            raise HTTPException(401, 'Entre na sua conta para continuar.', headers={'WWW-Authenticate': 'Bearer'})
        sessao = db.get(Sessao, resumo_token(credenciais.credentials))
        if not sessao:
            raise HTTPException(401, {'codigo': 'SESSAO_REVOGADA',
                                     'mensagem': 'Esta sessão foi encerrada ou não está mais disponível. Entre novamente.'},
                                headers={'WWW-Authenticate': 'Bearer'})
        if sessao.expira_em.replace(tzinfo=timezone.utc) <= agora():
            raise HTTPException(401, 'Sessão expirada. Entre novamente.', headers={'WWW-Authenticate': 'Bearer'})
        consulta = select(Usuario).where(Usuario.id == sessao.usuario_id)
        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            consulta = consulta.with_for_update()
        usuario = db.scalar(consulta)
        if not usuario:
            raise HTTPException(401, {'codigo': 'SESSAO_REVOGADA', 'mensagem': 'Esta sessão foi encerrada.'})
        conferir_acesso(usuario)
        if expirar_restricao(db, usuario):
            db.commit()
        if sessao.revogada_em is not None:
            raise HTTPException(401, {'codigo': 'SESSAO_REVOGADA',
                                     'mensagem': 'Esta sessão foi encerrada. Entre novamente.'})
        request.state.hash_token = sessao.hash_token
        return usuario

    def administrador(usuario=Depends(autenticar)):
        if usuario.papel != 'admin':
            raise HTTPException(403, 'Ação exclusiva da administração.')
        return usuario

    def limitar_login(request):
        chave = request.client.host if request.client else 'local'
        instante = time.monotonic()
        with trava_acessos:
            fila = acessos[chave]
            while fila and fila[0] < instante - 60:
                fila.popleft()
            if len(fila) >= 20:
                raise HTTPException(429, 'Muitas tentativas. Aguarde um minuto.', headers={'Retry-After': '60'})
            fila.append(instante)
            if len(acessos) > 10000:
                for ip in list(acessos):
                    if not acessos[ip] or acessos[ip][-1] < instante - 60:
                        del acessos[ip]

    def auditar(db, ator, acao, recurso, dados=None):
        db.add(Auditoria(ator_id=ator.id if ator else None, acao=acao, recurso=recurso, dados=dados or {}))

    def ler_progresso(db, usuario_id):
        progresso = db.get(Progresso, usuario_id)
        if progresso is None:
            progresso = Progresso(usuario_id=usuario_id, estado=estado_vazio(), versao=0, conflitos=[])
            db.add(progresso)
            db.flush()
        return progresso

    def saida_progresso(progresso, recebidos=None):
        return {'estado': {chave: valor for chave, valor in progresso.estado.items() if not chave.startswith('_')}, 'versao': progresso.versao,
                'conflitos': progresso.conflitos, 'eventosRecebidos': recebidos or []}

    @app.get('/api/saude')
    def saude(db=Depends(banco)):
        try:
            db.execute(text('SELECT 1'))
        except SQLAlchemyError as erro:
            db.rollback()
            original = getattr(erro, 'orig', erro)
            logging.getLogger('flow.banco').error('Conexão do banco indisponível: %s', original)
            detalhe = str(original).lower()
            diagnostico = ('tenant_ou_usuario' if 'tenant or user' in detalhe else
                           'autenticacao' if 'password' in detalhe or 'authentication' in detalhe else
                           'dns' if 'resolve' in detalhe or 'translate host' in detalhe else
                           'tempo_limite' if 'timeout' in detalhe else
                           'permissao' if 'permission' in detalhe else 'conexao')
            return JSONResponse({'status': 'indisponivel', 'versao': '0.6.0',
                                 'banco': 'indisponivel', 'diagnostico': diagnostico}, status_code=503)
        return {'status': 'disponivel', 'versao': '0.6.0', 'gptConfigurado': bool(config.chave_openai)}

    @app.post('/api/contas', status_code=201)
    def cadastrar(entrada: Cadastro, request: Request, db=Depends(banco)):
        limitar_login(request)
        if db.scalar(select(Usuario).where(Usuario.email == str(entrada.email))):
            raise HTTPException(409, 'Não foi possível cadastrar este e-mail.')
        usuario = Usuario(nome=entrada.nome.strip(), email=str(entrada.email), senha_hash=hash_senha(entrada.senha), papel='aluno')
        db.add(usuario)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'Não foi possível cadastrar este e-mail.')
        token = criar_sessao(db, usuario, config.duracao_sessao_horas)
        auditar(db, usuario, 'conta_criada', usuario.id)
        db.commit()
        return {'token': token, 'usuario': usuario_publico(usuario)}

    @app.post('/api/sessao')
    def entrar(entrada: Credenciais, request: Request, db=Depends(banco)):
        limitar_login(request)
        identificador = hashlib.sha256(str(entrada.email).encode()).hexdigest()
        # Este limite persiste entre processos/serverless. Identificadores são
        # resumidos; nenhuma senha, token ou IP bruto entra na auditoria.
        falhas = db.scalar(select(func.count()).select_from(Auditoria).where(
            Auditoria.acao == 'login_recusado', Auditoria.criado_em >= agora() - timedelta(minutes=5),
            Auditoria.dados['identificador'].as_string() == identificador))
        if falhas >= 8:
            raise HTTPException(429, 'Muitas tentativas para esta conta. Aguarde cinco minutos.', headers={'Retry-After': '300'})
        usuario = db.scalar(select(Usuario).where(Usuario.email == str(entrada.email)).with_for_update())
        correto = verificar_senha(entrada.senha, usuario.senha_hash if usuario else HASH_FICTICIO)
        if not usuario or not correto:
            auditar(db, None, 'login_recusado', 'autenticacao', {'identificador': identificador})
            db.commit()
            raise HTTPException(401, 'E-mail ou senha incorretos.')
        conferir_acesso(usuario)
        expirar_restricao(db, usuario)
        token = criar_sessao(db, usuario, config.duracao_sessao_horas)
        auditar(db, usuario, 'sessao_criada', usuario.id)
        db.commit()
        return {'token': token, 'usuario': usuario_publico(usuario)}

    @app.get('/api/eu')
    def eu(usuario=Depends(autenticar)):
        return usuario_publico(usuario)

    @app.delete('/api/sessao', status_code=204)
    def sair(request: Request, usuario=Depends(autenticar), db=Depends(banco)):
        db.delete(db.get(Sessao, request.state.hash_token))
        auditar(db, usuario, 'sessao_revogada', usuario.id)
        db.commit()

    @app.get('/api/progresso')
    def progresso(usuario=Depends(autenticar), db=Depends(banco)):
        registro = db.get(Progresso, usuario.id)
        return saida_progresso(registro) if registro else {'estado': estado_vazio(), 'versao': 0, 'conflitos': [], 'eventosRecebidos': []}

    @app.put('/api/progresso')
    def sincronizar(entrada: Sincronizacao, usuario=Depends(autenticar), db=Depends(banco)):
        # Serializa snapshots do mesmo perfil: duas abas não podem trocar a
        # primeira resposta já confirmada pela outra transação.
        db.scalar(select(Usuario).where(Usuario.id == usuario.id).with_for_update())
        registro = ler_progresso(db, usuario.id)
        catalogo, _ = ler_catalogo(db, config.catalogo)
        anterior = (registro.estado, registro.conflitos)
        estado, conflitos = registro.estado, registro.conflitos
        if entrada.estado:
            try:
                estado, conflitos = mesclar(estado, entrada.estado.model_dump(mode='json', exclude_none=True), conflitos, catalogo)
            except (ValueError, TypeError) as erro:
                raise HTTPException(422, str(erro))
        recebidos = []
        novos = 0
        for evento in entrada.eventos:
            dados = evento.model_dump(mode='json')
            existente = db.scalar(select(EventoProgresso).where(EventoProgresso.usuario_id == usuario.id, EventoProgresso.evento_id == evento.id))
            if existente:
                if existente.dados != dados:
                    raise HTTPException(409, 'Identificador de evento já usado com outro conteúdo. Preserve os dois com IDs diferentes.')
            else:
                try:
                    estado, conflitos = aplicar_evento(estado, dados, conflitos, catalogo)
                except (ValueError, TypeError):
                    raise HTTPException(422, 'Conteúdo inválido para o tipo de evento.')
                db.add(EventoProgresso(usuario_id=usuario.id, evento_id=evento.id, dados=dados))
                db.flush()
                novos += 1
            recebidos.append(evento.id)
        registro.estado = estado
        registro.conflitos = conflitos
        if anterior != (estado, conflitos) or novos:
            registro.versao += 1
        db.commit()
        return saida_progresso(registro, recebidos)

    @app.post('/api/tentativas', status_code=201)
    def enviar(entrada: NovaTentativa, usuario=Depends(autenticar), db=Depends(banco)):
        dados = entrada.model_dump(mode='json')
        existente = db.scalar(select(Tentativa).where(Tentativa.usuario_id == usuario.id, Tentativa.id_cliente == entrada.id))
        if existente:
            if existente.aula_id != entrada.aulaId or existente.arquivos != dados['arquivos'] or existente.criada_em_cliente != dados['criadaEm']:
                raise HTTPException(409, 'ID já usado por outra tentativa. Seu trabalho anterior foi preservado; envie a nova versão com outro ID.')
            return tentativa_publica(existente)
        catalogo, versao = ler_catalogo(db, config.catalogo)
        aula = encontrar_aula(catalogo, entrada.aulaId)
        if aula is None:
            raise HTTPException(404, 'Aula publicada não encontrada no catálogo.')
        tentativa = Tentativa(id_cliente=entrada.id, usuario_id=usuario.id, aula_id=entrada.aulaId,
                              arquivos=dados['arquivos'], criada_em_cliente=dados['criadaEm'],
                              enunciado={**aula, 'versaoCatalogo': versao}, status='pendente_validacao')
        db.add(tentativa)
        db.flush()
        auditar(db, usuario, 'tentativa_recebida', tentativa.id)
        db.commit()
        return tentativa_publica(tentativa)

    @app.get('/api/tentativas')
    def listar_tentativas(limite: int = Query(100, ge=1, le=500), deslocamento: int = Query(0, ge=0), usuario=Depends(autenticar), db=Depends(banco)):
        itens = db.scalars(select(Tentativa).where(Tentativa.usuario_id == usuario.id).order_by(Tentativa.recebida_em.desc()).offset(deslocamento).limit(limite))
        return [tentativa_publica(item) for item in itens]

    @app.get('/api/admin/tentativas')
    def fila(status: str | None = None, usuarioId: str | None = None, aulaId: str | None = None,
             inicio: datetime | None = None, fim: datetime | None = None,
             limite: int = Query(100, ge=1, le=500), deslocamento: int = Query(0, ge=0),
             admin=Depends(administrador), db=Depends(banco)):
        consulta = select(Tentativa)
        for atributo, valor in [(Tentativa.status, status), (Tentativa.usuario_id, usuarioId), (Tentativa.aula_id, aulaId)]:
            if valor:
                consulta = consulta.where(atributo == valor)
        if inicio:
            consulta = consulta.where(Tentativa.recebida_em >= inicio)
        if fim:
            consulta = consulta.where(Tentativa.recebida_em <= fim)
        return [tentativa_publica(item) for item in db.scalars(consulta.order_by(Tentativa.recebida_em).offset(deslocamento).limit(limite))]

    def buscar_tentativa(db, chave):
        # Admin trabalha sempre com idServidor; id local só é único por usuário.
        tentativa = db.scalar(select(Tentativa).where(Tentativa.id == chave).with_for_update())
        if tentativa is None:
            raise HTTPException(404, 'Tentativa não encontrada.')
        return tentativa

    def registrar_aprovacao(db, tentativa):
        db.scalar(select(Usuario).where(Usuario.id == tentativa.usuario_id).with_for_update())
        registro = ler_progresso(db, tentativa.usuario_id)
        registro.estado, registro.conflitos = mesclar(registro.estado, {'aulasConcluidas': [tentativa.aula_id]}, registro.conflitos, ler_catalogo(db, config.catalogo)[0])
        registro.versao += 1

    @app.post('/api/admin/tentativas/{chave}/corrigir')
    def corrigir(chave: str, entrada: CorrecaoManual = CorrecaoManual(), admin=Depends(administrador), db=Depends(banco)):
        tentativa = buscar_tentativa(db, chave)
        if tentativa.status != 'pendente_validacao' and not entrada.confirmarReavaliacao:
            raise HTTPException(409, 'Tentativa já avaliada. Confirme explicitamente a reavaliação.')
        instante = agora()
        if tentativa.correcao_em and tentativa.correcao_em.replace(tzinfo=timezone.utc) > instante - timedelta(minutes=2):
            raise HTTPException(409, 'Correção já em andamento.')
        versao = tentativa.versao
        tentativa.correcao_em = instante
        auditar(db, admin, 'gpt_solicitado_manualmente', tentativa.id, {'modelo': config.modelo_openai})
        db.commit()
        try:
            feedback = app.state.corretor.corrigir(tentativa)
        except CorrecaoIndisponivel as erro:
            db.expire_all()
            atual = buscar_tentativa(db, chave)
            if atual.versao == versao and atual.correcao_em and atual.correcao_em.replace(tzinfo=timezone.utc) == instante:
                atual.correcao_em = None
            auditar(db, admin, 'gpt_falhou', chave, {'tipo': 'indisponivel_ou_formato_invalido'})
            db.commit()
            raise HTTPException(503, str(erro))
        db.expire_all()
        atual = db.scalar(select(Tentativa).where(Tentativa.id == chave).with_for_update())
        if atual.versao != versao or atual.correcao_em is None or atual.correcao_em.replace(tzinfo=timezone.utc) != instante:
            raise HTTPException(409, 'Revisão humana alterou esta tentativa. Resultado GPT descartado; revisão preservada.')
        atual.feedback = feedback.model_dump(mode='json')
        atual.status = 'aprovada' if feedback.aprovado else 'revisar'
        atual.correcao_em = None
        atual.versao += 1
        if feedback.aprovado:
            registrar_aprovacao(db, atual)
        auditar(db, admin, 'gpt_concluido', chave, {'status': atual.status, 'versao': atual.versao, 'feedback': atual.feedback})
        db.commit()
        return tentativa_publica(atual)

    @app.patch('/api/admin/tentativas/{chave}')
    def revisar(chave: str, entrada: RevisaoHumana, admin=Depends(administrador), db=Depends(banco)):
        tentativa = buscar_tentativa(db, chave)
        if entrada.versaoBase is not None and tentativa.versao != entrada.versaoBase:
            raise HTTPException(409, 'Tentativa foi alterada. Atualize a tela antes de revisar.')
        tentativa.status = entrada.status
        tentativa.feedback = entrada.feedback.model_dump(mode='json')
        tentativa.feedback['aprovado'] = entrada.status == 'aprovada'
        tentativa.correcao_em = None
        tentativa.versao += 1
        if entrada.status == 'aprovada':
            registrar_aprovacao(db, tentativa)
        auditar(db, admin, 'revisao_humana', chave, {'justificativa': entrada.justificativa, 'status': entrada.status, 'feedback': tentativa.feedback})
        db.commit()
        return tentativa_publica(tentativa)

    @app.get('/api/admin/catalogo')
    def catalogo_admin(admin=Depends(administrador), db=Depends(banco)):
        dados, versao = ler_catalogo(db, config.catalogo)
        return {'catalogo': dados, 'versao': versao}

    @app.put('/api/admin/catalogo')
    def salvar_catalogo(entrada: AtualizacaoCatalogo, admin=Depends(administrador), db=Depends(banco)):
        # Serializa escritores de CMS no banco, inclusive administradores diferentes.
        if motor.dialect.name == 'postgresql':
            db.execute(text('SELECT pg_advisory_xact_lock(740125019)'))
        _, versao = ler_catalogo(db, config.catalogo)
        if versao != entrada.versaoBase:
            raise HTTPException(409, 'Catálogo atualizado por outra sessão. Sua edição não foi sobrescrita.')
        try:
            validar_catalogo(entrada.catalogo)
        except ValueError as erro:
            raise HTTPException(422, str(erro))
        registro = VersaoCatalogo(autor_id=admin.id, dados=entrada.catalogo.model_dump(mode='json', exclude_none=True))
        db.add(registro)
        db.flush()
        auditar(db, admin, 'catalogo_versionado', str(registro.id))
        db.commit()
        return {'catalogo': registro.dados, 'versao': registro.id}

    @app.get('/api/catalogo')
    def catalogo_publico(db=Depends(banco)):
        dados, versao = ler_catalogo(db, config.catalogo)
        return {'catalogo': dados, 'versao': versao}

    @app.get('/api/admin/catalogo/versoes')
    def historico(admin=Depends(administrador), db=Depends(banco)):
        return [{'versao': v.id, 'autorId': v.autor_id, 'criadoEm': v.criado_em.replace(tzinfo=timezone.utc).isoformat(), 'catalogo': v.dados}
                for v in db.scalars(select(VersaoCatalogo).order_by(VersaoCatalogo.id.desc()).limit(100))]

    @app.get('/api/admin/metricas')
    def metricas(admin=Depends(administrador), db=Depends(banco)):
        estados = dict(db.execute(select(Tentativa.status, func.count()).group_by(Tentativa.status)).all())
        progressos = db.scalars(select(Progresso)).all()
        erros = defaultdict(int)
        for progresso in progressos:
            for alvo, correta in progresso.estado.get('respostas', {}).items():
                if not correta:
                    erros[alvo] += 1
        return {'usuarios': db.scalar(select(func.count()).select_from(Usuario)),
                'tentativas': sum(estados.values()), 'estadosTentativas': estados,
                'aulasConcluidas': sum(len(p.estado.get('aulasConcluidas', [])) for p in progressos),
                'dificuldades': [{'questao': k, 'alunosComErro': v} for k, v in sorted(erros.items(), key=lambda item: -item[1])[:20]],
                'httpProcessoAtual': dict(app.state.metricas)}

    @app.get('/api/admin/auditoria')
    def auditoria(limite: int = Query(100, ge=1, le=500), admin=Depends(administrador), db=Depends(banco)):
        return [{'id': a.id, 'atorId': a.ator_id, 'acao': a.acao, 'recurso': a.recurso,
                 'dados': a.dados, 'criadoEm': a.criado_em.replace(tzinfo=timezone.utc).isoformat()}
                for a in db.scalars(select(Auditoria).order_by(Auditoria.id.desc()).limit(limite))]

    from servidor.rotas.execucoes import criar_rotas_execucoes
    from servidor.rotas.certificados import criar_rotas_certificados
    from servidor.rotas.comunidade import criar_rotas_comunidade
    app.include_router(criar_rotas_execucoes(autenticar))
    app.include_router(criar_rotas_certificados(autenticar, banco))
    app.include_router(criar_rotas_comunidade(autenticar, administrador, banco, config, auditar))

    @app.get('/{caminho:path}', include_in_schema=False)
    def web(caminho: str):
        if caminho == 'api' or caminho.startswith('api/'):
            raise HTTPException(404, 'Rota da API não encontrada.')
        base = config.web_dist.resolve()
        arquivo = (base / caminho).resolve()
        if not arquivo.is_relative_to(base):
            raise HTTPException(404)
        if arquivo.is_file():
            return FileResponse(arquivo)
        indice = base / 'index.html'
        if indice.is_file():
            return FileResponse(indice)
        raise HTTPException(404, 'Build web não instalado. API disponível em /docs.')

    return app
