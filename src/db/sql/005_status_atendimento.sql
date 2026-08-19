-- =====================================================================
-- 005 :: Novos status de atendimento
-- ---------------------------------------------------------------------
-- Precisa ficar isolado: o PostgreSQL não permite USAR um valor de enum
-- na mesma transação em que ele é criado (o índice parcial da fila, na
-- migration seguinte, filtra por 'aguardando_atendente'). Como cada
-- arquivo roda em sua própria transação, separar resolve.
--
-- Os valores antigos seguem válidos para o histórico já gravado.
-- =====================================================================

ALTER TYPE status_atendimento ADD VALUE IF NOT EXISTS 'aguardando_atendente';
ALTER TYPE status_atendimento ADD VALUE IF NOT EXISTS 'em_atendimento';
ALTER TYPE status_atendimento ADD VALUE IF NOT EXISTS 'finalizado';
