-- =====================================================================
-- 011 :: CPF passa a ser opcional no cadastro
-- ---------------------------------------------------------------------
-- O login com Google não fornece CPF — o provedor devolve apenas id,
-- e-mail e nome. Exigir o campo na criação impediria o cadastro por
-- esse caminho.
--
-- O dado continua sendo pedido no primeiro checkout, onde é realmente
-- necessário para emitir a nota. UNIQUE aceita múltiplos NULL no
-- PostgreSQL, então a restrição de unicidade segue valendo para quem
-- informou.
-- =====================================================================

ALTER TABLE clientes ALTER COLUMN cpf DROP NOT NULL;

COMMENT ON COLUMN clientes.cpf IS
    'Opcional no cadastro via Google; exigido no checkout para a nota';
