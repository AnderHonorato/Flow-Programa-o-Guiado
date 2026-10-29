-- Flow 0.5.0: migração aditiva PostgreSQL no schema privado existente.
-- Conferir alvo; o SQL exige a revisão anterior e aplica RLS backend-only atomicamente.
BEGIN;
SET LOCAL search_path TO flow, public;
DO $$ BEGIN
    IF (SELECT version_num FROM alembic_version) IS DISTINCT FROM '7101d6a5cf57' THEN
        RAISE EXCEPTION 'Revisão anterior diferente de 7101d6a5cf57; nenhuma mudança aplicada.';
    END IF;
END $$;

-- Running upgrade 7101d6a5cf57 -> 8510c0a5e001

ALTER TABLE usuarios ADD COLUMN estado VARCHAR(20) DEFAULT 'ativo' NOT NULL;

ALTER TABLE usuarios ADD COLUMN motivo_estado TEXT;

ALTER TABLE usuarios ADD COLUMN acesso_ate TIMESTAMP WITH TIME ZONE;

CREATE INDEX ix_usuarios_estado ON usuarios (estado);

ALTER TABLE sessoes ADD COLUMN revogada_em TIMESTAMP WITH TIME ZONE;

CREATE TABLE leituras (
    id VARCHAR(36) NOT NULL,
    id_cliente VARCHAR(36) NOT NULL,
    usuario_id VARCHAR(36) NOT NULL,
    aula_id VARCHAR(100) NOT NULL,
    segundos INTEGER NOT NULL,
    criada_em TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (usuario_id, id_cliente),
    CONSTRAINT ck_leituras_segundos CHECK (segundos >= 20 AND segundos <= 300),
    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_leituras_usuario_id ON leituras (usuario_id);

CREATE INDEX ix_leituras_aula_id ON leituras (aula_id);

CREATE TABLE avaliacoes_aulas (
    id VARCHAR(36) NOT NULL,
    usuario_id VARCHAR(36) NOT NULL,
    aula_id VARCHAR(100) NOT NULL,
    nota INTEGER NOT NULL,
    comentario TEXT NOT NULL,
    criada_em TIMESTAMP WITH TIME ZONE NOT NULL,
    atualizada_em TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (usuario_id, aula_id),
    CONSTRAINT ck_avaliacoes_aulas_nota CHECK (nota >= 1 AND nota <= 5),
    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_avaliacoes_aulas_usuario_id ON avaliacoes_aulas (usuario_id);

CREATE INDEX ix_avaliacoes_aulas_aula_id ON avaliacoes_aulas (aula_id);

DO $$ BEGIN
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
        END $$;

UPDATE alembic_version SET version_num='8510c0a5e001' WHERE alembic_version.version_num = '7101d6a5cf57';

COMMIT;

