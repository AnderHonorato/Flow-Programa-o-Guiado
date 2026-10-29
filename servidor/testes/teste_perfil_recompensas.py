"""Avatares e recompensas: validação real, persistência e isolamento HTTP."""
import base64
from datetime import datetime, timedelta, timezone
import struct
import zlib

import pytest
from sqlalchemy import select

from servidor.modelos import Progresso
from servidor.servicos.perfil import DESENHOS_AVATAR, validar_foto_png
from servidor.testes.teste_api import ambiente, conta


DATA = '2026-10-20T12:00:00Z'
DEPOIS = '2026-10-21T12:00:00Z'


def trecho(tipo, dados):
    return struct.pack('>I', len(dados)) + tipo + dados + struct.pack('>I', zlib.crc32(tipo + dados) & 0xffffffff)


def png(lado=2, pixels=None, extras=b''):
    if pixels is None:
        pixels = (b'\x00' + b'\x80\x40\xc0\xff' * lado) * lado
    return b'\x89PNG\r\n\x1a\n' + trecho(b'IHDR', struct.pack('>IIBBBBB', lado, lado, 8, 6, 0, 0, 0)) + trecho(b'IDAT', zlib.compress(pixels)) + trecho(b'IEND', b'') + extras


def foto(dados):
    return 'data:image/png;base64,' + base64.b64encode(dados).decode()


def avatar(valor='cartoon-raposa', tipo='desenho', data=DATA):
    return {'tipo': tipo, 'valor': valor, 'atualizadoEm': data}


def atualizar(cliente, headers, estado):
    return cliente.put('/api/progresso', headers=headers, json={'estado': estado})


def test_avatar_e_foto_ficam_privados_e_nao_concedem_xp(ambiente):
    cliente, _ = ambiente
    _, a = conta(cliente)
    _, b = conta(cliente, 'avatar-b@example.com')
    imagem = foto(png(384))
    resposta = atualizar(cliente, a, {'avatar': avatar(imagem, 'foto')})
    assert resposta.status_code == 200, resposta.text
    e = resposta.json()['estado']
    assert e['avatar']['valor'] == imagem
    assert e['avatar']['tipo'] == 'foto'
    assert e['xp'] == 0
    assert e['historicoConquistas'] == {}
    assert cliente.get('/api/progresso', headers=a).json()['estado']['avatar']['valor'] == imagem
    assert 'avatar' not in cliente.get('/api/progresso', headers=b).json()['estado']
    assert cliente.get('/api/progresso').status_code == 401


def test_avatar_preserva_ultima_data_e_remove_foto_por_escolha_explicitamente_mais_nova(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    assert atualizar(cliente, h, {'avatar': avatar(foto(png()), 'foto')}).status_code == 200
    assert atualizar(cliente, h, {'avatar': avatar('pixel-mago', data=DEPOIS)}).json()['estado']['avatar']['valor'] == 'pixel-mago'
    assert atualizar(cliente, h, {'avatar': avatar('cartoon-raposa')}).json()['estado']['avatar']['valor'] == 'pixel-mago'
    # Um cliente antigo que ainda não conhece avatar não apaga a seleção.
    assert atualizar(cliente, h, {'respostas': {}}).json()['estado']['avatar']['valor'] == 'pixel-mago'
    # Empates usam o mesmo desempate determinístico nos dois dispositivos.
    assert atualizar(cliente, h, {'avatar': avatar('games-ninja', data=DEPOIS)}).json()['estado']['avatar']['valor'] == 'pixel-mago'


def test_todos_os_desenhos_originais_sao_aceitos(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    assert len(DESENHOS_AVATAR) == 18
    for indice, id in enumerate(sorted(DESENHOS_AVATAR)):
        data = (datetime(2026, 10, 20, tzinfo=timezone.utc) + timedelta(minutes=indice)).isoformat()
        resposta = atualizar(cliente, h, {'avatar': avatar(id, data=data)})
        assert resposta.status_code == 200, resposta.text
        assert resposta.json()['estado']['avatar']['valor'] == id


@pytest.mark.parametrize('dados', [
    {'tipo': 'desenho', 'valor': 'personagem-nao-existe', 'atualizadoEm': DATA},
    {'tipo': 'url', 'valor': 'https://example.com/foto.png', 'atualizadoEm': DATA},
    {'tipo': 'foto', 'valor': 'https://example.com/foto.png', 'atualizadoEm': DATA},
    {'tipo': 'foto', 'valor': 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'atualizadoEm': DATA},
    {'tipo': 'foto', 'valor': 'data:image/png;base64,@@@@', 'atualizadoEm': DATA},
    {'tipo': 'emblema', 'valor': '8', 'atualizadoEm': DATA},
    {'tipo': 'emblema', 'valor': '01', 'atualizadoEm': DATA},
    {'tipo': 'desenho', 'valor': 'cartoon-raposa', 'atualizadoEm': 1234567890},
    {'tipo': 'desenho', 'valor': 'cartoon-raposa', 'atualizadoEm': '2026-10-20T12:00:00'},
])
def test_avatar_malformado_recusado_na_api(ambiente, dados):
    cliente, _ = ambiente
    _, h = conta(cliente)
    assert atualizar(cliente, h, {'avatar': dados}).status_code == 422
    assert 'avatar' not in cliente.get('/api/progresso', headers=h).json()['estado']


def test_nao_desbloqueia_emblema_com_xp_sugerido_ou_horario_futuro(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    assert atualizar(cliente, h, {'avatar': avatar('1', 'emblema'), 'xp': 99999}).status_code == 422
    e = atualizar(cliente, h, {'aulasConcluidas': ['html-1'], 'avatar': avatar('1', 'emblema')}).json()['estado']
    assert e['xp'] == 100 and e['avatar']['valor'] == '1'
    futura = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    assert atualizar(cliente, h, {'avatar': avatar('cartoon-gato', data=futura)}).status_code == 422
    assert cliente.get('/api/progresso', headers=h).json()['estado']['avatar']['valor'] == '1'


@pytest.mark.parametrize('dados', [
    png(385), png(2)[:-1], png(2, extras=b'lixo'), png(1, pixels=b'\x00' * 1000000),
    png(1, pixels=b'\x05\x00\x00\x00\x00'), png(2).replace(b'IDAT', b'ZDTA', 1),
])
def test_png_incompleto_corrompido_ou_bomba_rejeitado(dados):
    with pytest.raises(ValueError):
        validar_foto_png(foto(dados))


def registro(data=DATA, origem='conquista'):
    return {'registradaEm': data, 'origem': origem, **({'adquiridaEm': data} if origem == 'conquista' else {})}


def test_aquisicao_offline_persistida_uma_vez_e_isolada(ambiente):
    cliente, _ = ambiente
    _, a = conta(cliente)
    _, b = conta(cliente, 'conquista-b@example.com')
    payload = {'aulasConcluidas': ['html-1'], 'historicoConquistas': {
        'primeira-criacao': registro(), 'nivel-2': registro(),
    }}
    primeira = atualizar(cliente, a, payload)
    assert primeira.status_code == 200, primeira.text
    estado = primeira.json()['estado']
    for id in ('primeira-criacao', 'nivel-2'):
        assert estado['historicoConquistas'][id]['adquiridaEm'].startswith('2026-10-20T12:00:00')
        assert estado['historicoConquistas'][id]['origem'] == 'conquista'
    # Não troca data para a de um sincronismo posterior, nem para outra forjada.
    alterado = atualizar(cliente, a, {'historicoConquistas': {'primeira-criacao': registro(DEPOIS)}}).json()['estado']
    assert alterado['historicoConquistas'] == estado['historicoConquistas']
    assert atualizar(cliente, a, estado).json()['estado']['historicoConquistas'] == estado['historicoConquistas']
    assert not cliente.get('/api/progresso', headers=b).json()['estado'].get('historicoConquistas')


def test_conquista_antiga_nao_inventa_data_da_aquisicao(ambiente):
    cliente, app = ambiente
    dados, h = conta(cliente)
    legado = {'aulasConcluidas': ['html-1'], 'respostas': {}, 'revisoes': {}, 'xp': 100, 'ultimaAula': ''}
    with app.state.banco() as db:
        db.add(Progresso(usuario_id=dados['usuario']['id'], estado=legado, versao=0, conflitos=[]))
        db.commit()
    e = atualizar(cliente, h, {'historicoConquistas': {'primeira-criacao': registro()}}).json()['estado']
    r = e['historicoConquistas']['primeira-criacao']
    assert r['origem'] == 'historico' and 'adquiridaEm' not in r
    assert r['registradaEm']
    assert e['historicoConquistas']['nivel-2']['origem'] == 'historico'
    assert atualizar(cliente, h, {}).json()['estado']['historicoConquistas'] == e['historicoConquistas']


def test_nao_forja_conquista_ou_data_historica(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    for id in ['universo', 'nivel-8']:
        resposta = atualizar(cliente, h, {'xp': 99999, 'historicoConquistas': {id: registro()}})
        assert resposta.status_code == 200
        assert resposta.json()['estado']['xp'] == 0
        assert resposta.json()['estado']['historicoConquistas'] == {}
    for id in ['__proto__', 'qualquer']:
        assert atualizar(cliente, h, {'historicoConquistas': {id: registro()}}).status_code == 422
    assert atualizar(cliente, h, {'aulasConcluidas': ['html-1'], 'historicoConquistas': {'primeira-criacao': {**registro(), 'origem': 'historico'}}}).status_code == 422
    # Um legado pode afirmar honestamente que não conhece sua data original.
    e = atualizar(cliente, h, {'aulasConcluidas': ['html-1'], 'historicoConquistas': {'primeira-criacao': registro(origem='historico')}}).json()['estado']
    assert e['historicoConquistas']['primeira-criacao']['origem'] == 'historico'
    assert 'adquiridaEm' not in e['historicoConquistas']['primeira-criacao']


def test_conquista_local_divergente_nao_bloqueia_resposta_canonica_do_quiz(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    # Uma outra aba já confirmou a alternativa errada no servidor.
    primeira = atualizar(cliente, h, {'avaliacoes': {'html-1': {'escolhas': {'q1': 1}}}})
    assert primeira.status_code == 200
    # O dispositivo offline escolheu a correta e comemorou localmente. A
    # escolha definitiva remota vence sem recusar o snapshot inteiro.
    resposta = atualizar(cliente, h, {
        'avaliacoes': {'html-1': {'escolhas': {'q1': 0}, 'enviadaEm': DATA}},
        'respostas': {'html-1:q1': True},
        'xp': 99999,
        'historicoConquistas': {'primeira-conexao': registro()},
    })
    assert resposta.status_code == 200, resposta.text
    e = resposta.json()['estado']
    assert e['avaliacoes']['html-1']['escolhas']['q1'] == 1
    assert e['respostas']['html-1:q1'] is False
    assert e['xp'] == 0
    assert 'primeira-conexao' not in e['historicoConquistas']
    persistido = cliente.get('/api/progresso', headers=h).json()['estado']
    assert persistido['avaliacoes']['html-1']['escolhas']['q1'] == 1
    assert persistido['historicoConquistas'] == {}


def test_recompensa_nova_tem_data_sem_payload_e_nao_depende_de_xp_recebido(ambiente):
    cliente, _ = ambiente
    _, h = conta(cliente)
    e = atualizar(cliente, h, {'aulasConcluidas': ['a', 'b', 'c'], 'xp': 99999}).json()['estado']
    assert e['xp'] == 300
    assert set(e['historicoConquistas']) == {'primeira-criacao', 'base-solida', 'nivel-2', 'nivel-3'}
    assert all(r['origem'] == 'conquista' and r['adquiridaEm'] for r in e['historicoConquistas'].values())
    assert 'nivel-8' not in e['historicoConquistas']
