import { query } from '../../db/pool.js';

const CAMPOS = ['sku','nome','descricao','categoria','preco','estoque','ativo','imagem'];

export const produtosRepository = {
  async listar({ busca, categoria, ativo, emFalta, ordem, page, limit }) {
    const where = [];
    const params = [];

    if (busca) {
      params.push(`%${busca}%`);
      where.push(`(unaccent(nome) ILIKE unaccent($${params.length}) OR sku ILIKE $${params.length})`);
    }
    if (categoria) { params.push(categoria); where.push(`categoria = $${params.length}`); }
    if (ativo)     { params.push(ativo === 'true'); where.push(`ativo = $${params.length}`); }
    if (emFalta === 'true') where.push('estoque = 0');

    const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const ordenacao = {
      nome: 'nome ASC',
      preco_asc: 'preco ASC',
      preco_desc: 'preco DESC',
      estoque: 'estoque ASC',
      recentes: 'created_at DESC',
    }[ordem] ?? 'created_at DESC';

    params.push(limit, (page - 1) * limit);

    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM produtos ${clausula}
        ORDER BY ${ordenacao}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(({ _total, ...p }) => p), total: rows[0]?._total ?? 0 };
  },

  async buscarPorId(id) {
    const { rows } = await query('SELECT * FROM produtos WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async criar(dados) {
    const valores = CAMPOS.map((c) => dados[c] ?? null);
    const { rows } = await query(
      `INSERT INTO produtos (${CAMPOS.join(', ')})
       VALUES (${CAMPOS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      valores,
    );
    return rows[0];
  },

  async atualizar(id, dados) {
    const campos = CAMPOS.filter((c) => c in dados);
    if (campos.length === 0) return this.buscarPorId(id);
    const sets = campos.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const { rows } = await query(`UPDATE produtos SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...campos.map((c) => dados[c])]);
    return rows[0] ?? null;
  },

  async remover(id) {
    const { rowCount } = await query('DELETE FROM produtos WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async ajustarEstoque(id, ajuste) {
    const { rows } = await query(
      `UPDATE produtos SET estoque = estoque + $2
        WHERE id = $1 AND estoque + $2 >= 0
        RETURNING *`, [id, ajuste]);
    return rows[0] ?? null;
  },

  async categorias() {
    const { rows } = await query(
      `SELECT categoria, COUNT(*)::int AS total, SUM(estoque)::int AS estoque
         FROM produtos GROUP BY categoria ORDER BY categoria`);
    return rows;
  },

  async vendasDoProduto(id) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total FROM pedido_itens WHERE produto_id = $1', [id]);
    return rows[0].total;
  },
};
