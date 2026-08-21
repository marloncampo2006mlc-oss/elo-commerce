-- =====================================================================
-- 013 :: Recuperação de senha do cliente
-- ---------------------------------------------------------------------
-- Quem esquecia a senha ficava sem caminho: só restava criar outra
-- conta, o que parte o histórico de compras da pessoa em dois cadastros.
--
-- O código fica GUARDADO COMO HASH, igual à senha. Quem tem acesso de
-- leitura ao banco — um backup vazado, um log de consulta — não pode se
-- passar por ninguém com o que encontrar aqui.
--
-- `expira_em` e `usado_em` são o que tornam o código descartável: vale
-- por poucos minutos e só uma vez. Sem isso um código antigo continuaria
-- abrindo a conta para sempre.
-- =====================================================================

CREATE TABLE IF NOT EXISTS recuperacoes_senha (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id   UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    codigo_hash  CHAR(60)    NOT NULL,
    expira_em    TIMESTAMPTZ NOT NULL,
    usado_em     TIMESTAMPTZ,
    tentativas   SMALLINT    NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Um código que já nasce vencido não teria como ser usado.
    CONSTRAINT recuperacao_prazo_valido CHECK (expira_em > created_at)
);

-- A consulta quente é sempre "existe pedido aberto para este cliente?".
-- O índice parcial cobre só as linhas abertas: as já usadas ou vencidas
-- viram histórico e não precisam ocupar o índice.
CREATE INDEX IF NOT EXISTS idx_recuperacao_aberta
    ON recuperacoes_senha (cliente_id, expira_em DESC)
    WHERE usado_em IS NULL;
