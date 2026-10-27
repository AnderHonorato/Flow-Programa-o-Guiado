"""Mescla monotônica: nunca perde conclusão nem resposta correta anterior.

Cada evento é retido. Divergências de snapshots ficam em conflitos para inspeção.
XP é derivado de conquistas, nunca do valor sugerido pelo dispositivo.
"""
from copy import deepcopy
from servidor.esquemas import RevisaoEspacada


def estado_vazio():
    return {'aulasConcluidas': [], 'respostas': {}, 'revisoes': {}, 'xp': 0, 'ultimaAula': ''}


def mesclar(atual, recebido, conflitos):
    novo = deepcopy(atual or estado_vazio())
    conflitos = deepcopy(conflitos or [])
    novo['aulasConcluidas'] = sorted(set(novo['aulasConcluidas']) | set(recebido.get('aulasConcluidas', [])))
    for chave, valor in recebido.get('respostas', {}).items():
        anterior = novo['respostas'].get(chave)
        if anterior is not None and anterior != valor:
            conflito = {'tipo': 'resposta', 'alvo': chave, 'valores': [False, True], 'resolucao': 'preservada_compreensao_demonstrada'}
            if conflito not in conflitos:
                conflitos.append(conflito)
        novo['respostas'][chave] = bool(anterior or valor)
    for chave, valor in recebido.get('revisoes', {}).items():
        anterior = novo['revisoes'].get(chave)
        if anterior is None or (valor['etapa'], valor['proxima']) > (anterior['etapa'], anterior['proxima']):
            novo['revisoes'][chave] = valor
        if anterior and anterior != valor:
            conflito = {'tipo': 'revisao', 'alvo': chave, 'valores': [anterior, valor], 'resolucao': 'maior_etapa_data'}
            if conflito not in conflitos:
                conflitos.append(conflito)
    if recebido.get('ultimaAula'):
        novo['ultimaAula'] = recebido['ultimaAula']
    novo['xp'] = len(novo['aulasConcluidas']) * 100 + sum(novo['respostas'].values()) * 10
    return novo, conflitos


def aplicar_evento(estado, evento, conflitos):
    tipo, alvo, valor = evento['tipo'], evento['alvo'], evento.get('valor')
    recebido = {}
    if tipo == 'aula_concluida':
        recebido['aulasConcluidas'] = [alvo]
    elif tipo == 'resposta':
        if not isinstance(valor, bool):
            raise ValueError('Resposta exige valor booleano.')
        recebido['respostas'] = {alvo: valor}
    elif tipo == 'revisao':
        recebido['revisoes'] = {alvo: RevisaoEspacada.model_validate(valor).model_dump(mode='json')}
    elif tipo == 'ultima_aula':
        recebido['ultimaAula'] = alvo
    return mesclar(estado, recebido, conflitos)
