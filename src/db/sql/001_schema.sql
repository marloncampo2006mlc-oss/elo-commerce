-- =====================================================================
-- ELO COMMERCE :: Schema principal
-- PostgreSQL 14+
-- Modelagem: clientes -> pedidos -> itens, catálogo de produtos e
-- atendimentos omnichannel (chatbot / URA).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- busca sem acentuação

-- ---------------------------------------------------------------------
-- Tipos enumerados: garantem integridade no nível do banco
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE status_cliente AS ENUM ('ativo', 'inativo', 'prospect');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE status_pedido AS ENUM ('rascunho', 'aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE canal_venda AS ENUM ('site', 'chatbot', 'ura', 'whatsapp', 'telefone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE status_atendimento AS ENUM ('em_andamento', 'resolvido', 'transferido', 'abandonado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Função genérica de auditoria: mantém updated_at sempre correto
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- CLIENTES (cadastro de pessoas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome         VARCHAR(120)  NOT NULL CHECK (length(trim(nome)) >= 3),
    email        VARCHAR(160)  NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    cpf          CHAR(11)      NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
    telefone     VARCHAR(20),
    data_nascimento DATE       CHECK (data_nascimento < CURRENT_DATE),
    cidade       VARCHAR(80),
    uf           CHAR(2)       CHECK (uf ~ '^[A-Z]{2}$'),
    status       status_cliente NOT NULL DEFAULT 'ativo',
    observacoes  TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes (status);
CREATE INDEX IF NOT EXISTS idx_clientes_busca  ON clientes USING gin (to_tsvector('portuguese', nome || ' ' || email));

DROP TRIGGER IF EXISTS trg_clientes_updated ON clientes;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- PRODUTOS (catálogo da loja)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku        VARCHAR(24)   NOT NULL UNIQUE,
    nome       VARCHAR(140)  NOT NULL CHECK (length(trim(nome)) >= 3),
    descricao  TEXT,
    categoria  VARCHAR(60)   NOT NULL,
    preco      NUMERIC(12,2) NOT NULL CHECK (preco > 0),
    estoque    INTEGER       NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    ativo      BOOLEAN       NOT NULL DEFAULT TRUE,
    imagem     VARCHAR(16),  -- emoji/ícone usado na vitrine
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo     ON produtos (ativo) WHERE ativo;

DROP TRIGGER IF EXISTS trg_produtos_updated ON produtos;
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- PEDIDOS + ITENS (vendas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero      SERIAL UNIQUE,
    cliente_id  UUID NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
    status      status_pedido NOT NULL DEFAULT 'aguardando_pagamento',
    canal       canal_venda   NOT NULL DEFAULT 'site',
    total       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    observacao  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status  ON pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data    ON pedidos (created_at DESC);

DROP TRIGGER IF EXISTS trg_pedidos_updated ON pedidos;
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pedido_itens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id     UUID NOT NULL REFERENCES pedidos  (id) ON DELETE CASCADE,
    produto_id    UUID NOT NULL REFERENCES produtos (id) ON DELETE RESTRICT,
    quantidade    INTEGER       NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario > 0),
    -- coluna gerada: o subtotal nunca sai de sincronia
    subtotal      NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    UNIQUE (pedido_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_itens_pedido  ON pedido_itens (pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto ON pedido_itens (produto_id);

-- ---------------------------------------------------------------------
-- Trigger: recalcula o total do pedido a cada mudança de item.
-- Regra de negócio no banco = consistência garantida mesmo se outro
-- sistema escrever direto na tabela.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalcular_total_pedido() RETURNS TRIGGER AS $$
DECLARE
    v_pedido UUID := COALESCE(NEW.pedido_id, OLD.pedido_id);
BEGIN
    UPDATE pedidos p
       SET total = COALESCE((SELECT SUM(subtotal) FROM pedido_itens WHERE pedido_id = v_pedido), 0)
     WHERE p.id = v_pedido;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_itens_total ON pedido_itens;
CREATE TRIGGER trg_itens_total AFTER INSERT OR UPDATE OR DELETE ON pedido_itens
    FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

-- ---------------------------------------------------------------------
-- ATENDIMENTOS (chatbot / URA) - núcleo do módulo de comunicação
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atendimentos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo  VARCHAR(20) NOT NULL UNIQUE,
    cliente_id UUID REFERENCES clientes (id) ON DELETE SET NULL,
    canal      canal_venda        NOT NULL DEFAULT 'chatbot',
    status     status_atendimento NOT NULL DEFAULT 'em_andamento',
    no_atual   VARCHAR(40)        NOT NULL DEFAULT 'inicio',  -- nó do fluxo da URA
    transcript JSONB              NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_status     ON atendimentos (status);
CREATE INDEX IF NOT EXISTS idx_atend_transcript ON atendimentos USING gin (transcript);

DROP TRIGGER IF EXISTS trg_atend_updated ON atendimentos;
CREATE TRIGGER trg_atend_updated BEFORE UPDATE ON atendimentos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
