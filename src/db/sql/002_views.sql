-- =====================================================================
-- ELO COMMERCE :: Camada analítica (views + funções)
-- Consultas do dashboard ficam no banco: uma fonte de verdade só.
-- =====================================================================

-- Pedido "achatado" com dados do cliente e contagem de itens
CREATE OR REPLACE VIEW vw_pedidos_detalhados AS
SELECT p.id,
       p.numero,
       p.status,
       p.canal,
       p.total,
       p.observacao,
       p.created_at,
       c.id    AS cliente_id,
       c.nome  AS cliente_nome,
       c.email AS cliente_email,
       c.cidade AS cliente_cidade,
       c.uf     AS cliente_uf,
       COALESCE(i.qtd_itens, 0)  AS qtd_itens,
       COALESCE(i.qtd_pecas, 0)  AS qtd_pecas
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id
  LEFT JOIN LATERAL (
        SELECT COUNT(*) AS qtd_itens, SUM(quantidade) AS qtd_pecas
          FROM pedido_itens WHERE pedido_id = p.id
  ) i ON TRUE;

-- Faturamento por dia (últimos 30 dias), já preenchendo dias sem venda
CREATE OR REPLACE VIEW vw_faturamento_diario AS
SELECT d.dia::date                      AS dia,
       COALESCE(SUM(p.total), 0)        AS faturamento,
       COUNT(p.id)                      AS pedidos
  FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') d(dia)
  LEFT JOIN pedidos p
         ON p.created_at::date = d.dia::date
        AND p.status <> 'cancelado'
 GROUP BY d.dia
 ORDER BY d.dia;

-- Ranking de produtos mais vendidos
CREATE OR REPLACE VIEW vw_top_produtos AS
SELECT pr.id,
       pr.nome,
       pr.categoria,
       pr.imagem,
       pr.estoque,
       COALESCE(SUM(pi.quantidade), 0) AS unidades_vendidas,
       COALESCE(SUM(pi.subtotal), 0)   AS receita
  FROM produtos pr
  LEFT JOIN pedido_itens pi ON pi.produto_id = pr.id
  LEFT JOIN pedidos ped ON ped.id = pi.pedido_id AND ped.status <> 'cancelado'
 GROUP BY pr.id
 ORDER BY receita DESC;

-- Desempenho por canal de venda (site, chatbot, URA...)
CREATE OR REPLACE VIEW vw_vendas_por_canal AS
SELECT canal,
       COUNT(*)                       AS pedidos,
       COALESCE(SUM(total), 0)        AS faturamento,
       COALESCE(ROUND(AVG(total), 2), 0) AS ticket_medio
  FROM pedidos
 WHERE status <> 'cancelado'
 GROUP BY canal
 ORDER BY faturamento DESC;

-- Clientes com histórico consolidado (LTV simples)
CREATE OR REPLACE VIEW vw_clientes_resumo AS
SELECT c.*,
       COALESCE(p.total_pedidos, 0) AS total_pedidos,
       COALESCE(p.total_gasto, 0)   AS total_gasto,
       p.ultimo_pedido
  FROM clientes c
  LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total_pedidos,
               SUM(total) AS total_gasto,
               MAX(created_at) AS ultimo_pedido
          FROM pedidos WHERE cliente_id = c.id AND status <> 'cancelado'
  ) p ON TRUE;

-- ---------------------------------------------------------------------
-- Função: baixa de estoque atômica. Lança exceção se não houver saldo,
-- abortando a transação inteira do pedido.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION baixar_estoque(p_produto UUID, p_qtd INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_restante INTEGER;
BEGIN
    UPDATE produtos
       SET estoque = estoque - p_qtd
     WHERE id = p_produto AND estoque >= p_qtd
     RETURNING estoque INTO v_restante;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%', p_produto
              USING HINT = 'Quantidade solicitada maior que o saldo disponível';
    END IF;

    RETURN v_restante;
END;
$$ LANGUAGE plpgsql;
