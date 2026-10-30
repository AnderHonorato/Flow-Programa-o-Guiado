"""Mescla de progresso: preserva conclusões e escolhas definitivas de avaliações.

Cada evento é retido. Divergências de snapshots ficam em conflitos para inspeção.
XP é derivado de conquistas, nunca do valor sugerido pelo dispositivo.
"""
from copy import deepcopy
from servidor.esquemas import RevisaoEspacada
from servidor.servicos.catalogo import encontrar_aula
from servidor.servicos.perfil import mesclar_perfil


def estado_vazio():
    return {'aulasConcluidas': [], 'respostas': {}, 'avaliacoes': {}, 'revisoes': {}, 'xp': 0, 'ultimaAula': ''}


def mesclar_avaliacoes(novo, recebido, catalogo):
    """A primeira escolha recebida é definitiva, inclusive o índice zero.

    Dados recebidos sempre são validados, mesmo quando conflitam com escolhas
    antigas. O catálogo é a autoridade para a correção, nunca os booleanos do cliente.
    """
    avaliacoes = novo.setdefault('avaliacoes', {})
    # Mantido somente no JSON interno; o cliente nunca recebe nem pode enviar
    # este campo. Uma publicação posterior do CMS não reescreve a nota antiga.
    gabaritos = novo.setdefault('_gabaritosAvaliacoes', {})
    enunciados = novo.setdefault('_questoesAvaliacoes', {})

    def gabarito_da_aula(aula_id):
        if aula_id not in gabaritos or aula_id not in enunciados:
            aula = encontrar_aula(catalogo, aula_id) if catalogo else None
            if aula is None:
                raise ValueError('A avaliação deve pertencer a uma aula publicada.')
            if aula_id not in gabaritos:
                gabaritos[aula_id] = {q['id']: [a['correta'] for a in q['alternativas']] for q in aula['questoes']}
            enunciados[aula_id] = deepcopy(aula['questoes'])
        return gabaritos[aula_id]

    for aula_id, entrada in recebido.get('avaliacoes', {}).items():
        questoes = gabarito_da_aula(aula_id)
        for chave, indice in entrada['escolhas'].items():
            if chave not in questoes or isinstance(indice, bool) or not isinstance(indice, int) or not 0 <= indice < len(questoes[chave]):
                raise ValueError('Alternativa ou questão inválida para esta aula.')
        anterior = avaliacoes.get(aula_id, {'escolhas': {}})
        escolhas = {**entrada['escolhas'], **anterior['escolhas']}
        enviada = anterior.get('enviadaEm') or entrada.get('enviadaEm')
        if enviada and set(escolhas) != set(questoes):
            raise ValueError('Responda todas as questões antes de enviar a avaliação.')
        if entrada.get('revisada') and not enviada:
            raise ValueError('A correção só pode ser revisada depois do envio.')
        avaliacao = {'escolhas': escolhas}
        if enviada:
            avaliacao['enviadaEm'] = enviada
        if anterior.get('revisada') or entrada.get('revisada'):
            avaliacao['revisada'] = True
        avaliacoes[aula_id] = avaliacao
    # Reaplicar a correção também protege contra eventos legados ou snapshots
    # que tentem transformar uma escolha errada em acerto ou antecipar XP.
    for aula_id, avaliacao in avaliacoes.items():
        questoes = gabarito_da_aula(aula_id)
        if avaliacao.get('enviadaEm'):
            # A explicação e o texto das alternativas seguem a mesma versão da
            # primeira escolha. Nunca se utiliza `entrada.correcao` do cliente.
            avaliacao['correcao'] = deepcopy(enunciados[aula_id])
        else:
            avaliacao.pop('correcao', None)
        # Não permite criar pontos com uma questão inventada sob esta avaliação.
        prefixo = f'{aula_id}:'
        novo['respostas'] = {chave: valor for chave, valor in novo['respostas'].items() if not chave.startswith(prefixo)}
        for questao_id, alternativas in questoes.items():
            chave = f"{aula_id}:{questao_id}"
            if avaliacao.get('enviadaEm'):
                indice = avaliacao['escolhas'][questao_id]
                novo['respostas'][chave] = alternativas[indice]
            else:
                novo['respostas'].pop(chave, None)


def mesclar(atual, recebido, conflitos, catalogo=None):
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
    mesclar_avaliacoes(novo, recebido, catalogo)
    novo['xp'] = len(novo['aulasConcluidas']) * 100 + sum(novo['respostas'].values()) * 10
    mesclar_perfil(novo, recebido, atual)
    return novo, conflitos


def aplicar_evento(estado, evento, conflitos, catalogo=None):
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
    return mesclar(estado, recebido, conflitos, catalogo)
