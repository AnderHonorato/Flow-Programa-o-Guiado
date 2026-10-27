import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient


@pytest.fixture
def controlador_http():
    recebidos = []
    resposta = {'status': 200, 'dados': {
        'status': 'concluido', 'codigoSaida': 0, 'saida': '10\n', 'duracaoMs': 100, 'respostaHttp': None,
    }}

    class Rota(BaseHTTPRequestHandler):
        def do_POST(self):
            recebidos.append((self.path, self.headers['Authorization'], json.loads(self.rfile.read(int(self.headers['Content-Length'])))))
            self.send_response(resposta['status'])
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resposta['dados']).encode())

        def log_message(self, *args):
            pass

    servidor = HTTPServer(('127.0.0.1', 0), Rota)
    thread = threading.Thread(target=servidor.serve_forever, daemon=True)
    thread.start()
    yield f'http://127.0.0.1:{servidor.server_port}', recebidos, resposta
    servidor.shutdown()
    servidor.server_close()
    thread.join()


def cliente_proxy():
    from servidor.rotas.execucoes import criar_rotas_execucoes

    def autenticar(authorization: str | None = Header(default=None)):
        if authorization != 'Bearer sessao-aluno':
            raise HTTPException(401, 'Entre na sua conta.')
        return {'id': 'aluno'}

    app = FastAPI()
    app.include_router(criar_rotas_execucoes(autenticar))
    return TestClient(app)


def test_proxy_exige_autenticacao(monkeypatch):
    monkeypatch.delenv('EXECUTOR_URL', raising=False)
    with cliente_proxy() as cliente:
        resposta = cliente.post('/api/execucoes', json={'linguagem': 'python', 'codigo': 'print(10)'})
    assert resposta.status_code == 401


def test_proxy_opt_in(monkeypatch):
    monkeypatch.delenv('EXECUTOR_URL', raising=False)
    monkeypatch.delenv('EXECUTOR_TOKEN', raising=False)
    with cliente_proxy() as cliente:
        resposta = cliente.post('/api/execucoes', headers={'Authorization': 'Bearer sessao-aluno'},
                                json={'linguagem': 'python', 'codigo': 'print(10)'})
    assert resposta.status_code == 503


def test_proxy_configuracao_url_invalida(monkeypatch):
    monkeypatch.setenv('EXECUTOR_URL', 'http://[')
    monkeypatch.setenv('EXECUTOR_TOKEN', 'interno-' + 'x' * 40)
    with cliente_proxy() as cliente:
        resposta = cliente.post('/api/execucoes', headers={'Authorization': 'Bearer sessao-aluno'},
                                json={'linguagem': 'python', 'codigo': 'print(10)'})
    assert resposta.status_code == 503


def test_proxy_http_real_sem_repassar_identidade(controlador_http, monkeypatch):
    url, recebidos, _ = controlador_http
    monkeypatch.setenv('EXECUTOR_URL', url)
    monkeypatch.setenv('EXECUTOR_TOKEN', 'interno-' + 'x' * 40)
    with cliente_proxy() as cliente:
        resposta = cliente.post('/api/execucoes', headers={'Authorization': 'Bearer sessao-aluno'},
                                json={'linguagem': 'python', 'codigo': 'print(10)'})
    assert resposta.status_code == 200
    assert resposta.json()['saida'] == '10\n'
    assert recebidos == [('/executar', 'Bearer interno-' + 'x' * 40,
                         {'linguagem': 'python', 'codigo': 'print(10)', 'requisicaoHttp': None})]
    assert 'interno-' not in resposta.text


@pytest.mark.parametrize(('status', 'dados', 'esperado'), [
    (429, {'detail': 'interno'}, 429),
    (503, {'detail': 'interno'}, 503),
    (401, {'detail': 'segredo'}, 502),
    (200, {'status': 'inventado'}, 502),
])
def test_proxy_falha_segura(controlador_http, monkeypatch, status, dados, esperado):
    url, _, resposta = controlador_http
    resposta.update(status=status, dados=dados)
    monkeypatch.setenv('EXECUTOR_URL', url)
    monkeypatch.setenv('EXECUTOR_TOKEN', 'interno-' + 'x' * 40)
    with cliente_proxy() as cliente:
        retorno = cliente.post('/api/execucoes', headers={'Authorization': 'Bearer sessao-aluno'},
                                json={'linguagem': 'python', 'codigo': 'print(10)'})
    assert retorno.status_code == esperado
    assert 'segredo' not in retorno.text
