"""Reconhecimento exige aprovação auditada, dono e sessão reais."""
from sqlalchemy import select

from servidor.modelos import Auditoria, Tentativa
from servidor.testes.teste_api import FEEDBACK, administrador, ambiente, conta, tentativa


def test_certificado_exige_sessao_e_nao_confunde_progresso_com_aprovacao(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente)
    assert cliente.get('/api/certificados').status_code == 401
    assert cliente.get('/api/certificados', headers=aluno).json() == []
    envio = tentativa(cliente, aluno)
    cliente.post('/api/progresso/sincronizar', headers=aluno, json={'estado': {'aulasConcluidas': ['html-1'], 'xp': 999}})
    assert cliente.get('/api/certificados', headers=aluno).json() == []
    # Mesmo estado adulterado diretamente, sem ato administrativo, não emite registro.
    with app.state.banco() as db:
        t = db.get(Tentativa, envio['idServidor'])
        t.status = 'aprovada'
        t.feedback = FEEDBACK
        db.commit()
    assert cliente.get('/api/certificados', headers=aluno).json() == []


def test_aprovacao_humana_emite_so_para_dono_com_codigo_estavel_e_revogacao(ambiente):
    cliente, app = ambiente
    _, aluno = conta(cliente, nome='Aluna <script>')
    _, outro = conta(cliente, 'outra@exemplo.com')
    _, admin = administrador(cliente, app)
    envio = tentativa(cliente, aluno)
    caminho = f'/api/admin/tentativas/{envio["idServidor"]}'
    assert cliente.patch(caminho, headers=aluno, json={'status':'aprovada','feedback':FEEDBACK,'justificativa':'Atividade revisada.'}).status_code == 403
    assert cliente.patch(caminho, headers=admin, json={'status':'aprovada','feedback':FEEDBACK,'justificativa':'Atividade revisada.'}).status_code == 200
    resposta = cliente.get('/api/certificados', headers=aluno)
    assert resposta.status_code == 200
    registro = resposta.json()[0]
    assert registro['titulo'] == 'Minha primeira página'
    assert registro['objetivo'] == 'Criar título e parágrafo'
    assert registro['titular'] == 'Aluna <script>'
    assert registro['tipo'] == 'reconhecimento_interno_aula'
    assert registro['codigo'].startswith('FLOW-')
    assert registro == cliente.get('/api/certificados', headers=aluno).json()[0]
    assert cliente.get('/api/certificados', headers=outro).json() == []
    assert cliente.patch(caminho, headers=admin, json={'status':'revisar','feedback':FEEDBACK,'justificativa':'Precisa de mais revisão.'}).status_code == 200
    assert cliente.get('/api/certificados', headers=aluno).json() == []


def test_auditoria_de_aluno_nao_emite_e_correcao_admin_gpt_emite(ambiente):
    cliente, app = ambiente
    dados, aluno = conta(cliente)
    _, admin = administrador(cliente, app)
    envio = tentativa(cliente, aluno)
    with app.state.banco() as db:
        db.get(Tentativa, envio['idServidor']).status = 'aprovada'
        db.add(Auditoria(ator_id=dados['usuario']['id'], acao='revisao_humana', recurso=envio['idServidor'], dados={'status':'aprovada'}))
        db.commit()
    assert cliente.get('/api/certificados', headers=aluno).json() == []
    # Correção GPT concluída só é registrada depois de acionamento administrativo.
    class Corretor:
        def corrigir(self, tentativa):
            from servidor.esquemas import Feedback
            return Feedback(**FEEDBACK)
    app.state.corretor = Corretor()
    assert cliente.post(f'/api/admin/tentativas/{envio["idServidor"]}/corrigir', headers=admin, json={'confirmarReavaliacao':True}).status_code == 200
    registros = cliente.get('/api/certificados', headers=aluno).json()
    assert len(registros) == 1
    with app.state.banco() as db:
        aprovacao = db.scalar(select(Auditoria).where(Auditoria.acao=='gpt_concluido'))
        assert registros[0]['emitidoEm'].startswith(aprovacao.criado_em.isoformat().split('+')[0])
