-- =====================================================================
-- 006 :: No-Code de chatbot + atendimento humano
-- ---------------------------------------------------------------------
-- Três mudanças estruturais, todas aprovadas antes de aplicar:
--
-- 1. bots + bot_versoes: o fluxo conversacional sai do código e passa a
--    ser dado versionado. Publicar uma v2 não altera conversas em
--    andamento, porque cada atendimento guarda a versão que o atendeu.
--
-- 2. atendimento_mensagens / atendimento_eventos: o transcript em JSONB
--    é normalizado. Com JSONB não dá para indexar mensagem, atribuir
--    autor, paginar histórico nem medir tempo de resposta — tudo isso é
--    requisito da fila de atendimento e do BI.
--
-- 3. Os novos status da fila entram na migration 005, separada por
--    exigência do PostgreSQL quanto a enums.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE status_bot_versao AS ENUM ('rascunho', 'publicada', 'arquivada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE autor_mensagem AS ENUM ('cliente', 'bot', 'atendente', 'sistema');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- BOTS e suas versões
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       VARCHAR(120) NOT NULL CHECK (length(trim(nome)) >= 3),
    descricao  TEXT,
    -- Apenas um bot atende a loja por vez; o índice parcial abaixo garante.
    ativo_na_loja BOOLEAN NOT NULL DEFAULT FALSE,
    criado_por UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_unico_na_loja
    ON bots ((TRUE)) WHERE ativo_na_loja;

DROP TRIGGER IF EXISTS trg_bots_updated ON bots;
CREATE TRIGGER trg_bots_updated BEFORE UPDATE ON bots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS bot_versoes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id      UUID NOT NULL REFERENCES bots (id) ON DELETE CASCADE,
    versao      INTEGER NOT NULL CHECK (versao > 0),
    -- O grafo inteiro: { "nodes": [...], "edges": [...] }.
    -- JSONB e não tabelas separadas porque o editor sempre lê e grava o
    -- fluxo completo — normalizar criaria JOINs sem nenhum ganho.
    fluxo       JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    status      status_bot_versao NOT NULL DEFAULT 'rascunho',
    notas       TEXT,
    publicada_em TIMESTAMPTZ,
    criado_por  UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bot_id, versao)
);

-- No máximo uma versão publicada por bot, garantido pelo banco.
CREATE UNIQUE INDEX IF NOT EXISTS idx_uma_versao_publicada
    ON bot_versoes (bot_id) WHERE status = 'publicada';

CREATE INDEX IF NOT EXISTS idx_bot_versoes_bot ON bot_versoes (bot_id, versao DESC);

DROP TRIGGER IF EXISTS trg_bot_versoes_updated ON bot_versoes;
CREATE TRIGGER trg_bot_versoes_updated BEFORE UPDATE ON bot_versoes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- ATENDIMENTOS: vínculo com a versão do bot e com o atendente
-- ---------------------------------------------------------------------
ALTER TABLE atendimentos
    ADD COLUMN IF NOT EXISTS bot_versao_id UUID REFERENCES bot_versoes (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS atendente_id  UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assumido_em   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS entrou_fila_em TIMESTAMPTZ,
    -- Variáveis coletadas durante a conversa (respostas de perguntas).
    ADD COLUMN IF NOT EXISTS contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Conversas do modo "Testar" não entram nas métricas do BI.
    ADD COLUMN IF NOT EXISTS teste BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_atend_fila
    ON atendimentos (entrou_fila_em) WHERE status = 'aguardando_atendente';
CREATE INDEX IF NOT EXISTS idx_atend_atendente ON atendimentos (atendente_id);

-- ---------------------------------------------------------------------
-- MENSAGENS e EVENTOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atendimento_mensagens (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id UUID NOT NULL REFERENCES atendimentos (id) ON DELETE CASCADE,
    autor          autor_mensagem NOT NULL,
    -- Preenchido quando quem falou foi um atendente humano.
    autor_id       UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    conteudo       TEXT NOT NULL,
    -- Opções de menu apresentadas junto da mensagem, quando houver.
    opcoes         JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_atendimento
    ON atendimento_mensagens (atendimento_id, created_at);

CREATE TABLE IF NOT EXISTS atendimento_eventos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id UUID NOT NULL REFERENCES atendimentos (id) ON DELETE CASCADE,
    tipo           VARCHAR(40) NOT NULL,
    descricao      TEXT NOT NULL,
    usuario_id     UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_atendimento
    ON atendimento_eventos (atendimento_id, created_at);

-- ---------------------------------------------------------------------
-- Migra o transcript JSONB existente para linhas, sem perder histórico
-- ---------------------------------------------------------------------
INSERT INTO atendimento_mensagens (atendimento_id, autor, conteudo, created_at)
SELECT a.id,
       CASE msg->>'autor'
            WHEN 'cliente' THEN 'cliente'::autor_mensagem
            WHEN 'bot'     THEN 'bot'::autor_mensagem
            ELSE 'sistema'::autor_mensagem
       END,
       COALESCE(msg->>'texto', ''),
       COALESCE((msg->>'em')::timestamptz, a.created_at)
  FROM atendimentos a
  CROSS JOIN LATERAL jsonb_array_elements(a.transcript) AS msg
 WHERE jsonb_array_length(a.transcript) > 0
   AND NOT EXISTS (SELECT 1 FROM atendimento_mensagens m WHERE m.atendimento_id = a.id);
