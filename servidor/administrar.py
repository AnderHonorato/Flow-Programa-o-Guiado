"""Provisionamento administrativo fora da API pública.

python -m servidor.administrar criar-admin --email admin@exemplo.com --nome Ander
A senha é solicitada via terminal sem eco; não entra em argumentos ou logs.
"""
import argparse
from getpass import getpass
from sqlalchemy import delete, select
from servidor.banco import criar_banco
from servidor.configuracao import Configuracao
from servidor.migracoes.executar import atualizar
from servidor.modelos import Usuario, Auditoria, Sessao
from servidor.seguranca import hash_senha
from servidor.esquemas import Cadastro


def principal():
    parser = argparse.ArgumentParser(description='Administração local do Flow')
    sub = parser.add_subparsers(dest='acao', required=True)
    sub.add_parser('migrar', help='Aplicar migrações pendentes')
    criar = sub.add_parser('criar-admin', help='Criar ou promover administrador pelo acesso ao servidor')
    criar.add_argument('--email', required=True)
    criar.add_argument('--nome', required=True)
    argumentos = parser.parse_args()
    motor, fabrica = criar_banco(Configuracao().banco_url)
    atualizar(motor)
    if argumentos.acao == 'migrar':
        print('Migrações aplicadas.')
        return
    senha = getpass('Senha do administrador (mínimo 10 caracteres): ')
    if senha != getpass('Repita a senha: '):
        parser.error('As senhas não coincidem.')
    entrada = Cadastro(nome=argumentos.nome, email=argumentos.email, senha=senha)
    with fabrica() as banco:
        usuario = banco.scalar(select(Usuario).where(Usuario.email == str(entrada.email)))
        if usuario is None:
            usuario = Usuario(nome=entrada.nome, email=str(entrada.email), senha_hash=hash_senha(senha), papel='admin')
            banco.add(usuario)
            banco.flush()
        else:
            usuario.papel = 'admin'
            usuario.senha_hash = hash_senha(senha)
            banco.execute(delete(Sessao).where(Sessao.usuario_id == usuario.id))
        banco.add(Auditoria(ator_id=usuario.id, acao='admin_provisionado_cli', recurso=usuario.id, dados={'origem': 'terminal_servidor'}))
        banco.commit()
    print('Administrador provisionado com auditoria.')


if __name__ == '__main__':
    principal()
