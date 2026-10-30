"""Lê reconhecimentos auditados em lote sem confundi-los com XP declarado."""
from collections import defaultdict
from hashlib import sha256
from sqlalchemy import select
from servidor.modelos import Auditoria, Tentativa, Usuario
from servidor.servicos.contas import iso


def certificados_por_usuarios(db, usuarios):
    if not usuarios:
        return {}
    nomes = {u.id: u.nome for u in usuarios}
    tentativas = db.scalars(select(Tentativa).where(
        Tentativa.usuario_id.in_(nomes), Tentativa.status == 'aprovada'
    ).order_by(Tentativa.recebida_em, Tentativa.id)).all()
    if not tentativas:
        return {}
    auditorias = db.scalars(select(Auditoria).join(Usuario, Usuario.id == Auditoria.ator_id).where(
        Auditoria.recurso.in_([t.id for t in tentativas]),
        Auditoria.acao.in_(['revisao_humana', 'gpt_concluido']), Usuario.papel == 'admin'
    ).order_by(Auditoria.criado_em, Auditoria.id)).all()
    aprovacoes = {}
    for a in auditorias:
        if a.dados.get('status') == 'aprovada':
            aprovacoes.setdefault(a.recurso, a)
    saida = defaultdict(list)
    for t in tentativas:
        aprovacao = aprovacoes.get(t.id)
        if aprovacao is None:
            continue
        data = iso(aprovacao.criado_em)
        codigo = 'FLOW-' + sha256(f'{t.id}:{data}'.encode()).hexdigest()[:24].upper()
        saida[t.usuario_id].append({'codigo': codigo, 'titular': nomes[t.usuario_id], 'aulaId': t.aula_id,
            'titulo': t.enunciado.get('titulo', t.aula_id), 'objetivo': t.enunciado.get('objetivo', ''),
            'emitidoEm': data, 'tentativaId': t.id, 'tipo': 'reconhecimento_interno_aula',
            'emissor': 'Flow Programação Guiada',
            'escopo': 'Conclusão de aula/oficina com atividade aprovada pela administração. Reconhecimento interno, sem equivalência a diploma ou certificação profissional.'})
    return dict(saida)
