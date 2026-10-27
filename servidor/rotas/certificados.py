"""Reconhecimento interno derivado de aprovação auditada; não certifica uma trilha."""
from datetime import timezone
from hashlib import sha256

from fastapi import APIRouter, Depends
from sqlalchemy import select

from servidor.modelos import Auditoria, Tentativa, Usuario


def criar_rotas_certificados(autenticar, banco):
    rotas = APIRouter()

    @rotas.get('/api/certificados')
    def listar(usuario=Depends(autenticar), db=Depends(banco)):
        tentativas = db.scalars(select(Tentativa).where(
            Tentativa.usuario_id == usuario.id, Tentativa.status == 'aprovada'
        ).order_by(Tentativa.recebida_em, Tentativa.id)).all()
        if not tentativas:
            return []
        auditorias = db.scalars(select(Auditoria).join(Usuario, Usuario.id == Auditoria.ator_id).where(
            Auditoria.recurso.in_([t.id for t in tentativas]),
            Auditoria.acao.in_(['revisao_humana', 'gpt_concluido']),
            Usuario.papel == 'admin',
        ).order_by(Auditoria.criado_em, Auditoria.id)).all()
        aprovacoes = {}
        for auditoria in auditorias:
            if auditoria.dados.get('status') == 'aprovada':
                aprovacoes.setdefault(auditoria.recurso, auditoria)
        saida = []
        for tentativa in tentativas:
            auditoria = aprovacoes.get(tentativa.id)
            if auditoria is None:
                continue
            data = auditoria.criado_em.replace(tzinfo=timezone.utc).isoformat()
            codigo = 'FLOW-' + sha256(f'{tentativa.id}:{data}'.encode()).hexdigest()[:24].upper()
            saida.append({'codigo': codigo, 'titular': usuario.nome, 'aulaId': tentativa.aula_id,
                          'titulo': tentativa.enunciado.get('titulo', tentativa.aula_id),
                          'objetivo': tentativa.enunciado.get('objetivo', ''), 'emitidoEm': data,
                          'tentativaId': tentativa.id, 'tipo': 'reconhecimento_interno_aula',
                          'emissor': 'Flow Programação Guiada',
                          'escopo': 'Conclusão de aula/oficina com atividade aprovada pela administração. Reconhecimento interno, sem equivalência a diploma ou certificação profissional.'})
        return saida

    return rotas
