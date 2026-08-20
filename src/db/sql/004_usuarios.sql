-- =====================================================================
-- 004 :: Usuários da gestão
-- ---------------------------------------------------------------------
-- Até aqui a plataforma não tinha identidade: a sessão administrativa
-- era uma senha única em variável de ambiente. Esta migration introduz
-- usuários reais, com papel, para sustentar a separação entre a loja
-- (público) e a gestão (equipe interna).
--
-- `clientes` continua sendo o consumidor da loja — são conceitos
-- diferentes, com ciclos de vida diferentes, e por isso tabelas
-- separadas.
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE papel_usuario AS ENUM ('administrador', 'gerente', 'supervisor', 'atendente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS usuarios (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       VARCHAR(120) NOT NULL CHECK (length(trim(nome)) >= 3),
    email      VARCHAR(160) NOT NULL UNIQUE
               CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    -- Nunca guardamos a senha: apenas o hash bcrypt (60 caracteres).
    senha_hash CHAR(60)     NOT NULL,
    papel      papel_usuario NOT NULL DEFAULT 'atendente',
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índice parcial: o login só consulta usuários ativos.
CREATE INDEX IF NOT EXISTS idx_usuarios_email_ativo ON usuarios (email) WHERE ativo;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON usuarios;
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  usuarios IS 'Equipe interna com acesso à área de gestão';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash bcrypt — a senha em texto nunca é persistida';
