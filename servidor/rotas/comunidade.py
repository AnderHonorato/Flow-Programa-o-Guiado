"""Rotas de comunidade, moderação e opiniões pedagógicas."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select, update
from servidor.esquemas import ExclusaoUsuario, ModeracaoUsuario, NovaLeitura, OpiniaoAula
from servidor.modelos import Auditoria, AvaliacaoAula, EventoProgresso, Leitura, Progresso, Sessao, Tentativa, Usuario, agora
from servidor.servicos.catalogo import encontrar_aula, ler_catalogo
from servidor.servicos.comunidade import aulas_por_id, perfis_em_lote, ranking_sql
from servidor.servicos.contas import estado_efetivo, filtro_ativos, iso


def opiniao_publica(registro):
    return {'id': registro.id, 'aulaId': registro.aula_id, 'nota': registro.nota, 'comentario': registro.comentario,
            'criadaEm': iso(registro.criada_em), 'atualizadaEm': iso(registro.atualizada_em)}


def criar_rotas_comunidade(autenticar, administrador, banco, config, auditar):
    rotas = APIRouter()

    def catalogo(db):
        return ler_catalogo(db, config.catalogo)[0]

    def aula_existente(db, id):
        if encontrar_aula(catalogo(db), id) is None:
            raise HTTPException(404, 'Aula publicada não encontrada.')

    def paginar_usuarios(db, pagina, tamanho, busca, privado=False, estado=''):
        r = ranking_sql()
        consulta = select(Usuario, r.c.posicao).outerjoin(r, r.c.usuario_id == Usuario.id)
        if not privado:
            consulta = consulta.where(filtro_ativos())
        elif estado == 'ativo':
            consulta = consulta.where(filtro_ativos())
        elif estado:
            consulta = consulta.where(Usuario.estado == estado, or_(Usuario.acesso_ate.is_(None), Usuario.acesso_ate > agora()))
        if busca.strip():
            padrao = '%' + busca.strip().lower().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
            campos = [func.lower(Usuario.nome).like(padrao, escape='\\')]
            if privado:
                campos.append(func.lower(Usuario.email).like(padrao, escape='\\'))
            consulta = consulta.where(or_(*campos))
        total = db.scalar(select(func.count()).select_from(consulta.subquery()))
        consulta = consulta.order_by(Usuario.criado_em.desc(), Usuario.id) if privado else consulta.order_by(r.c.posicao)
        linhas = db.execute(consulta.offset((pagina - 1) * tamanho).limit(tamanho)).all()
        usuarios = [l[0] for l in linhas]
        perfis = perfis_em_lote(db, usuarios, catalogo(db), {u.id: int(p or 0) for u, p in linhas}, admin=privado, detalhado=False)
        return {'usuarios': perfis, 'total': total, 'pagina': pagina, 'tamanho': tamanho}

    @rotas.get('/api/comunidade')
    def comunidade(pagina: int = Query(1, ge=1), tamanho: int = Query(20, ge=1, le=50), busca: str = Query('', max_length=100),
                   usuario=Depends(autenticar), db=Depends(banco)):
        return paginar_usuarios(db, pagina, tamanho, busca)

    @rotas.get('/api/comunidade/{id}')
    def perfil_comunidade(id: str, usuario=Depends(autenticar), db=Depends(banco)):
        r = ranking_sql()
        linha = db.execute(select(Usuario, r.c.posicao).join(r, r.c.usuario_id == Usuario.id).where(Usuario.id == id)).first()
        if not linha:
            raise HTTPException(404, 'Perfil indisponível na comunidade.')
        return perfis_em_lote(db, [linha[0]], catalogo(db), {id: int(linha[1])})[0]

    @rotas.get('/api/admin/usuarios')
    def usuarios_admin(pagina: int = Query(1, ge=1), tamanho: int = Query(20, ge=1, le=50),
                       busca: str = Query('', max_length=100), estado: str = Query('', pattern='^(|ativo|banido|inativo)$'),
                       admin=Depends(administrador), db=Depends(banco)):
        return paginar_usuarios(db, pagina, tamanho, busca, privado=True, estado=estado)

    @rotas.get('/api/admin/usuarios/{id}')
    def usuario_admin(id: str, admin=Depends(administrador), db=Depends(banco)):
        alvo = db.get(Usuario, id)
        if alvo is None:
            raise HTTPException(404, 'Usuário não encontrado.')
        r = ranking_sql()
        posicao = db.scalar(select(r.c.posicao).where(r.c.usuario_id == id))
        return perfis_em_lote(db, [alvo], catalogo(db), {id: int(posicao or 0)}, admin=True)[0]

    @rotas.patch('/api/admin/usuarios/{id}/estado')
    def moderar(id: str, entrada: ModeracaoUsuario, admin=Depends(administrador), db=Depends(banco)):
        if id == admin.id:
            raise HTTPException(409, 'Você não pode restringir ou alterar o estado da própria conta administrativa.')
        alvo = db.scalar(select(Usuario).where(Usuario.id == id).with_for_update())
        if alvo is None:
            raise HTTPException(404, 'Usuário não encontrado.')
        if entrada.estado != 'ativo' and alvo.papel == 'admin':
            ativos = db.scalar(select(func.count()).select_from(Usuario).where(Usuario.papel == 'admin', filtro_ativos()))
            if estado_efetivo(alvo) == 'ativo' and ativos <= 1:
                raise HTTPException(409, 'A aplicação precisa conservar um administrador ativo.')
        anterior = estado_efetivo(alvo)
        alvo.estado = entrada.estado
        alvo.motivo_estado = entrada.motivo if entrada.estado != 'ativo' else None
        alvo.acesso_ate = entrada.ate
        if entrada.estado != 'ativo':
            db.execute(update(Sessao).where(Sessao.usuario_id == id, Sessao.revogada_em.is_(None)).values(revogada_em=agora()))
        auditar(db, admin, 'usuario_estado_alterado', id,
                {'anterior': anterior, 'estado': entrada.estado, 'motivo': entrada.motivo, 'ate': iso(entrada.ate)})
        db.commit()
        return {'id': id, 'estado': alvo.estado, 'motivo': alvo.motivo_estado, 'ate': iso(alvo.acesso_ate)}

    @rotas.delete('/api/admin/usuarios/{id}', status_code=204)
    def excluir(id: str, entrada: ExclusaoUsuario, admin=Depends(administrador), db=Depends(banco)):
        if id == admin.id:
            raise HTTPException(409, 'Você não pode excluir a própria conta administrativa.')
        alvo = db.scalar(select(Usuario).where(Usuario.id == id).with_for_update())
        if alvo is None:
            raise HTTPException(404, 'Usuário não encontrado.')
        if alvo.papel == 'admin':
            raise HTTPException(409, 'Contas administrativas preservam o histórico de autoria e certificados. Use inativar ou banir.')
        if entrada.confirmacao != alvo.email:
            raise HTTPException(422, 'Digite exatamente o e-mail da conta para confirmar a exclusão.')
        for modelo in [Leitura, AvaliacaoAula, EventoProgresso, Progresso, Sessao, Tentativa]:
            db.execute(delete(modelo).where(modelo.usuario_id == id))
        # Preserva as ações já auditadas sem manter uma relação pessoal com a conta apagada.
        db.execute(update(Auditoria).where(Auditoria.ator_id == id).values(ator_id=None))
        db.delete(alvo)
        auditar(db, admin, 'usuario_excluido', id, {'motivo': entrada.motivo})
        db.commit()

    @rotas.post('/api/leituras', status_code=204)
    def leitura(entrada: NovaLeitura, usuario=Depends(autenticar), db=Depends(banco)):
        aula_existente(db, entrada.aulaId)
        anterior = db.scalar(select(Leitura).where(Leitura.usuario_id == usuario.id, Leitura.id_cliente == str(entrada.id)))
        if anterior:
            if anterior.aula_id != entrada.aulaId or anterior.segundos != entrada.segundos:
                raise HTTPException(409, 'Este registro de leitura já possui outros dados.')
            return
        db.add(Leitura(id_cliente=str(entrada.id), usuario_id=usuario.id, aula_id=entrada.aulaId, segundos=entrada.segundos))
        db.commit()

    @rotas.get('/api/aulas/{aula_id}/avaliacao')
    def minha_opiniao(aula_id: str, usuario=Depends(autenticar), db=Depends(banco)):
        aula_existente(db, aula_id)
        registro = db.scalar(select(AvaliacaoAula).where(AvaliacaoAula.usuario_id == usuario.id, AvaliacaoAula.aula_id == aula_id))
        return opiniao_publica(registro) if registro else None

    @rotas.put('/api/aulas/{aula_id}/avaliacao')
    def avaliar_aula(aula_id: str, entrada: OpiniaoAula, usuario=Depends(autenticar), db=Depends(banco)):
        aula_existente(db, aula_id)
        registro = db.scalar(select(AvaliacaoAula).where(AvaliacaoAula.usuario_id == usuario.id, AvaliacaoAula.aula_id == aula_id).with_for_update())
        if registro is None:
            registro = AvaliacaoAula(usuario_id=usuario.id, aula_id=aula_id, nota=entrada.nota, comentario=entrada.comentario)
            db.add(registro)
        else:
            registro.nota = entrada.nota
            registro.comentario = entrada.comentario
            registro.atualizada_em = agora()
        db.flush()
        auditar(db, usuario, 'aula_avaliada', registro.id, {'aulaId': aula_id, 'nota': entrada.nota})
        db.commit()
        return opiniao_publica(registro)

    @rotas.get('/api/admin/avaliacoes-aulas')
    def avaliacoes_aulas(pagina: int = Query(1, ge=1), tamanho: int = Query(20, ge=1, le=50),
                        busca: str = Query('', max_length=100), admin=Depends(administrador), db=Depends(banco)):
        aulas = aulas_por_id(catalogo(db))
        consulta = select(AvaliacaoAula, Usuario.nome).join(Usuario, Usuario.id == AvaliacaoAula.usuario_id)
        if busca.strip():
            termo = busca.strip().lower()
            padrao = '%' + termo.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
            correspondentes = [id for id, a in aulas.items() if termo in a['titulo'].lower()]
            consulta = consulta.where(or_(func.lower(Usuario.nome).like(padrao, escape='\\'),
                                         AvaliacaoAula.aula_id.in_(correspondentes)))
        filtro = consulta.subquery()
        total = db.scalar(select(func.count()).select_from(filtro))
        media = db.scalar(select(func.avg(filtro.c.nota)))
        linhas = db.execute(consulta.order_by(AvaliacaoAula.atualizada_em.desc(), AvaliacaoAula.id)
            .offset((pagina - 1) * tamanho).limit(tamanho)).all()
        return {'avaliacoes': [{**opiniao_publica(a), 'usuarioId': a.usuario_id, 'usuarioNome': nome,
                               'tituloAula': aulas.get(a.aula_id, {}).get('titulo', a.aula_id)} for a, nome in linhas],
                'total': total, 'pagina': pagina, 'tamanho': tamanho, 'media': round(float(media), 2) if media is not None else None}

    return rotas
