-- =====================================================================
-- 007 :: Ordem correta das mensagens
-- ---------------------------------------------------------------------
-- Bug encontrado ao testar a conversa ponta a ponta: as mensagens de um
-- mesmo turno apareciam fora de ordem.
--
-- Causa: NOW() devolve o horário de INÍCIO DA TRANSAÇÃO, e não o
-- instante do INSERT. Como um turno grava a fala do cliente e as
-- respostas do bot na mesma transação, todas recebiam timestamp
-- idêntico e o ORDER BY caía no desempate por UUID — que é aleatório.
--
-- Correção: clock_timestamp() lê o relógio a cada chamada. Somamos a
-- isso uma coluna sequencial, que dá ordem total garantida mesmo se
-- dois INSERTs caírem no mesmo microssegundo.
-- =====================================================================

ALTER TABLE atendimento_mensagens
    ALTER COLUMN created_at SET DEFAULT clock_timestamp();

ALTER TABLE atendimento_eventos
    ALTER COLUMN created_at SET DEFAULT clock_timestamp();

ALTER TABLE atendimento_mensagens
    ADD COLUMN IF NOT EXISTS seq BIGSERIAL;

CREATE INDEX IF NOT EXISTS idx_mensagens_ordem
    ON atendimento_mensagens (atendimento_id, seq);
