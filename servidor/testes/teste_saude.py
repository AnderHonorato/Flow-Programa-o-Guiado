from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import OperationalError
from servidor.aplicacao import criar_aplicacao
from servidor.configuracao import Configuracao

def test_saude_indisponivel_preserva_diagnostico_sem_credenciais(tmp_path):
    app=criar_aplicacao(Configuracao(banco_url='sqlite:///:memory:',web_dist=tmp_path))
    with TestClient(app) as cliente:
        @event.listens_for(app.state.motor,'before_cursor_execute')
        def falhar(conexao,cursor,sql,params,contexto,muitos):
            if sql=='SELECT 1':
                raise OperationalError(sql,{},Exception('Tenant or user not found; segredo=nao-expor'))
        r=cliente.get('/api/saude')
        assert r.status_code==503
        assert r.json()['diagnostico']=='tenant_ou_usuario'
        assert 'nao-expor' not in r.text
