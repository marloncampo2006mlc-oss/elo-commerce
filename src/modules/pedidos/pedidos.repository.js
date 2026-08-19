import { query } from '../../db/pool.js';

export const pedidosRepository = {
  async listar({ busca, status, canal, cliente_id, page, limit }) {
    const where = [];
    const params = [];

    if (busca) {
      params.push(`%${busca}%`);
      where.push(`(unaccent(cliente_nome) ILIKE unaccent($${params.length})
                   OR numero::text ILIKE $${params.length})`);
    }
    if (status)     { params.push(status);     where.push(`status = $${params.length}`); }
    if (canal)      { params.push(canal);      where.push(`canal = $${params.length}`); }
    if (cliente_id) { params.push(cliente_id); where.push(`cliente_id = $${params.length}`); }

    const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, (page - 1) * limit);

    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM vw_pedidos_detalhados ${clausula}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

    return { items: rows.map(({ _total, ...p }) => p), total: rows[0]?._total ?? 0 };
  },

  async buscarPorId(id) {
    const { rows } = await query('SELECT * FROM vw_pedidos_detalhados WHERE id = $1', [id]);
    if (!rows[0]) return null;

    const { rows: itens } = await query(
      `SELECT i.id, i.produto_id, i.quantidade, i.preco_unitario, i.subtotal,
              p.nome AS produto_nome, p.sku, p.imagem, p.categoria
         FROM pedido_itens i
         JOIN produtos p ON p.id = i.produto_id
        WHERE i.pedido_id = $1
        ORDER BY p.nome`, [id]);

    return { ...rows[0], itens };
  },

  /** Cria pedido + itens + baixa de estoque numa única transação. */
  async criarComItens(client, { cliente_id, canal, observacao, itens }) {
    const { rows: [pedido] } = await client.query(
      `INSERT INTO pedidos (cliente_id, canal, observacao)
       VALUES ($1, $2, $3) RETURNING *`, [cliente_id, canal, observacao ?? null]);

    for (const item of itens) {
      // Trava a linha do produto até o fim da transação: sem corrida de estoque.
      const { rows: [produto] } = await client.query(
        'SELECT id, preco, estoque, ativo, nome FROM produtos WHERE id = $1 FOR UPDATE',
        [item.produto_id]);

      if (!produto) throw Object.assign(new Error('PRODUTO_INEXISTENTE'), { produto: item.produto_id });
      if (!produto.ativo) throw Object.assign(new Error('PRODUTO_INATIVO'), { nome: produto.nome });

      await client.query('SELECT baixar_estoque($1, $2)', [item.produto_id, item.quantidade]);
      await client.query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (pedido_id, produto_id)
         DO UPDATE SET quantidade = pedido_itens.quantidade + EXCLUDED.quantidade`,
        [pedido.id, item.produto_id, item.quantidade, produto.preco]);
    }
    return pedido.id;
  },

  async atualizarStatus(id, status) {
    const { rows } = await query(
      'UPDATE pedidos SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return rows[0] ?? null;
  },

  /** Cancelamento devolve as unidades ao estoque. */
  async devolverEstoque(client, pedidoId) {
    await client.query(
      `UPDATE produtos p
          SET estoque = p.estoque + i.quantidade
         FROM pedido_itens i
        WHERE i.pedido_id = $1 AND i.produto_id = p.id`, [pedidoId]);
  },

  async remover(id) {
    const { rowCount } = await query('DELETE FROM pedidos WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
