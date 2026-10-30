import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, StaticPool


def criar_banco(url):
    opcoes = {'pool_pre_ping': True}
    if url.startswith('postgresql+psycopg'):
        # Compatível com poolers transacionais: não mantém prepared statements por conexão.
        opcoes['connect_args'] = {'prepare_threshold': None}
        if os.getenv('BANCO_POOL_NULO') == '1':
            opcoes['poolclass'] = NullPool
    if url.startswith('sqlite'):
        opcoes['connect_args'] = {'check_same_thread': False, 'timeout': 20}
        if ':memory:' in url:
            opcoes['poolclass'] = StaticPool
    motor = create_engine(url, **opcoes)
    if url.startswith('sqlite'):
        @event.listens_for(motor, 'connect')
        def ativar_integridade(conexao, _):
            conexao.execute('PRAGMA foreign_keys=ON')
    return motor, sessionmaker(motor, expire_on_commit=False)
