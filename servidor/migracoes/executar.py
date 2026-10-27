from pathlib import Path
from alembic import command
from alembic.config import Config


def atualizar(motor):
    config = Config(str(Path(__file__).parents[1] / 'alembic.ini'))
    with motor.begin() as conexao:
        config.attributes['connection'] = conexao
        command.upgrade(config, 'head')
