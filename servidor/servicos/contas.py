"""Status de conta e revogação conferidos em toda requisição autenticada."""
from datetime import timezone
from fastapi import HTTPException
from sqlalchemy import or_
from servidor.modelos import Usuario, agora


def utc(valor):
    if valor is None:
        return None
    return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor.astimezone(timezone.utc)


def iso(valor):
    return utc(valor).isoformat() if valor is not None else None


def estado_efetivo(usuario):
    if usuario.estado != 'ativo' and usuario.acesso_ate and utc(usuario.acesso_ate) <= agora():
        return 'ativo'
    return usuario.estado


def filtro_ativos():
    return or_(Usuario.estado == 'ativo', Usuario.acesso_ate <= agora())


def conferir_acesso(usuario):
    estado = estado_efetivo(usuario)
    if estado == 'ativo':
        return
    raise HTTPException(403, {
        'codigo': 'CONTA_BANIDA' if estado == 'banido' else 'CONTA_INATIVA',
        'mensagem': 'Sua conta foi banida.' if estado == 'banido' else 'Sua conta foi inativada.',
        'estado': estado, 'motivo': usuario.motivo_estado,
        'ate': iso(usuario.acesso_ate),
    })


def expirar_restricao(db, usuario):
    """O fim do bloqueio permite novo login, mas não ressuscita tokens revogados."""
    if usuario.estado != 'ativo' and estado_efetivo(usuario) == 'ativo':
        usuario.estado = 'ativo'
        usuario.motivo_estado = None
        usuario.acesso_ate = None
        db.flush()
        return True
    return False
