import { query } from '../../db/pool.js';

export const atendimentosRepository = {
  async listar({ status, canal, page, limit }) {
    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`a.status = $${params.length}`); }
    if (canal)  { params.push(canal);  where.push(`a.canal = $${params.length}`); }
    const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, (page - 1) * limit);

    const { rows } = await query(
      `SELECT a.*, c.nome AS cliente_nome,
              jsonb_array_length(a.transcript) AS mensagens,
              COUNT(*) OVER() AS _total
         FROM atendimentos a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         ${clausula}
        ORDER BY a.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

    return { items: rows.map(({ _total, ...a }) => a), total: rows[0]?._total ?? 0 };
  },

  async buscarPorId(id) {
    const { rows } = await query(
      `SELECT a.*, c.nome AS cliente_nome
         FROM atendimentos a
         LEFT JOIN clientes c ON c.id = a.cliente_id
        WHERE a.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async criar({ protocolo, canal, cliente_id = null }) {
    const { rows } = await query(
      `INSERT INTO atendimentos (protocolo, canal, cliente_id) VALUES ($1, $2, $3) RETURNING *`,
      [protocolo, canal, cliente_id]);
    return rows[0];
  },

  /** Anexa mensagens ao transcript de forma atômica (jsonb ||). */
  async registrar(id, { no_atual, status, mensagens, cliente_id }) {
    const { rows } = await query(
      `UPDATE atendimentos
          SET transcript = transcript || $2::jsonb,
              no_atual   = COALESCE($3, no_atual),
              status     = COALESCE($4, status),
              cliente_id = COALESCE($5, cliente_id)
        WHERE id = $1
      RETURNING *`,
      [id, JSON.stringify(mensagens), no_atual ?? null, status ?? null, cliente_id ?? null]);
    return rows[0] ?? null;
  },

  async proximoProtocolo() {
    const { rows } = await query(
      `SELECT 'AT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
              LPAD((COUNT(*) + 1)::text, 4, '0') AS protocolo
         FROM atendimentos WHERE created_at::date = CURRENT_DATE`);
    return rows[0].protocolo;
  },

  // --- consultas usadas pelas ações do fluxo ---------------------------
  async pedidoPorNumero(numero) {
    const { rows } = await query(
      `SELECT numero, status, canal, total, created_at, cliente_nome, qtd_pecas
         FROM vw_pedidos_detalhados WHERE numero = $1`, [numero]);
    return rows[0] ?? null;
  },

  async clientePorCpf(cpf) {
    const { rows } = await query(
      `SELECT id, nome, email, cidade, uf, status, total_pedidos, total_gasto
         FROM vw_clientes_resumo WHERE cpf = $1`, [cpf]);
    return rows[0] ?? null;
  },

  async ofertas(limite = 3) {
    const { rows } = await query(
      `SELECT nome, preco, imagem, categoria FROM produtos
        WHERE ativo AND estoque > 0 ORDER BY preco ASC LIMIT $1`, [limite]);
    return rows;
  },

  async estatisticas() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'resolvido')::int    AS resolvidos,
              COUNT(*) FILTER (WHERE status = 'transferido')::int  AS transferidos,
              COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS em_andamento,
              COALESCE(ROUND(AVG(jsonb_array_length(transcript)), 1), 0) AS media_interacoes
         FROM atendimentos`);
    return rows[0];
  },
};
