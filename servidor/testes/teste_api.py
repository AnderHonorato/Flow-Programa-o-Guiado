"""Integração real HTTP + SQLite migrado, com transportes GPT controlados."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import os
from uuid import uuid4
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient
from openai import OpenAI
import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url

from servidor.aplicacao import criar_aplicacao
from servidor.configuracao import Configuracao
from servidor.esquemas import Feedback
from servidor.modelos import Sessao, Tentativa, Usuario
from servidor.seguranca import hash_senha, resumo_token
from servidor.servicos.correcao import CorrecaoIndisponivel, CorretorGPT


AULA = {
    'id': 'html-1', 'titulo': 'Minha primeira página', 'objetivo': 'Criar título e parágrafo',
    'preRequisitos': [], 'blocos': ['HTML organiza conteúdo.'],
    'exemplos': [{'titulo': 'Título', 'codigo': '<h1>Olá</h1>', 'explicacao': ['Cria título.']},
                 {'titulo': 'Parágrafo', 'codigo': '<p>Oi</p>', 'explicacao': ['Cria parágrafo.']}],
    'questoes': [{'id': 'q1', 'enunciado': 'Qual título?', 'alternativas': [
        {'texto': 'h1', 'correta': True, 'feedback': 'Cria título.'},
        {'texto': 'p', 'correta': False, 'feedback': 'Cria parágrafo.'}]}] * 2,
    'desafio': 'Crie título e parágrafo', 'variacao': 'Mude o título', 'resumo': 'Estruture sua página.',
    'pontosDificeis': ['Fechamento'], 'pistas': ['Use h1'], 'arquivos': {'html': '<h1>Oi</h1>', 'css': '', 'js': ''},
    'competencia': 'semantica-html', 'linguagem': 'html', 'rubrica': ['Título principal existe', 'Parágrafo existe']}
CATALOGO = {'versao': 1, 'trilhas': [{'id': 'html', 'titulo': 'HTML', 'descricao': 'Estrutura web',
                                    'cor': '#D97757', 'preRequisitos': [],
                                    'modulos': [{'id': 'html-inicio', 'titulo': 'Início', 'estado': 'publicado', 'aulas': [AULA]}]}]}
FEEDBACK = {'nota': 9, 'criterios': [{'criterio': 'Título principal existe', 'atendido': True, 'observacao': 'h1 identificado'}],
            'pontosFortes': ['HTML legível'], 'falhas': [], 'dicas': ['Experimente adicionar uma seção.'],
            'proximaRevisaoDias': 3, 'confianca': .95,
            'limites': 'Análise estática; código não executado.', 'aprovado': True}


@pytest.fixture
def ambiente(tmp_path):
    caminho = tmp_path / 'catalogo.json'
    caminho.write_text(json.dumps(CATALOGO), encoding='utf-8')
    url = f'sqlite:///{tmp_path}/teste.db'
    motor_admin = None
    esquema = None
    if os.getenv('FLOW_TESTE_POSTGRES_URL'):
        motor_admin = create_engine(os.environ['FLOW_TESTE_POSTGRES_URL'])
        esquema = 'teste_' + uuid4().hex
        with motor_admin.begin() as conexao:
            conexao.execute(text(f'CREATE SCHEMA {esquema}'))
        url = make_url(os.environ['FLOW_TESTE_POSTGRES_URL']).update_query_dict({'options': f'-csearch_path={esquema}'}).render_as_string(hide_password=False)
    config = Configuracao(banco_url=url, catalogo=caminho, chave_openai='', web_dist=tmp_path / 'web')
    app = criar_aplicacao(config)
    try:
        with TestClient(app) as cliente:
            yield cliente, app
    finally:
        if motor_admin is not None:
            with motor_admin.begin() as conexao:
                conexao.execute(text(f'DROP SCHEMA {esquema} CASCADE'))
            motor_admin.dispose()


def conta(cliente, email='aluna@exemplo.com', nome='Aluna'):
    resposta = cliente.post('/api/contas', json={'nome': nome, 'email': email, 'senha': 'uma-senha-forte-123'})
    assert resposta.status_code == 201, resposta.text
    dados = resposta.json()
    return dados, {'Authorization': f'Bearer {dados["token"]}'}


def administrador(cliente, app):
    dados, cabecalhos = conta(cliente, 'admin@exemplo.com', 'Administrador')
    # Provisionamento de teste fora da API, equivalente à CLI protegida.
    with app.state.banco() as db:
        db.get(Usuario, dados['usuario']['id']).papel = 'admin'
        db.commit()
    return dados, cabecalhos


def tentativa(cliente, cabecalhos, id='tentativa-dispositivo-1'):
    resposta = cliente.post('/api/tentativas', headers=cabecalhos,
                            json={'id': id, 'aulaId': 'html-1', 'arquivos': {'html': '<h1>Meu título</h1><p>Texto</p>', 'css': '', 'js': ''},
                                  'criadaEm': '2026-10-25T12:00:00Z'})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_cadastro_login_hash_logout_e_expiracao(ambiente):
    cliente, app = ambiente
    dados, cabecalhos = conta(cliente, 'ALUNA@exemplo.com')
    assert dados['usuario']['papel'] == 'aluno'
    assert dados['usuario']['email'] == 'aluna@exemplo.com'
    with app.state.banco() as db:
        usuario = db.get(Usuario, dados['usuario']['id'])
        assert usuario.senha_hash.startswith('$argon2id$')
        assert usuario.senha_hash != 'uma-senha-forte-123'
        assert db.get(Sessao, dados['token']) is None
        assert db.get(Sessao, resumo_token(dados['token']))
    assert cliente.get('/api/eu', headers=cabecalhos).status_code == 200
    assert cliente.post('/api/sessao', json={'email': 'aluna@exemplo.com', 'senha': 'senha-incorreta'}).status_code == 401
    entrada = cliente.post('/api/sessao', json={'email': 'aluna@exemplo.com', 'senha': 'uma-senha-forte-123'})
    assert entrada.status_code == 200
    assert cliente.delete('/api/sessao', headers=cabecalhos).status_code == 204
    assert cliente.get('/api/eu', headers=cabecalhos).status_code == 401
    token = entrada.json()['token']
    with app.state.banco() as db:
        db.get(Sessao, resumo_token(token)).expira_em = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert cliente.get('/api/eu', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_aluno_nao_promove_nem_acessa_admin(ambiente):
    cliente, _ = ambiente
    _, cabecalhos = conta(cliente)
    for rota in ['/api/admin/tentativas', '/api/admin/catalogo', '/api/admin/usuarios', '/api/admin/metricas', '/api/admin/auditoria']:
        assert cliente.get(rota, headers=cabecalhos).status_code == 403
        assert cliente.get(rota).status_code == 401
    assert cliente.post('/api/contas', json={'nome': 'Invasor', 'email': 'invasor@exemplo.com', 'senha': 'uma-senha-forte-123', 'papel': 'admin'}).status_code == 422
    assert cliente.patch('/api/eu', headers=cabecalhos, json={'papel': 'admin'}).status_code == 405
    assert cliente.post('/api/admin/tentativas/qualquer/corrigir', headers=cabecalhos).status_code == 403


def test_isolamento_multitenant_e_idempotencia_tentativas(ambiente):
    cliente, _ = ambiente
    _, a = conta(cliente)
    _, b = conta(cliente, 'outra@exemplo.com')
    primeira = tentativa(cliente, a)
    repetida = tentativa(cliente, a)
    assert primeira == repetida
    assert primeira['status'] == 'pendente_validacao'
    assert cliente.get('/api/tentativas', headers=b).json() == []
    segunda = tentativa(cliente, b)
    assert segunda['id'] == primeira['id']
    assert segunda['idServidor'] != primeira['idServidor']
    alterada = {'id': primeira['id'], 'aulaId': 'html-1', 'arquivos': {'html': 'alterado'}, 'criadaEm': primeira['criadaEm']}
    assert cliente.post('/api/tentativas', headers=a, json=alterada).status_code == 409
    assert len(cliente.get('/api/tentativas', headers=a).json()) == 1
    assert cliente.get(f'/api/tentativas/{segunda["idServidor"]}', headers=a).status_code == 404


def test_progresso_mescla_conflitos_eventos_sem_duplicar_xp(ambiente):
    cliente, _ = ambiente
    _, a = conta(cliente)
    _, b = conta(cliente, 'outra@exemplo.com')
    evento = {'id': 'evento-1', 'tipo': 'aula_concluida', 'alvo': 'html-1', 'criadoEm': '2026-10-25T12:00:00Z'}
    inicial = cliente.put('/api/progresso', headers=a, json={'eventos': [evento]}).json()
    assert inicial['estado']['xp'] == 100
    assert cliente.put('/api/progresso', headers=a, json={'eventos': [evento]}).json() == inicial
    assert cliente.get('/api/progresso', headers=b).json()['estado']['xp'] == 0
    estado = {'aulasConcluidas': ['css-1'], 'respostas': {'q1': True}, 'xp': 9999999, 'ultimaAula': 'css-1'}
    resposta = cliente.put('/api/progresso', headers=a, json={'estado': estado}).json()
    assert resposta['estado']['aulasConcluidas'] == ['css-1', 'html-1']
    assert resposta['estado']['xp'] == 210
    conflito = cliente.put('/api/progresso', headers=a, json={'estado': {'respostas': {'q1': False}}}).json()
    assert conflito['estado']['respostas']['q1'] is True
    assert conflito['conflitos'][0]['alvo'] == 'q1'
    outro = {**evento, 'alvo': 'js-1'}
    assert cliente.put('/api/progresso', headers=a, json={'eventos': [outro]}).status_code == 409
    invalido = {**evento, 'id': 'evento-2', 'tipo': 'resposta', 'valor': 'verdadeiro'}
    assert cliente.put('/api/progresso', headers=a, json={'eventos': [invalido]}).status_code == 422
    assert cliente.get('/api/progresso', headers=a).json()['estado']['xp'] == 210


def test_falha_gpt_mantem_pendente_sem_chave_e_audita(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    item = tentativa(cliente, aluno)
    resposta = cliente.post(f'/api/admin/tentativas/{item["idServidor"]}/corrigir', headers=admin)
    assert resposta.status_code == 503
    assert cliente.get('/api/tentativas', headers=aluno).json()[0]['status'] == 'pendente_validacao'
    acoes = [a['acao'] for a in cliente.get('/api/admin/auditoria', headers=admin).json()]
    assert 'gpt_solicitado_manualmente' in acoes
    assert 'gpt_falhou' in acoes


def cliente_sdk_controlado(conteudo=None, status=200, capturas=None):
    def responder(requisicao):
        if capturas is not None:
            capturas.append(json.loads(requisicao.content))
        if status != 200:
            return httpx.Response(status, json={'error': {'message': 'Falha controlada', 'type': 'server_error'}})
        return httpx.Response(200, json={
            'id': 'resp_controlada', 'object': 'response', 'created_at': 1700000000, 'status': 'completed',
            'model': 'gpt-4.1-mini', 'output': [{'id': 'msg_1', 'type': 'message', 'role': 'assistant', 'status': 'completed',
            'content': [{'type': 'output_text', 'text': conteudo if conteudo is not None else json.dumps(FEEDBACK), 'annotations': []}]}],
            'parallel_tool_calls': False, 'tools': [], 'tool_choice': 'auto'})
    return OpenAI(api_key='credencial-ficticia-somente-teste', max_retries=0,
                  http_client=httpx.Client(transport=httpx.MockTransport(responder)))


def test_adaptador_sdk_sucesso_valida_schema_e_minimiza_dados(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    item = tentativa(cliente, aluno)
    capturas = []
    app.state.corretor = CorretorGPT('', 'gpt-4.1-mini', cliente=cliente_sdk_controlado(capturas=capturas))
    resposta = cliente.post(f'/api/admin/tentativas/{item["idServidor"]}/corrigir', headers=admin)
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()['status'] == 'aprovada'
    assert resposta.json()['feedback']['nota'] == 9
    assert cliente.get('/api/progresso', headers=aluno).json()['estado']['aulasConcluidas'] == ['html-1']
    assert len(capturas) == 1
    assert capturas[0]['store'] is False
    assert capturas[0]['text']['format']['type'] == 'json_schema'
    serializado = json.dumps(capturas[0])
    assert 'aluna@exemplo.com' not in serializado
    assert 'usuario_id' not in serializado
    assert cliente.post(f'/api/admin/tentativas/{item["idServidor"]}/corrigir', headers=admin).status_code == 409
    assert len(capturas) == 1


@pytest.mark.parametrize('conteudo,status', [('não é JSON', 200), ('{"nota":100}', 200), (None, 429), (None, 500)])
def test_adaptador_sdk_falha_nao_aprova(ambiente, conteudo, status):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    item = tentativa(cliente, aluno)
    app.state.corretor = CorretorGPT('', 'gpt-4.1-mini', cliente=cliente_sdk_controlado(conteudo, status))
    assert cliente.post(f'/api/admin/tentativas/{item["idServidor"]}/corrigir', headers=admin).status_code == 503
    assert cliente.get('/api/tentativas', headers=aluno).json()[0]['status'] == 'pendente_validacao'
    assert cliente.get('/api/progresso', headers=aluno).json()['estado']['xp'] == 0


def test_revisao_humana_auditoria_cms_versoes_e_metricas_reais(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    item = tentativa(cliente, aluno)
    revisao = {'status': 'aprovada', 'feedback': FEEDBACK, 'justificativa': 'Revisado manualmente pelo professor.', 'versaoBase': 1}
    assert cliente.patch(f'/api/admin/tentativas/{item["idServidor"]}', headers=admin, json=revisao).status_code == 200
    assert cliente.patch(f'/api/admin/tentativas/{item["idServidor"]}', headers=admin, json=revisao).status_code == 409
    atualizacao = {'versaoBase': 0, 'catalogo': CATALOGO}
    assert cliente.put('/api/admin/catalogo', headers=admin, json=atualizacao).status_code == 200
    assert cliente.put('/api/admin/catalogo', headers=admin, json=atualizacao).status_code == 409
    assert len(cliente.get('/api/admin/catalogo/versoes', headers=admin).json()) == 1
    metricas = cliente.get('/api/admin/metricas', headers=admin).json()
    assert metricas['usuarios'] == 2
    assert metricas['tentativas'] == 1
    assert metricas['estadosTentativas']['aprovada'] == 1
    assert metricas['aulasConcluidas'] == 1
    assert any(a['acao'] == 'revisao_humana' for a in cliente.get('/api/admin/auditoria', headers=admin).json())


def test_cms_rejeita_publicacao_incompleta(ambiente):
    cliente, app = ambiente
    _, admin = administrador(cliente, app)
    invalido = deepcopy(CATALOGO)
    invalido['trilhas'][0]['modulos'][0]['aulas'] = []
    assert cliente.put('/api/admin/catalogo', headers=admin, json={'versaoBase': 0, 'catalogo': invalido}).status_code == 422


def test_limite_payload_e_api_nao_vira_html(ambiente):
    cliente, _ = ambiente
    assert cliente.post('/api/contas', content='x' * 2_000_001).status_code == 413
    assert cliente.request('DELETE', '/api/admin/usuarios/inexistente', content='x' * 2_000_001).status_code == 413
    resposta = cliente.get('/api/inexistente')
    assert resposta.status_code == 404
    assert resposta.headers['content-type'].startswith('application/json')
    assert cliente.get('/api/saude').json()['status'] == 'disponivel'


def test_migracao_reversivel_e_reaplicavel(tmp_path):
    from alembic import command
    from alembic.config import Config
    from pathlib import Path
    from sqlalchemy import inspect
    from servidor.banco import criar_banco
    from servidor.migracoes.executar import atualizar
    motor, _ = criar_banco(f'sqlite:///{tmp_path}/migracoes.db')
    atualizar(motor)
    assert 'usuarios' in inspect(motor).get_table_names()
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    with motor.begin() as conexao:
        config.attributes['connection'] = conexao
        command.downgrade(config, 'base')
    assert 'usuarios' not in inspect(motor).get_table_names()
    atualizar(motor)
    assert 'tentativas' in inspect(motor).get_table_names()
    motor.dispose()


def test_retentativas_simultaneas_nao_duplicam(ambiente):
    from concurrent.futures import ThreadPoolExecutor
    cliente, _ = ambiente
    _, aluno = conta(cliente)
    with ThreadPoolExecutor(max_workers=4) as executor:
        respostas = list(executor.map(lambda _: tentativa(cliente, aluno), range(4)))
    assert len({r['idServidor'] for r in respostas}) == 1
    assert len(cliente.get('/api/tentativas', headers=aluno).json()) == 1


def test_revisao_humana_durante_gpt_preservada(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    item = tentativa(cliente, aluno)

    class CorretorComRevisaoConcorrente:
        def corrigir(self, _):
            resposta = cliente.patch(f'/api/admin/tentativas/{item["idServidor"]}', headers=admin,
                                    json={'status': 'revisar', 'feedback': {**FEEDBACK, 'aprovado': False},
                                          'justificativa': 'Necessita revisão humana adicional.'})
            assert resposta.status_code == 200
            return Feedback.model_validate(FEEDBACK)

    app.state.corretor = CorretorComRevisaoConcorrente()
    resposta = cliente.post(f'/api/admin/tentativas/{item["idServidor"]}/corrigir', headers=admin)
    assert resposta.status_code == 409
    atual = cliente.get('/api/tentativas', headers=aluno).json()[0]
    assert atual['status'] == 'revisar'
    assert atual['feedback']['aprovado'] is False


def test_adaptador_baixa_confianca_nao_aprova():
    corretor = CorretorGPT('', 'gpt-4.1-mini', cliente=cliente_sdk_controlado(json.dumps({**FEEDBACK, 'confianca': .3})))
    resultado = corretor.corrigir(SimpleNamespace(enunciado=AULA, arquivos={'html': '<h1>Oi</h1>'}))
    assert resultado.aprovado is False


def test_limite_tentativas_login(ambiente):
    cliente, _ = ambiente
    entrada = {'email': 'ausente@exemplo.com', 'senha': 'senha-incorreta'}
    # Identificadores diferentes exercitam o limite por origem; a nova proteção
    # persistente por conta é coberta separadamente.
    for indice in range(20):
        assert cliente.post('/api/sessao', json={**entrada, 'email': f'ausente{indice}@exemplo.com'}).status_code == 401
    resposta = cliente.post('/api/sessao', json=entrada)
    assert resposta.status_code == 429
    assert resposta.headers['retry-after'] == '60'


def test_cms_preserva_planejamento_e_testes_declarativos(ambiente):
    cliente, app = ambiente
    _, admin = administrador(cliente, app)
    completo = deepcopy(CATALOGO)
    modulo = completo['trilhas'][0]['modulos'][0]
    modulo['planejamento'] = {'objetivos': ['Semântica'], 'aulasPrevistas': 3, 'exerciciosPrevistos': 9}
    modulo['aulas'][0]['testes'] = [{'id': 'tem-h1', 'descricao': 'Título principal presente', 'tipo': 'elemento', 'seletor': 'h1'}]
    resposta = cliente.put('/api/admin/catalogo', headers=admin, json={'versaoBase': 0, 'catalogo': completo})
    assert resposta.status_code == 200, resposta.text
    salvo = resposta.json()['catalogo']['trilhas'][0]['modulos'][0]
    assert salvo['planejamento'] == modulo['planejamento']
    assert salvo['aulas'][0]['testes'] == modulo['aulas'][0]['testes']
    assert 'esperado' not in salvo['aulas'][0]['testes'][0]
    completo['chaveInesperada'] = 'recusar'
    assert cliente.put('/api/admin/catalogo', headers=admin, json={'versaoBase': 1, 'catalogo': completo}).status_code == 422


# As escolhas são um registro definitivo, independente do snapshot de XP do cliente.
def enviar_avaliacao(cliente, cabecalhos, escolhas, **campos):
    return cliente.put('/api/progresso', headers=cabecalhos, json={
        'estado': {'avaliacoes': {'html-1': {'escolhas': escolhas, **campos}}}})


def test_avaliacao_indice_zero_definitivo_pontua_so_apos_envio_e_isola_perfis(ambiente):
    cliente, _ = ambiente
    _, a = conta(cliente)
    _, b = conta(cliente, 'outra@exemplo.com')
    inicial = enviar_avaliacao(cliente, a, {'q1': 0})
    assert inicial.status_code == 200, inicial.text
    assert inicial.json()['estado']['xp'] == 0
    assert 'html-1:q1' not in inicial.json()['estado']['respostas']
    tentativa_troca = enviar_avaliacao(cliente, a, {'q1': 1})
    assert tentativa_troca.json()['estado']['avaliacoes']['html-1']['escolhas']['q1'] == 0
    enviada = enviar_avaliacao(cliente, a, {'q1': 1}, enviadaEm='2026-10-28T12:00:00Z')
    assert enviada.status_code == 200, enviada.text
    assert enviada.json()['estado']['xp'] == 10
    assert enviada.json()['estado']['respostas']['html-1:q1'] is True
    assert cliente.get('/api/progresso', headers=b).json()['estado']['avaliacoes'] == {}
    repetida = enviar_avaliacao(cliente, a, {'q1': 1}, enviadaEm='2026-10-29T12:00:00Z', revisada=True)
    assert repetida.json()['estado']['xp'] == 10
    assert repetida.json()['estado']['avaliacoes']['html-1'] == {
        'escolhas': {'q1': 0}, 'enviadaEm': '2026-10-28T12:00:00Z', 'revisada': True, 'correcao': AULA['questoes']}


def test_avaliacao_errada_nao_vira_acerto_por_snapshot_ou_evento_legado(ambiente):
    cliente, _ = ambiente
    _, cabecalhos = conta(cliente)
    enviada = enviar_avaliacao(cliente, cabecalhos, {'q1': 1}, enviadaEm='2026-10-28T12:00:00Z')
    assert enviada.status_code == 200
    assert enviada.json()['estado']['respostas']['html-1:q1'] is False
    adulterada = cliente.put('/api/progresso', headers=cabecalhos, json={
        'estado': {'respostas': {'html-1:q1': True, 'html-1:questao-inventada': True}, 'xp': 99999,
                   'avaliacoes': {'html-1': {'escolhas': {'q1': 0}, 'enviadaEm': '2026-10-29T12:00:00Z'}}},
        'eventos': [{'id': 'trocar-acerto', 'tipo': 'resposta', 'alvo': 'html-1:q1',
                     'valor': True, 'criadoEm': '2026-10-29T12:00:00Z'}]})
    assert adulterada.status_code == 200, adulterada.text
    estado = adulterada.json()['estado']
    assert estado['avaliacoes']['html-1']['escolhas'] == {'q1': 1}
    assert estado['respostas']['html-1:q1'] is False
    assert estado['xp'] == 0


@pytest.mark.parametrize('aula,avaliacao', [
    ('html-1', {'escolhas': {}, 'enviadaEm': '2026-10-28T12:00:00Z'}),
    ('nao-existe', {'escolhas': {'q1': 0}}),
    ('html-1', {'escolhas': {'nao-existe': 0}}),
    ('html-1', {'escolhas': {'q1': 2}}),
    ('html-1', {'escolhas': {'q1': -1}}),
    ('html-1', {'escolhas': {'q1': True}}),
    ('html-1', {'escolhas': {'q1': '0'}}),
    ('html-1', {'escolhas': {'q1': 0}, 'revisada': True}),
    ('html-1', {'escolhas': {'q1': 0}, 'enviadaEm': 'data-invalida'}),
    ('html-1', {'escolhas': {'q1': 0}, 'enviadaEm': '2026-10-28'}),
    ('html-1', {'escolhas': {'q1': 0}, 'enviadaEm': 1780000000}),
])
def test_avaliacao_invalida_rejeita_sem_persistir(ambiente, aula, avaliacao):
    cliente, _ = ambiente
    _, cabecalhos = conta(cliente)
    resposta = cliente.put('/api/progresso', headers=cabecalhos,
                           json={'estado': {'avaliacoes': {aula: avaliacao}}})
    assert resposta.status_code == 422, resposta.text
    assert cliente.get('/api/progresso', headers=cabecalhos).json()['estado']['avaliacoes'] == {}


def test_avaliacao_pendente_ignora_acertos_adiantados_e_revisao_nao_regride(ambiente):
    cliente, _ = ambiente
    _, cabecalhos = conta(cliente)
    resposta = cliente.put('/api/progresso', headers=cabecalhos, json={'estado': {
        'avaliacoes': {'html-1': {'escolhas': {'q1': 0}}}, 'respostas': {'html-1:q1': True}}})
    assert resposta.status_code == 200
    assert resposta.json()['estado']['xp'] == 0
    assert 'html-1:q1' not in resposta.json()['estado']['respostas']
    enviar_avaliacao(cliente, cabecalhos, {}, enviadaEm='2026-10-28T12:00:00Z', revisada=True)
    retorno = enviar_avaliacao(cliente, cabecalhos, {}, revisada=False)
    assert retorno.json()['estado']['avaliacoes']['html-1']['revisada'] is True



def test_avaliacao_preserva_gabarito_do_primeiro_registro_apos_publicar_catalogo(ambiente):
    cliente, app = ambiente
    dados, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    assert enviar_avaliacao(cliente, aluno, {'q1': 0}).status_code == 200
    atualizado = deepcopy(CATALOGO)
    for questao in atualizado['trilhas'][0]['modulos'][0]['aulas'][0]['questoes']:
        questao['alternativas'][0]['correta'] = False
        questao['alternativas'][1]['correta'] = True
        questao['enunciado'] = 'Enunciado da nova versão'
        questao['alternativas'][0]['texto'] = 'Alternativa da nova versão'
        questao['alternativas'][0]['feedback'] = 'Feedback da nova versão'
    publicado = cliente.put('/api/admin/catalogo', headers=admin,
                            json={'versaoBase': 0, 'catalogo': atualizado})
    assert publicado.status_code == 200, publicado.text
    enviado = enviar_avaliacao(cliente, aluno, {}, enviadaEm='2026-10-28T12:00:00Z')
    assert enviado.status_code == 200, enviado.text
    assert enviado.json()['estado']['respostas']['html-1:q1'] is True
    assert enviado.json()['estado']['xp'] == 10
    assert enviado.json()['estado']['avaliacoes']['html-1']['correcao'] == AULA['questoes']
    assert not any(chave.startswith('_') for chave in enviado.json()['estado'])
    assert not any(chave.startswith('_') for chave in cliente.get('/api/progresso', headers=aluno).json()['estado'])
    from servidor.modelos import Progresso
    with app.state.banco() as db:
        interno = db.get(Progresso, dados['usuario']['id']).estado
        assert interno['_gabaritosAvaliacoes']['html-1']['q1'] == [True, False]
    forjar = cliente.put('/api/progresso', headers=aluno, json={'estado': {
        '_gabaritosAvaliacoes': {'html-1': {'q1': [False, True]}}}})
    assert forjar.status_code == 422



def test_avaliacao_com_varias_questoes_exige_todas_sem_desfazer_primeira_escolha():
    from servidor.servicos.progresso import estado_vazio, mesclar
    catalogo = deepcopy(CATALOGO)
    aula = catalogo['trilhas'][0]['modulos'][0]['aulas'][0]
    aula['questoes'] = [deepcopy(aula['questoes'][0]), deepcopy(aula['questoes'][0])]
    aula['questoes'][1]['id'] = 'q2'
    inicial, _ = mesclar(estado_vazio(), {'avaliacoes': {'html-1': {'escolhas': {'q1': 0}}}}, [], catalogo)
    with pytest.raises(ValueError, match='todas as questões'):
        mesclar(inicial, {'avaliacoes': {'html-1': {'escolhas': {}, 'enviadaEm': '2026-10-28T12:00:00Z'}}}, [], catalogo)
    assert inicial['avaliacoes']['html-1']['escolhas'] == {'q1': 0}
    final, _ = mesclar(inicial, {'avaliacoes': {'html-1': {'escolhas': {'q1': 1, 'q2': 1}, 'enviadaEm': '2026-10-28T12:00:00Z'}}}, [], catalogo)
    assert final['avaliacoes']['html-1']['escolhas'] == {'q1': 0, 'q2': 1}
    assert final['respostas'] == {'html-1:q1': True, 'html-1:q2': False}
    assert final['xp'] == 10



def test_correcao_do_cliente_nao_antecipa_feedback_nem_falsifica_snapshot_servidor(ambiente):
    cliente, _ = ambiente
    _, cabecalhos = conta(cliente)
    falsa = deepcopy(AULA['questoes'])
    for questao in falsa:
        questao['enunciado'] = 'Questão forjada'
        questao['alternativas'][0]['correta'] = False
        questao['alternativas'][1]['correta'] = True
        questao['alternativas'][1]['feedback'] = 'Feedback forjado: acertou'
    pendente = enviar_avaliacao(cliente, cabecalhos, {'q1': 1}, correcao=falsa)
    assert pendente.status_code == 200, pendente.text
    assert 'correcao' not in pendente.json()['estado']['avaliacoes']['html-1']
    enviada = enviar_avaliacao(cliente, cabecalhos, {}, correcao=falsa,
                              enviadaEm='2026-10-28T12:00:00Z')
    assert enviada.status_code == 200, enviada.text
    avaliacao = enviada.json()['estado']['avaliacoes']['html-1']
    assert avaliacao['correcao'] == AULA['questoes']
    assert enviada.json()['estado']['respostas']['html-1:q1'] is False
    assert enviada.json()['estado']['xp'] == 0
    # O Estado público completo pode retornar ao servidor sem perder o snapshot.
    estado = enviada.json()['estado']
    estado['avaliacoes']['html-1']['correcao'] = falsa
    repetida = cliente.put('/api/progresso', headers=cabecalhos, json={'estado': estado})
    assert repetida.status_code == 200, repetida.text
    assert repetida.json()['estado']['avaliacoes']['html-1']['correcao'] == AULA['questoes']
