"""Fluxos HTTP reais de comunidade, moderação, sessão e opiniões de aula."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select, text

from servidor.aplicacao import criar_aplicacao
from servidor.configuracao import Configuracao
from servidor.modelos import Auditoria, AvaliacaoAula, EventoProgresso, Leitura, Progresso, Sessao, Tentativa, Usuario
from servidor.seguranca import resumo_token
from servidor.testes.teste_api import FEEDBACK, administrador, ambiente, conta, tentativa


def prazo(dias=1):
    return (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat()


def moderar(cliente, admin, id, estado='banido', **dados):
    return cliente.patch(f'/api/admin/usuarios/{id}/estado', headers=admin,
        json={'estado': estado, 'motivo': 'Motivo de teste registrado.', 'ate': None, **dados})


def login(cliente, email='aluna@exemplo.com', senha='uma-senha-forte-123'):
    return cliente.post('/api/sessao', json={'email': email, 'senha': senha})


def test_comunidade_e_gestao_exigem_sessao_e_papel_no_servidor(ambiente):
    c, app = ambiente
    d, h = conta(c)
    for path in ['/api/comunidade', f'/api/comunidade/{d["usuario"]["id"]}', '/api/admin/usuarios',
                 f'/api/admin/usuarios/{d["usuario"]["id"]}', '/api/admin/avaliacoes-aulas', '/api/aulas/html-1/avaliacao']:
        assert c.get(path).status_code == 401
    assert c.get('/api/admin/usuarios', headers=h).status_code == 403
    assert c.get('/api/admin/avaliacoes-aulas', headers=h).status_code == 403
    assert moderar(c, h, d['usuario']['id']).status_code == 403
    assert c.request('DELETE', f'/api/admin/usuarios/{d["usuario"]["id"]}', headers=h,
                     json={'motivo': 'Não sou admin.', 'confirmacao': d['usuario']['email']}).status_code == 403


def test_ranking_paginado_pesquisa_posicao_real_e_nao_expoe_dados_privados(ambiente):
    c, app = ambiente
    a, h = conta(c, nome='Lia Aprendiz')
    b, outro = conta(c, 'bia@exemplo.com', 'Bia Criadora')
    c.put('/api/progresso', headers=outro, json={'estado': {'aulasConcluidas': ['html-1'], 'xp': 99999}})
    with app.state.banco() as db:
        p = db.get(Progresso, b['usuario']['id'])
        p.estado = {**p.estado, 'avatar': {'tipo': 'foto', 'valor': 'FOTO_PRIVADA', 'atualizadoEm': prazo()}}
        db.commit()
    r = c.get('/api/comunidade?pagina=1&tamanho=1', headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['total'] == 2 and len(d['usuarios']) == 1
    primeiro = d['usuarios'][0]
    assert primeiro['id'] == b['usuario']['id'] and primeiro['xp'] == 100 and primeiro['posicao'] == 1
    assert primeiro['aulasConcluidas'] == [{'id': 'html-1', 'titulo': 'Minha primeira página'}]
    assert not {'email', 'papel', 'estado', 'motivo', 'senha_hash'} & primeiro.keys()
    assert 'FOTO_PRIVADA' not in r.text and 'avatar' not in primeiro
    segundo = c.get('/api/comunidade?pagina=2&tamanho=1', headers=h).json()['usuarios'][0]
    assert segundo['id'] == a['usuario']['id'] and segundo['posicao'] == 2
    assert c.get('/api/comunidade?busca=Lia', headers=h).json()['usuarios'][0]['posicao'] == 2
    assert c.get('/api/comunidade?pagina=50', headers=h).json()['usuarios'] == []
    assert c.get('/api/comunidade?tamanho=51', headers=h).status_code == 422
    assert c.get('/api/comunidade?busca=%25', headers=h).json()['total'] == 0


def test_leitura_idempotente_mostra_mais_lidas_sem_conceder_xp(ambiente):
    c, _ = ambiente
    a, h = conta(c)
    _, b = conta(c, 'outra@exemplo.com')
    evento = {'id': str(uuid4()), 'aulaId': 'html-1', 'segundos': 20}
    for _ in range(2):
        assert c.post('/api/leituras', headers=h, json=evento).status_code == 204
    assert c.post('/api/leituras', headers=h, json={**evento, 'segundos': 30}).status_code == 409
    assert c.post('/api/leituras', headers=b, json=evento).status_code == 204
    p = c.get(f'/api/comunidade/{a["usuario"]["id"]}', headers=b).json()
    assert p['leituras'] == 1 and p['xp'] == 0
    assert p['maisLidas'] == [{'aulaId': 'html-1', 'titulo': 'Minha primeira página', 'leituras': 1, 'segundos': 20}]
    assert c.post('/api/leituras', headers=h, json={**evento, 'id': str(uuid4()), 'aulaId': 'inexistente'}).status_code == 404
    for valor in [True, 19, 301, '20']:
        assert c.post('/api/leituras', headers=h, json={**evento, 'id': str(uuid4()), 'segundos': valor}).status_code == 422


def test_opiniao_chega_a_administracao_preserva_dono_e_atualiza_sem_duplicar(ambiente):
    c, app = ambiente
    a, h = conta(c)
    _, outro = conta(c, 'outra@exemplo.com')
    _, admin = administrador(c, app)
    assert c.get('/api/aulas/html-1/avaliacao', headers=h).json() is None
    payload = {'nota': 5, 'comentario': 'Muito clara. <script> é apenas texto.'}
    r = c.put('/api/aulas/html-1/avaliacao', headers=h, json=payload)
    assert r.status_code == 200, r.text
    original = r.json()
    assert c.get('/api/aulas/html-1/avaliacao', headers=h).json() == original
    assert c.get('/api/aulas/html-1/avaliacao', headers=outro).json() is None
    atualizado = c.put('/api/aulas/html-1/avaliacao', headers=h, json={'nota': 4, 'comentario': 'Adicionaria mais exemplos.'}).json()
    assert atualizado['id'] == original['id'] and atualizado['criadaEm'] == original['criadaEm']
    c.put('/api/aulas/html-1/avaliacao', headers=outro, json={'nota': 2, 'comentario': 'Preciso de mais apoio.'})
    admin_r = c.get('/api/admin/avaliacoes-aulas?tamanho=1&busca=primeira', headers=admin).json()
    assert admin_r['total'] == 2 and admin_r['media'] == 3 and len(admin_r['avaliacoes']) == 1
    todos = c.get('/api/admin/avaliacoes-aulas?busca=Aluna', headers=admin).json()
    assert all(x['usuarioNome'] == 'Aluna' and x['tituloAula'] == 'Minha primeira página' for x in todos['avaliacoes'])
    for nota in [0, 6, True, '5']:
        assert c.put('/api/aulas/html-1/avaliacao', headers=h, json={**payload, 'nota': nota}).status_code == 422
    assert c.put('/api/aulas/html-1/avaliacao', headers=h, json={**payload, 'usuarioId': a['usuario']['id']}).status_code == 422
    assert c.put('/api/aulas/inexistente/avaliacao', headers=h, json=payload).status_code == 404


def test_certificados_da_comunidade_exigem_aprovacao_auditada(ambiente):
    c, app = ambiente
    a, h = conta(c)
    _, admin = administrador(c, app)
    envio = tentativa(c, h)
    caminho = f'/api/comunidade/{a["usuario"]["id"]}'
    assert c.get(caminho, headers=h).json()['certificados'] == []
    with app.state.banco() as db:
        db.get(Tentativa, envio['idServidor']).status = 'aprovada'; db.commit()
    assert c.get(caminho, headers=h).json()['certificados'] == []
    assert c.patch(f'/api/admin/tentativas/{envio["idServidor"]}', headers=admin,
                   json={'status': 'aprovada', 'feedback': FEEDBACK, 'justificativa': 'Revisão de critérios.'}).status_code == 200
    perfil = c.get(caminho, headers=h).json()
    certificado = c.get('/api/certificados', headers=h).json()[0]
    assert perfil['certificadosTotal'] == 1
    assert perfil['certificados'][0]['codigo'] == certificado['codigo']
    assert perfil['certificados'][0]['emitidoEm'] == certificado['emitidoEm']


@pytest.mark.parametrize('estado,codigo', [('banido', 'CONTA_BANIDA'), ('inativo', 'CONTA_INATIVA')])
def test_restricao_revoga_sessoes_e_notifica_so_apos_credencial_correta(ambiente, estado, codigo):
    c, app = ambiente
    a, h = conta(c)
    _, admin = administrador(c, app)
    segunda = login(c).json()['token']
    ate = prazo()
    r = moderar(c, admin, a['usuario']['id'], estado, ate=ate)
    assert r.status_code == 200, r.text
    for headers in [h, {'Authorization': f'Bearer {segunda}'}]:
        recusada = c.get('/api/eu', headers=headers)
        assert recusada.status_code == 403
        assert recusada.json()['detail']['codigo'] == codigo
        assert recusada.json()['detail']['motivo'] == 'Motivo de teste registrado.'
        assert recusada.json()['detail']['ate'] == ate
    assert login(c, senha='senha-incorreta').status_code == 401
    assert isinstance(login(c, senha='senha-incorreta').json()['detail'], str)
    assert login(c).json()['detail']['codigo'] == codigo
    with app.state.banco() as db:
        sessoes = db.scalars(select(Sessao).where(Sessao.usuario_id == a['usuario']['id'])).all()
        assert len(sessoes) == 2 and all(s.revogada_em is not None for s in sessoes)
    assert c.get('/api/comunidade', headers=admin).json()['total'] == 1
    assert c.get(f'/api/comunidade/{a["usuario"]["id"]}', headers=admin).status_code == 404
    registrados = c.get('/api/admin/usuarios?estado=' + estado, headers=admin).json()['usuarios']
    assert len(registrados) == 1 and registrados[0]['email'] == a['usuario']['email']


def test_reativar_exige_novo_login_e_nao_ressuscita_tokens(ambiente):
    c, app = ambiente
    a, h = conta(c)
    _, admin = administrador(c, app)
    assert moderar(c, admin, a['usuario']['id']).status_code == 200
    assert moderar(c, admin, a['usuario']['id'], 'ativo').status_code == 200
    recusada = c.get('/api/eu', headers=h)
    assert recusada.status_code == 401 and recusada.json()['detail']['codigo'] == 'SESSAO_REVOGADA'
    nova = login(c)
    assert nova.status_code == 200
    assert c.get('/api/eu', headers={'Authorization': 'Bearer ' + nova.json()['token']}).status_code == 200


def test_fim_de_prazo_reabre_conta_sem_revalidar_sessao_anterior(ambiente):
    c, app = ambiente
    a, h = conta(c)
    _, admin = administrador(c, app)
    assert moderar(c, admin, a['usuario']['id'], ate=prazo()).status_code == 200
    with app.state.banco() as db:
        db.get(Usuario, a['usuario']['id']).acesso_ate = datetime.now(timezone.utc) - timedelta(seconds=1); db.commit()
    derrubada = c.get('/api/eu', headers=h)
    assert derrubada.status_code == 401
    assert derrubada.json()['detail']['codigo'] == 'SESSAO_REVOGADA'
    with app.state.banco() as db:
        assert db.get(Usuario, a['usuario']['id']).estado == 'ativo'
    assert login(c).status_code == 200
    assert c.get('/api/admin/usuarios?estado=ativo', headers=admin).json()['total'] == 2


def test_excluir_limpa_dados_privados_revoga_login_e_preserva_auditoria(ambiente):
    c, app = ambiente
    a, h = conta(c)
    _, admin = administrador(c, app)
    tentativa(c, h)
    c.put('/api/progresso', headers=h, json={'eventos': [{'id': 'abertura-1', 'tipo': 'ultima_aula', 'alvo': 'html-1', 'criadoEm': prazo()}]})
    c.post('/api/leituras', headers=h, json={'id': str(uuid4()), 'aulaId': 'html-1', 'segundos': 20})
    c.put('/api/aulas/html-1/avaliacao', headers=h, json={'nota': 5, 'comentario': 'Gostei do conteúdo.'})
    path = f'/api/admin/usuarios/{a["usuario"]["id"]}'
    dados = {'motivo': 'Exclusão solicitada para teste.', 'confirmacao': a['usuario']['email']}
    assert c.request('DELETE', path, headers=admin, json={**dados, 'confirmacao': 'outro@exemplo.com'}).status_code == 422
    assert c.request('DELETE', path, headers=admin, json=dados).status_code == 204
    assert c.get('/api/eu', headers=h).status_code == 401
    assert login(c).status_code == 401
    assert c.get(path, headers=admin).status_code == 404
    with app.state.banco() as db:
        assert db.get(Usuario, a['usuario']['id']) is None
        for m in [Leitura, AvaliacaoAula, EventoProgresso, Progresso, Sessao, Tentativa]:
            assert db.scalar(select(func.count()).select_from(m).where(m.usuario_id == a['usuario']['id'])) == 0
        assert db.scalar(select(func.count()).select_from(Auditoria).where(Auditoria.ator_id == a['usuario']['id'])) == 0
        apagado = db.scalar(select(Auditoria).where(Auditoria.acao == 'usuario_excluido'))
        assert apagado and apagado.recurso == a['usuario']['id'] and 'email' not in apagado.dados


def test_protecoes_administrativas_motivo_e_prazo_sao_obrigatorios_validos(ambiente):
    c, app = ambiente
    a, h = conta(c)
    d, admin = administrador(c, app)
    assert moderar(c, admin, d['usuario']['id']).status_code == 409
    assert c.request('DELETE', f'/api/admin/usuarios/{d["usuario"]["id"]}', headers=admin,
                     json={'motivo': 'Excluir a mim.', 'confirmacao': d['usuario']['email']}).status_code == 409
    for dados in [{'motivo': '     '}, {'ate': prazo(-1)}, {'ate': prazo(3651)}, {'estado': 'ativo', 'ate': prazo()}]:
        assert moderar(c, admin, a['usuario']['id'], **dados).status_code == 422
    with app.state.banco() as db:
        db.get(Usuario, a['usuario']['id']).papel = 'admin'; db.commit()
    assert c.request('DELETE', f'/api/admin/usuarios/{a["usuario"]["id"]}', headers=admin,
                     json={'motivo': 'Preservar autoria.', 'confirmacao': a['usuario']['email']}).status_code == 409


def test_limite_de_login_persiste_entre_processos_sem_guardar_senha(ambiente, tmp_path):
    c, app = ambiente
    conta(c)
    for _ in range(8):
        assert login(c, senha='senha-incorreta').status_code == 401
    config = Configuracao(banco_url=str(app.state.motor.url), catalogo=tmp_path / 'catalogo.json', chave_openai='', web_dist=tmp_path / 'web')
    with TestClient(criar_aplicacao(config)) as outro_processo:
        r = login(outro_processo)
        assert r.status_code == 429 and r.headers['Retry-After'] == '300'
    with app.state.banco() as db:
        falhas = db.scalars(select(Auditoria).where(Auditoria.acao == 'login_recusado')).all()
        assert len(falhas) == 8
        assert all(set(x.dados) == {'identificador'} and 'senha' not in str(x.dados) for x in falhas)


def test_listagem_busca_detalhes_em_lote_sem_n_mais_um(ambiente):
    c, app = ambiente
    _, h = conta(c)
    with app.state.banco() as db:
        exemplo = db.scalar(select(Usuario))
        for i in range(10):
            db.add(Usuario(nome=f'Pessoa {i}', email=f'pessoa{i}@exemplo.com', senha_hash=exemplo.senha_hash, papel='aluno'))
        db.commit()
    chamadas = []
    def observar(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith('SELECT'):
            chamadas.append(statement)
    event.listen(app.state.motor, 'before_cursor_execute', observar)
    try:
        assert c.get('/api/comunidade?tamanho=1', headers=h).status_code == 200
        pequeno = len(chamadas); chamadas.clear()
        assert len(c.get('/api/comunidade?tamanho=20', headers=h).json()['usuarios']) == 11
        assert len(chamadas) == pequeno
    finally:
        event.remove(app.state.motor, 'before_cursor_execute', observar)
