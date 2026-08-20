-- =====================================================================
-- 010 :: Forma de pagamento do pedido
-- ---------------------------------------------------------------------
-- O checkout passa a perguntar como o cliente quer pagar. O registro
-- fica no pedido porque é característica da venda, não da sessão: o BI
-- precisa saber quanto entrou por Pix e quanto por cartão.
--
-- `pagamento_referencia` guarda o identificador do cobrança gerada —
-- num cenário real seria o id devolvido pelo provedor de pagamento.
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE forma_pagamento AS ENUM ('pix', 'credito', 'debito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS forma_pagamento      forma_pagamento,
    ADD COLUMN IF NOT EXISTS pagamento_referencia VARCHAR(80),
    ADD COLUMN IF NOT EXISTS pago_em              TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_forma_pagamento
    ON pedidos (forma_pagamento) WHERE forma_pagamento IS NOT NULL;
