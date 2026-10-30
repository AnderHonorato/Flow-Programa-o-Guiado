from alembic import context
from sqlalchemy import engine_from_config, pool
from servidor.modelos import Base
from servidor.configuracao import Configuracao

config = context.config
target_metadata = Base.metadata


def executar(conexao):
    context.configure(connection=conexao, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(url=Configuracao().banco_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    conexao = config.attributes.get('connection')
    if conexao is not None:
        executar(conexao)
    else:
        config.set_main_option('sqlalchemy.url', Configuracao().banco_url.replace('%', '%%'))
        motor = engine_from_config(config.get_section(config.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)
        with motor.connect() as conexao:
            executar(conexao)
