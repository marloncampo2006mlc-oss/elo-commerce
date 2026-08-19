import { query } from '../../db/pool.js';

const CAMPOS = ['nome','email','cpf','telefone','data_nascimento','cidade','uf','status','observacoes'];

/**
 * Camada de acesso a dados: só aqui existe SQL. Todas as queries são
 * parametrizadas ($1, $2...) — sem concatenação de entrada do usuário.
 */
export const clientesRepository = {
  async listar({ busca, status, uf, ordem, page, limit }) {
    const where = [];
    const params = [];

    if (busca) {
      params.push(`%${busca}%`);
      where.push(`(unaccent(nome) ILIKE unaccent($${params.length})
                   OR email ILIKE $${params.length}
                   OR cpf LIKE $${params.length})`);
    }
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    if (uf)     { params.push(uf);     where.push(`uf = $${params.length}`); }

    const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const ordenacao = {
      nome: 'nome ASC',
      recentes: 'created_at DESC',
      gasto: 'total_gasto DESC NULLS LAST',
    }[ordem] ?? 'created_at DESC';

    params.push(limit, (page - 1) * limit);

    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM vw_clientes_resumo
         ${clausula}
        ORDER BY ${ordenacao}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows.map(({ _total, ...c }) => c), total: rows[0]?._total ?? 0 };
  },

  async buscarPorId(id) {
    const { rows } = await query('SELECT * FROM vw_clientes_resumo WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async buscarPorCpf(cpf) {
    const { rows } = await query('SELECT id FROM clientes WHERE cpf = $1', [cpf]);
    return rows[0] ?? null;
  },

  async criar(dados) {
    const valores = CAMPOS.map((c) => dados[c] ?? null);
    const placeholders = CAMPOS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO clientes (${CAMPOS.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      valores,
    );
    return rows[0];
  },

  async atualizar(id, dados) {
    const campos = CAMPOS.filter((c) => c in dados);
    if (campos.length === 0) return this.buscarPorId(id);

    const sets = campos.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const { rows } = await query(
      `UPDATE clientes SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...campos.map((c) => dados[c])],
    );
    return rows[0] ?? null;
  },

  async remover(id) {
    const { rowCount } = await query('DELETE FROM clientes WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async contarPedidos(id) {
    const { rows } = await query('SELECT COUNT(*)::int AS total FROM pedidos WHERE cliente_id = $1', [id]);
    return rows[0].total;
  },

  async ufsDisponiveis() {
    const { rows } = await query(
      "SELECT uf, COUNT(*)::int AS total FROM clientes WHERE uf IS NOT NULL GROUP BY uf ORDER BY uf");
    return rows;
  },
};
