"""Avatar e histórico de recompensas, dentro do progresso privado de cada conta."""
import base64
import binascii
from datetime import datetime, timedelta, timezone
import struct
import zlib


DESENHOS_AVATAR = frozenset({
    'cartoon-raposa', 'cartoon-gato', 'cartoon-coruja', 'cartoon-astronauta', 'cartoon-robo', 'cartoon-dragao',
    'pixel-viajante', 'pixel-guardiao', 'pixel-mago', 'pixel-exploradora', 'pixel-raposa', 'pixel-cristal',
    'games-piloto', 'games-guardiao', 'games-bardo', 'games-ninja', 'games-ranger', 'games-inventora',
})
MINIMOS_NIVEIS = (0, 100, 280, 600, 1000, 1400, 1750, 2000)
IDS_EMBLEMAS = ('primeira-conexao', 'primeira-criacao', 'base-solida', 'engenho', 'constelacao', 'universo')
IDS_CONQUISTAS = frozenset((*IDS_EMBLEMAS, *(f'nivel-{i}' for i in range(2, 9))))


def data_utc(valor):
    if not isinstance(valor, str):
        raise ValueError('Informe uma data ISO com fuso horário.')
    try:
        data = datetime.fromisoformat(valor.replace('Z', '+00:00'))
        if data.tzinfo is None or data.utcoffset() is None:
            raise ValueError
        return data.astimezone(timezone.utc)
    except (ValueError, OverflowError):
        raise ValueError('Informe uma data ISO com fuso horário.') from None


def validar_foto_png(valor):
    """Decodifica somente PNGs pequenos e limita a descompressão aos pixels esperados.

    A foto sempre chega reprocessada pelo app. Não aceita SVG, links, animações,
    dados após IEND, dimensões excessivas ou um fluxo zlib que exceda o limite.
    """
    prefixo = 'data:image/png;base64,'
    if not isinstance(valor, str) or len(valor) > 240000 or not valor.startswith(prefixo):
        raise ValueError('A foto deve ser um PNG processado pelo aplicativo, com até 180 KB.')
    try:
        png = base64.b64decode(valor[len(prefixo):], validate=True)
    except (binascii.Error, ValueError):
        raise ValueError('A foto não contém uma imagem PNG válida.') from None
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('A foto não contém uma imagem PNG válida.')
    posicao, largura, altura, canais = 8, None, None, None
    idat, terminou, encerrou_idat = bytearray(), False, False
    while posicao < len(png):
        if posicao + 12 > len(png):
            raise ValueError('A imagem PNG está incompleta.')
        tamanho, tipo = struct.unpack('>I4s', png[posicao:posicao + 8])
        if not all(65 <= byte <= 90 or 97 <= byte <= 122 for byte in tipo) or tipo[2] & 32:
            raise ValueError('A imagem contém um tipo de bloco PNG inválido.')
        fim = posicao + 12 + tamanho
        if fim > len(png):
            raise ValueError('A imagem PNG está incompleta.')
        dados = png[posicao + 8:posicao + 8 + tamanho]
        crc = struct.unpack('>I', png[posicao + 8 + tamanho:fim])[0]
        if zlib.crc32(tipo + dados) & 0xffffffff != crc:
            raise ValueError('A imagem PNG está corrompida.')
        if largura is None and tipo != b'IHDR':
            raise ValueError('O cabeçalho PNG é inválido.')
        if tipo == b'IHDR':
            if largura is not None or tamanho != 13:
                raise ValueError('O cabeçalho PNG é inválido.')
            largura, altura, bits, cor, compressao, filtro, entrelacado = struct.unpack('>IIBBBBB', dados)
            if not 1 <= largura <= 384 or largura != altura or bits != 8 or cor not in (2, 6) or (compressao, filtro, entrelacado) != (0, 0, 0):
                raise ValueError('A foto deve ser quadrada, com até 384 pixels, RGB ou RGBA de 8 bits.')
            canais = 3 if cor == 2 else 4
        elif tipo == b'IDAT':
            if encerrou_idat:
                raise ValueError('A sequência de pixels PNG é inválida.')
            idat.extend(dados)
        elif tipo == b'IEND':
            if tamanho or not idat or fim != len(png):
                raise ValueError('O final da imagem PNG é inválido.')
            terminou = True
        else:
            if tipo in (b'acTL', b'fcTL', b'fdAT') or not tipo[0] & 32:
                raise ValueError('A foto não pode ser animada nem usar extensões PNG não reconhecidas.')
            if idat:
                encerrou_idat = True
        posicao = fim
    if not terminou or largura is None:
        raise ValueError('A imagem PNG está incompleta.')
    esperado = (largura * canais + 1) * altura
    try:
        decoder = zlib.decompressobj()
        pixels = decoder.decompress(bytes(idat), esperado + 1)
    except zlib.error:
        raise ValueError('Os pixels da foto estão corrompidos.') from None
    if len(pixels) != esperado or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
        raise ValueError('Os pixels da foto excedem o tamanho permitido ou estão incompletos.')
    passo = largura * canais + 1
    if any(pixels[i] > 4 for i in range(0, esperado, passo)):
        raise ValueError('O filtro de pixels PNG é inválido.')
    return valor


def conquistas_obtidas(estado):
    aulas = len(set(estado.get('aulasConcluidas', [])))
    corretas = sum(v is True for v in estado.get('respostas', {}).values())
    xp = aulas * 100 + corretas * 10
    gates = (corretas >= 1, aulas >= 1, aulas >= 3, aulas >= 5, aulas >= 10, aulas >= 20)
    return {id for id, obtida in zip(IDS_EMBLEMAS, gates) if obtida} | {
        f'nivel-{indice + 1}' for indice, minimo in enumerate(MINIMOS_NIVEIS) if indice and xp >= minimo
    }


def mesclar_perfil(novo, recebido, anterior, agora=None):
    agora = agora or datetime.now(timezone.utc)
    data_agora = agora.isoformat()
    obtidas = conquistas_obtidas(novo)
    antigas = conquistas_obtidas(anterior or {})
    entradas = recebido.get('historicoConquistas', {})
    if any(id not in IDS_CONQUISTAS for id in entradas):
        raise ValueError('Identificador de conquista inválido.')
    # Um dispositivo offline pode ter comemorado um acerto que perdeu para a
    # primeira escolha já recebida no servidor. Descartar essa sugestão permite
    # devolver o estado canônico sem bloquear toda a sincronização com 422.
    # Somente `obtidas`, derivado do progresso já mesclado, gera registros.
    historico = novo.setdefault('historicoConquistas', {})
    for id in sorted(obtidas):
        if id in historico:
            continue
        entrada = entradas.get(id)
        if id in antigas:
            # Conquistas anteriores à implantação não têm data real conhecida.
            registro = {'registradaEm': data_agora, 'origem': 'historico'}
        elif entrada and entrada.get('origem') == 'historico':
            registro = {'registradaEm': data_agora, 'origem': 'historico'}
        else:
            adquirida = entrada.get('adquiridaEm') if entrada else None
            data = data_utc(adquirida) if adquirida else agora
            # Um relógio adiantado não pode registrar aquisições no futuro.
            if data > agora + timedelta(minutes=5):
                data = agora
            registro = {'adquiridaEm': data.isoformat(), 'registradaEm': data_agora, 'origem': 'conquista'}
        historico[id] = registro

    avatar = recebido.get('avatar')
    if not avatar:
        return
    if avatar['tipo'] == 'emblema':
        indice = int(avatar['valor'])
        if novo['xp'] < MINIMOS_NIVEIS[indice]:
            raise ValueError('Este ícone de nível ainda não foi desbloqueado.')
    data = data_utc(avatar['atualizadoEm'])
    if data > agora + timedelta(minutes=5):
        raise ValueError('O horário do avatar está no futuro. Ajuste o relógio do dispositivo para sincronizar.')
    avatar = {**avatar, 'atualizadoEm': data.isoformat()}
    atual = novo.get('avatar')
    chave = lambda valor: (data_utc(valor['atualizadoEm']), valor['tipo'], valor['valor'])
    if atual is None or chave(avatar) > chave(atual):
        novo['avatar'] = avatar
