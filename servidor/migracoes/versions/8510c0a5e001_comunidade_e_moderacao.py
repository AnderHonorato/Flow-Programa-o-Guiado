"""Comunidade, leituras, avaliações de aula e revogação de contas.

Migração aditiva: o aplicativo anterior continua compatível durante a publicação.
"""
from alembic import op
import sqlalchemy as sa

revision = '8510c0a5e001'
down_revision = '7101d6a5cf57'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('usuarios', sa.Column('estado', sa.String(20), nullable=False, server_default='ativo'))
    op.add_column('usuarios', sa.Column('motivo_estado', sa.Text(), nullable=True))
    op.add_column('usuarios', sa.Column('acesso_ate', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_usuarios_estado', 'usuarios', ['estado'])
    op.add_column('sessoes', sa.Column('revogada_em', sa.DateTime(timezone=True), nullable=True))
    op.create_table('leituras',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('id_cliente', sa.String(36), nullable=False),
        sa.Column('usuario_id', sa.String(36), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('aula_id', sa.String(100), nullable=False),
        sa.Column('segundos', sa.Integer(), nullable=False),
        sa.Column('criada_em', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('usuario_id', 'id_cliente'),
        sa.CheckConstraint('segundos >= 20 AND segundos <= 300', name='ck_leituras_segundos'))
    op.create_index('ix_leituras_usuario_id', 'leituras', ['usuario_id'])
    op.create_index('ix_leituras_aula_id', 'leituras', ['aula_id'])
    op.create_table('avaliacoes_aulas',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('usuario_id', sa.String(36), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('aula_id', sa.String(100), nullable=False),
        sa.Column('nota', sa.Integer(), nullable=False),
        sa.Column('comentario', sa.Text(), nullable=False),
        sa.Column('criada_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizada_em', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('usuario_id', 'aula_id'),
        sa.CheckConstraint('nota >= 1 AND nota <= 5', name='ck_avaliacoes_aulas_nota'))
    op.create_index('ix_avaliacoes_aulas_usuario_id', 'avaliacoes_aulas', ['usuario_id'])
    op.create_index('ix_avaliacoes_aulas_aula_id', 'avaliacoes_aulas', ['aula_id'])
    if op.get_bind().dialect.name == 'postgresql':
        # O ambiente Flow usa schema privado/role dedicado. A mesma migração
        # também roda em schemas temporários de integração, sem nomes globais.
        op.execute("""DO $$ BEGIN
            IF current_schema() = 'flow' AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flow_backend') THEN
                ALTER TABLE flow.leituras ENABLE ROW LEVEL SECURITY;
                ALTER TABLE flow.avaliacoes_aulas ENABLE ROW LEVEL SECURITY;
                REVOKE ALL ON TABLE flow.leituras, flow.avaliacoes_aulas FROM PUBLIC;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                    REVOKE ALL ON TABLE flow.leituras, flow.avaliacoes_aulas FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                    REVOKE ALL ON TABLE flow.leituras, flow.avaliacoes_aulas FROM authenticated;
                END IF;
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE flow.leituras, flow.avaliacoes_aulas TO flow_backend;
                CREATE POLICY leituras_backend ON flow.leituras FOR ALL TO flow_backend USING (true) WITH CHECK (true);
                CREATE POLICY avaliacoes_aulas_backend ON flow.avaliacoes_aulas FOR ALL TO flow_backend USING (true) WITH CHECK (true);
            END IF;
        END $$""")


def downgrade():
    op.drop_index('ix_avaliacoes_aulas_aula_id', table_name='avaliacoes_aulas')
    op.drop_index('ix_avaliacoes_aulas_usuario_id', table_name='avaliacoes_aulas')
    op.drop_table('avaliacoes_aulas')
    op.drop_index('ix_leituras_aula_id', table_name='leituras')
    op.drop_index('ix_leituras_usuario_id', table_name='leituras')
    op.drop_table('leituras')
    op.drop_column('sessoes', 'revogada_em')
    op.drop_index('ix_usuarios_estado', table_name='usuarios')
    op.drop_column('usuarios', 'acesso_ate')
    op.drop_column('usuarios', 'motivo_estado')
    op.drop_column('usuarios', 'estado')
