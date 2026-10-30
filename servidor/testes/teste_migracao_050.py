"""A migração é aditiva e pode voltar sem apagar dados da versão anterior."""
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_upgrade_downgrade_preserva_conta_anterior(tmp_path):
    motor = create_engine(f'sqlite:///{tmp_path}/migracao.db')
    config = Config(str(Path(__file__).parents[1] / 'alembic.ini'))
    with motor.begin() as conexao:
        config.attributes['connection'] = conexao
        command.upgrade(config, '7101d6a5cf57')
        conexao.execute(text("INSERT INTO usuarios (id,nome,email,senha_hash,papel,criado_em) VALUES ('original','Nome','nome@example.com','hash-ficticio','aluno','2026-01-01')"))
        command.upgrade(config, 'head')
        u = conexao.execute(text("SELECT estado,motivo_estado,acesso_ate FROM usuarios WHERE id='original'")).first()
        assert u == ('ativo', None, None)
        assert {'leituras', 'avaliacoes_aulas'} <= set(inspect(conexao).get_table_names())
        command.downgrade(config, '7101d6a5cf57')
        assert conexao.scalar(text("SELECT nome FROM usuarios WHERE id='original'")) == 'Nome'
        assert 'estado' not in {x['name'] for x in inspect(conexao).get_columns('usuarios')}
        assert 'leituras' not in inspect(conexao).get_table_names()
        command.upgrade(config, 'head')
        assert conexao.scalar(text("SELECT estado FROM usuarios WHERE id='original'")) == 'ativo'
    motor.dispose()
