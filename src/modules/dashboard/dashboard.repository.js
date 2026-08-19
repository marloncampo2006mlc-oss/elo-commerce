import { query } from '../../db/pool.js';

export const dashboardRepository = {
  async indicadores() {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM clientes)                                   AS clientes,
        (SELECT COUNT(*)::int FROM clientes WHERE status = 'ativo')            AS clientes_ativos,
        (SELECT COUNT(*)::int FROM produtos WHERE ativo)                       AS produtos,
        (SELECT COUNT(*)::int FROM produtos WHERE estoque = 0 AND ativo)       AS produtos_sem_estoque,
        (SELECT COUNT(*)::int FROM pedidos WHERE status <> 'cancelado')        AS pedidos,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE status <> 'cancelado') AS faturamento,
        (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM pedidos WHERE status <> 'cancelado') AS ticket_medio,
        (SELECT COUNT(*)::int FROM pedidos
          WHERE status <> 'cancelado' AND created_at >= date_trunc('month', CURRENT_DATE)) AS pedidos_mes,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos
          WHERE status <> 'cancelado' AND created_at >= date_trunc('month', CURRENT_DATE)) AS faturamento_mes,
        (SELECT COUNT(*)::int FROM atendimentos)                               AS atendimentos,
        (SELECT COUNT(*)::int FROM pedidos WHERE canal IN ('chatbot','ura'))   AS pedidos_automatizados
    `);
    return rows[0];
  },

  faturamentoDiario: async () => (await query('SELECT * FROM vw_faturamento_diario')).rows,
  topProdutos: async (limite = 5) =>
    (await query('SELECT * FROM vw_top_produtos WHERE unidades_vendidas > 0 LIMIT $1', [limite])).rows,
  vendasPorCanal: async () => (await query('SELECT * FROM vw_vendas_por_canal')).rows,

  pedidosPorStatus: async () => (await query(
    `SELECT status, COUNT(*)::int AS total, COALESCE(SUM(total),0) AS valor
       FROM pedidos GROUP BY status ORDER BY total DESC`)).rows,

  ultimosPedidos: async (limite = 6) => (await query(
    `SELECT id, numero, cliente_nome, status, canal, total, created_at
       FROM vw_pedidos_detalhados ORDER BY created_at DESC LIMIT $1`, [limite])).rows,

  alertaEstoque: async () => (await query(
    `SELECT id, nome, sku, estoque, imagem FROM produtos
      WHERE ativo AND estoque <= 5 ORDER BY estoque ASC LIMIT 5`)).rows,
};
