"""Contrato e isolamento; os casos Docker são opt-in e não usam código no host."""
import os
import subprocess
import asyncio
import socket
import threading
import time

import pytest
import httpx
from fastapi.testclient import TestClient


def test_controlador_desligado_por_padrao(monkeypatch):
    monkeypatch.delenv('EXECUTOR_HABILITADO', raising=False)
    monkeypatch.delenv('EXECUTOR_TOKEN', raising=False)
    from executores.controlador import criar_controlador
    with TestClient(criar_controlador()) as cliente:
        resposta = cliente.post('/executar', json={'linguagem': 'python', 'codigo': 'print(7)'})
    assert resposta.status_code == 503


def test_token_invalido_nao_executa(monkeypatch):
    monkeypatch.setenv('EXECUTOR_HABILITADO', '1')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'teste-' + 'x' * 40)
    from executores.controlador import criar_controlador
    with TestClient(criar_controlador()) as cliente:
        resposta = cliente.post('/executar', headers={'Authorization': 'Bearer errado'},
                                json={'linguagem': 'python', 'codigo': 'print(7)'})
    assert resposta.status_code == 401


def test_corpo_excessivo_recusado_antes_de_executar(monkeypatch):
    monkeypatch.setenv('EXECUTOR_HABILITADO', '1')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'teste-' + 'x' * 40)
    from executores.controlador import criar_controlador
    with TestClient(criar_controlador()) as cliente:
        resposta = cliente.post('/executar', headers={'Authorization': 'Bearer teste-' + 'x' * 40},
                                content=b' ' * 65537)
    assert resposta.status_code == 413


def test_token_curto_impede_ativacao(monkeypatch):
    monkeypatch.setenv('EXECUTOR_HABILITADO', '1')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'curto')
    from executores.controlador import criar_controlador
    with pytest.raises(ValueError):
        criar_controlador()


@pytest.fixture
def cliente_docker(monkeypatch):
    if os.getenv('FLOW_TESTE_DOCKER') != '1':
        pytest.skip('Configure FLOW_TESTE_DOCKER=1 para executar contêineres reais.')
    monkeypatch.setenv('EXECUTOR_HABILITADO', '1')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'teste-' + 'x' * 40)
    from executores.controlador import criar_controlador
    with TestClient(criar_controlador()) as cliente:
        cliente.headers['Authorization'] = 'Bearer teste-' + 'x' * 40
        yield cliente
    assert subprocess.run(['docker', 'ps', '-aq', '--filter', 'label=flow.executor=aluno'],
                          check=True, capture_output=True, text=True).stdout.strip() == ''


@pytest.mark.parametrize(('linguagem', 'codigo', 'saida'), [
    ('python', 'print(sum([2, 3, 5]))', '10'),
    ('node', 'console.log([2,3,5].reduce((a,b) => a+b, 0))', '10'),
])
def test_executa_runtime_real(cliente_docker, linguagem, codigo, saida):
    resposta = cliente_docker.post('/executar', json={'linguagem': linguagem, 'codigo': codigo})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()['status'] == 'concluido', resposta.json()
    assert resposta.json()['saida'].strip() == saida


def test_isolamento_sem_host_rede_ou_escrita_raiz(cliente_docker):
    codigo = '''import os, socket
print('uid', os.getuid())
print('segredo', os.getenv('EXECUTOR_TOKEN'))
print('socket', os.path.exists('/var/run/docker.sock'))
try:
 open('/arquivo-proibido', 'w').write('x')
 print('raiz gravavel')
except OSError:
 print('raiz protegida')
try:
 socket.create_connection(('1.1.1.1', 80), timeout=0.2)
 print('rede externa acessivel')
except OSError:
 print('rede bloqueada')
print('memoria', open('/sys/fs/cgroup/memory.max').read().strip())
print('processos', open('/sys/fs/cgroup/pids.max').read().strip())
print('cpu', open('/sys/fs/cgroup/cpu.max').read().strip())
'''
    dados = cliente_docker.post('/executar', json={'linguagem': 'python', 'codigo': codigo}).json()
    assert dados['status'] == 'concluido', dados
    assert 'uid 65534' in dados['saida']
    assert 'segredo None' in dados['saida']
    assert 'socket False' in dados['saida']
    assert 'raiz protegida' in dados['saida']
    assert 'rede bloqueada' in dados['saida']
    assert 'memoria 134217728' in dados['saida']
    assert 'processos 64' in dados['saida']
    assert 'cpu 50000 100000' in dados['saida']


@pytest.mark.parametrize(('codigo', 'status'), [
    ('while True: pass', 'tempo_excedido'),
    ('while True: print("x" * 1024, flush=True)', 'saida_excedida'),
    ('raise ValueError("falha didatica")', 'erro'),
])
def test_limites_e_erro_reais(cliente_docker, codigo, status):
    dados = cliente_docker.post('/executar', json={'linguagem': 'python', 'codigo': codigo}).json()
    assert dados['status'] == status, dados
    assert len(dados['saida'].encode()) <= 65536
    assert dados['duracaoMs'] < 15000


def test_servidor_http_real_em_loopback(cliente_docker):
    codigo = '''from http.server import BaseHTTPRequestHandler, HTTPServer
import signal, sys
def encerrar(*args):
 print('Servidor encerrado', flush=True)
 sys.exit(0)
signal.signal(signal.SIGTERM, encerrar)
class Rota(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200 if self.path == '/saude' else 404)
  self.end_headers()
  self.wfile.write(b'{"total":10}')
HTTPServer(('127.0.0.1', 8000), Rota).serve_forever()
'''
    dados = cliente_docker.post('/executar', json={
        'linguagem': 'backend-python', 'codigo': codigo,
        'requisicaoHttp': {'metodo': 'GET', 'caminho': '/saude'},
    }).json()
    assert dados['status'] == 'concluido', dados
    assert dados['respostaHttp']['status'] == 200
    assert dados['respostaHttp']['corpo'] == '{"total":10}'
    assert 'Servidor encerrado' in dados['saida']


def test_cancelamento_remove_container_real(cliente_docker):
    from executores.contratos import EntradaExecucao
    from executores.docker import ExecutorDocker

    async def cancelar():
        tarefa = asyncio.create_task(ExecutorDocker().executar(
            EntradaExecucao(linguagem='python', codigo='while True: pass')))
        await asyncio.sleep(0.8)
        tarefa.cancel()
        with pytest.raises(asyncio.CancelledError):
            await tarefa

    asyncio.run(cancelar())


def test_concorrencia_limitada_a_dois_containers(cliente_docker):
    from executores.controlador import criar_controlador

    async def saturar():
        app = criar_controlador()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://controlador',
                                    headers={'Authorization': 'Bearer teste-' + 'x' * 40}) as cliente:
            entrada = {'linguagem': 'python', 'codigo': 'import time; time.sleep(1); print("ok")'}
            tarefas = [asyncio.create_task(cliente.post('/executar', json=entrada)) for _ in range(2)]
            for _ in range(200):
                if app.state.ativos == 2:
                    break
                await asyncio.sleep(0.01)
            assert app.state.ativos == 2
            rejeitada = await cliente.post('/executar', json=entrada)
            assert rejeitada.status_code == 429
            resultados = await asyncio.gather(*tarefas)
            assert all(resultado.json()['status'] == 'concluido' for resultado in resultados)

    asyncio.run(saturar())


def test_api_autenticada_proxy_http_e_docker_reais(cliente_docker, monkeypatch, tmp_path):
    import uvicorn
    from servidor.aplicacao import criar_aplicacao
    from servidor.configuracao import Configuracao

    socket_local = socket.socket()
    socket_local.bind(('127.0.0.1', 0))
    porta = socket_local.getsockname()[1]
    servidor = uvicorn.Server(uvicorn.Config(cliente_docker.app, log_level='error', lifespan='off'))
    thread = threading.Thread(target=servidor.run, kwargs={'sockets': [socket_local]}, daemon=True)
    thread.start()
    try:
        for _ in range(200):
            if servidor.started:
                break
            time.sleep(0.01)
        assert servidor.started
        monkeypatch.setenv('EXECUTOR_URL', f'http://127.0.0.1:{porta}')
        config = Configuracao(banco_url=f'sqlite:///{tmp_path}/api.db', chave_openai='')
        with TestClient(criar_aplicacao(config)) as api:
            entrada = {'linguagem': 'python', 'codigo': 'print(6 * 7)'}
            assert api.post('/api/execucoes', json=entrada).status_code == 401
            conta = api.post('/api/contas', json={'nome': 'Aluna', 'email': 'executor@exemplo.com', 'senha': 'senha-executor-123'})
            assert conta.status_code == 201
            resposta = api.post('/api/execucoes', json=entrada,
                               headers={'Authorization': 'Bearer ' + conta.json()['token']})
            assert resposta.status_code == 200, resposta.text
            assert resposta.json()['status'] == 'concluido'
            assert resposta.json()['saida'] == '42\n'
    finally:
        servidor.should_exit = True
        thread.join(timeout=5)
        socket_local.close()


@pytest.mark.parametrize('dados', [
    {'linguagem': 'bash', 'codigo': 'id'},
    {'linguagem': 'python', 'codigo': 'x' * 32769},
    {'linguagem': 'python', 'codigo': 'print(1)', 'imagem': 'ubuntu'},
    {'linguagem': 'backend-python', 'codigo': '', 'requisicaoHttp': {'caminho': 'http://host/'}},
    {'linguagem': 'backend-python', 'codigo': '', 'requisicaoHttp': {'caminho': '/\r\nX: y'}},
])
def test_recusa_entrada_perigosa(monkeypatch, dados):
    monkeypatch.setenv('EXECUTOR_HABILITADO', '1')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'teste-' + 'x' * 40)
    from executores.controlador import criar_controlador
    with TestClient(criar_controlador()) as cliente:
        resposta = cliente.post('/executar', headers={'Authorization': 'Bearer teste-' + 'x' * 40}, json=dados)
    assert resposta.status_code == 422
