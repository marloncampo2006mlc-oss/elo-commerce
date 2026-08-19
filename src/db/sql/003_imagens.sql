-- =====================================================================
-- 003 :: A vitrine passa a aceitar imagem de verdade
-- A coluna `imagem` guardava só um emoji (16 chars). Agora aceita
-- também um caminho de arquivo (/assets/produtos/xxx.svg ou .jpg).
-- O front decide como renderizar: começa com "/" ou "http" => <img>,
-- caso contrário trata como emoji. Assim o cadastro antigo continua
-- válido e a mudança é retrocompatível.
--
-- Obs.: vw_top_produtos projeta essa coluna, então o PostgreSQL impede
-- o ALTER enquanto a view existir. Derrubamos e recriamos na mesma
-- migration — a view é derivada, não guarda dado.
-- =====================================================================

DROP VIEW IF EXISTS vw_top_produtos;

ALTER TABLE produtos
    ALTER COLUMN imagem TYPE VARCHAR(255);

COMMENT ON COLUMN produtos.imagem IS
    'Emoji (ex.: 🎧) ou caminho/URL da imagem (ex.: /assets/produtos/headset.svg)';

CREATE VIEW vw_top_produtos AS
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
