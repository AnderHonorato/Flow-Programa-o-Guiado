from datetime import timedelta
import hashlib
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from servidor.modelos import Sessao, agora

HASHER = PasswordHasher()
HASH_FICTICIO = HASHER.hash('comparacao-temporal-de-credenciais-inexistentes')


def hash_senha(senha):
    return HASHER.hash(senha)


def verificar_senha(senha, valor_hash):
    try:
        return HASHER.verify(valor_hash, senha)
    except (VerificationError, InvalidHashError):
        return False


def resumo_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def criar_sessao(banco, usuario, horas):
    token = secrets.token_urlsafe(48)
    banco.add(Sessao(hash_token=resumo_token(token), usuario_id=usuario.id,
                     expira_em=agora() + timedelta(hours=horas)))
    return token
