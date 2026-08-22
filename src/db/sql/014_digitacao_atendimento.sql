-- =====================================================================
-- 014 :: Presença temporária de digitação no atendimento humano
-- ---------------------------------------------------------------------
-- Cada lado renova seu próprio prazo enquanto digita. Se o navegador
-- fechar ou a rede cair, o indicador desaparece sozinho ao expirar.
-- =====================================================================

ALTER TABLE atendimentos
    ADD COLUMN IF NOT EXISTS cliente_digitando_ate TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS atendente_digitando_ate TIMESTAMPTZ;
