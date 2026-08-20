-- =====================================================================
-- 008 :: Privilégios individuais
-- ---------------------------------------------------------------------
-- Até aqui o acesso vinha inteiro do papel: escolher "gerente" concedia
-- exatamente o pacote do gerente, sem meio-termo. Na prática existe o
-- caso do "gerente que também exclui produtos" ou do "atendente que vê
-- o BI", e forçar a criação de um papel novo para cada exceção não
-- escala.
--
-- A coluna guarda a lista exata de privilégios da pessoa:
--   NULL  -> herda os privilégios do papel (comportamento padrão)
--   ARRAY -> usa exatamente estes, ignorando o papel
--
-- Manter NULL como padrão preserva todos os usuários existentes sem
-- migração de dados e deixa claro na leitura quem é exceção.
-- =====================================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS privilegios TEXT[];

COMMENT ON COLUMN usuarios.privilegios IS
    'NULL = herda do papel; array = conjunto exato de privilégios da pessoa';

-- Índice GIN permite responder "quem tem tal privilégio?" sem varrer tudo.
CREATE INDEX IF NOT EXISTS idx_usuarios_privilegios
    ON usuarios USING gin (privilegios);
