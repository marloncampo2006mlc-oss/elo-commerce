-- =====================================================================
-- 009 :: Acesso do cliente da loja
-- ---------------------------------------------------------------------
-- Até aqui só a equipe interna autenticava. O cliente comprava
-- escolhendo o próprio nome numa lista, o que servia para demonstrar o
-- fluxo mas não é como uma loja funciona.
--
-- `senha_hash` é NULA para os cadastros que já existem: eles continuam
-- válidos como cliente, apenas ainda sem acesso. Quem se cadastrar pela
-- loja passa a ter login.
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE metodo_login AS ENUM ('senha', 'google');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS senha_hash    CHAR(60),
    ADD COLUMN IF NOT EXISTS metodo_login  metodo_login,
    ADD COLUMN IF NOT EXISTS google_id     VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;

-- Índice parcial: o login só consulta quem tem acesso configurado.
CREATE INDEX IF NOT EXISTS idx_clientes_login
    ON clientes (email) WHERE senha_hash IS NOT NULL OR google_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_google
    ON clientes (google_id) WHERE google_id IS NOT NULL;

COMMENT ON COLUMN clientes.senha_hash IS
    'Hash bcrypt; NULL = cadastro sem acesso à loja (herdado do seed)';
