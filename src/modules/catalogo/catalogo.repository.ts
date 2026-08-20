import { consultar, consultarUm, executar } from '@/lib/db';
import type { CategoriaResumo, Produto } from './catalogo.types';
import type { FiltrosProduto } from './catalogo.schema';

const CAMPOS = ['sku', 'nome', 'descricao', 'categoria', 'preco', 'estoque', 'ativo', 'imagem'] as const;
type CampoProduto = (typeof CAMPOS)[number];

/**
 * Único lugar do módulo com SQL. Toda query é parametrizada ($1, $2…) —
 * nunca há concatenação de entrada do usuário, o que elimina a
 * superfície de SQL injection.
 */
export const catalogoRepository = {
  async listar(filtros: FiltrosProduto): Promise<{ itens: Produto[]; total: number }> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtros.busca) {
      parametros.push(`%${filtros.busca}%`);
      condicoes.push(
        `(unaccent(nome) ILIKE unaccent($${parametros.length}) OR sku ILIKE $${parametros.length})`,
      );
    }
    if (filtros.categoria) {
      parametros.push(filtros.categoria);
      condicoes.push(`categoria = $${parametros.length}`);
    }
    if (filtros.ativo) {
      parametros.push(filtros.ativo === 'true');
      condicoes.push(`ativo = $${parametros.length}`);
    }
    if (filtros.emFalta === 'true') condicoes.push('estoque = 0');

    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    // Mapa fixo: a ordenação nunca vem crua do usuário para dentro do SQL.
    const ordenacao = {
      nome: 'nome ASC',
      preco_asc: 'preco ASC',
      preco_desc: 'preco DESC',
      estoque: 'estoque ASC',
      recentes: 'created_at DESC',
    }[filtros.ordem];

    parametros.push(filtros.limite, (filtros.pagina - 1) * filtros.limite);

    // COUNT(*) OVER() traz o total na mesma ida ao banco, sem query extra.
    const linhas = await consultar<Produto & { _total: number }>(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM produtos ${onde}
        ORDER BY ${ordenacao}
        LIMIT $${parametros.length - 1} OFFSET $${parametros.length}`,
      parametros,
    );

    return {
      itens: linhas.map(({ _total, ...produto }) => produto),
      total: linhas[0]?._total ?? 0,
    };
  },

  buscarPorId(id: string): Promise<Produto | null> {
    return consultarUm<Produto>('SELECT * FROM produtos WHERE id = $1', [id]);
  },

  async criar(dados: Partial<Record<CampoProduto, unknown>>): Promise<Produto> {
    const valores = CAMPOS.map((campo) => dados[campo] ?? null);
    const marcadores = CAMPOS.map((_, indice) => `$${indice + 1}`).join(', ');

    const criado = await consultarUm<Produto>(
      `INSERT INTO produtos (${CAMPOS.join(', ')}) VALUES (${marcadores}) RETURNING *`,
      valores,
    );
    if (!criado) throw new Error('Falha ao inserir produto');
    return criado;
  },

  async atualizar(id: string, dados: Partial<Record<CampoProduto, unknown>>): Promise<Produto | null> {
    const campos = CAMPOS.filter((campo) => campo in dados);
    if (campos.length === 0) return catalogoRepository.buscarPorId(id);

    const atribuicoes = campos.map((campo, indice) => `${campo} = $${indice + 2}`).join(', ');
    return consultarUm<Produto>(
      `UPDATE produtos SET ${atribuicoes} WHERE id = $1 RETURNING *`,
      [id, ...campos.map((campo) => dados[campo])],
    );
  },

  async remover(id: string): Promise<boolean> {
    return (await executar('DELETE FROM produtos WHERE id = $1', [id])) > 0;
  },

  /** Ajuste atômico: a condição impede que o estoque fique negativo. */
  ajustarEstoque(id: string, ajuste: number): Promise<Produto | null> {
    return consultarUm<Produto>(
      `UPDATE produtos SET estoque = estoque + $2
        WHERE id = $1 AND estoque + $2 >= 0
        RETURNING *`,
      [id, ajuste],
    );
  },

  categorias(): Promise<CategoriaResumo[]> {
    return consultar<CategoriaResumo>(
      `SELECT categoria, COUNT(*)::int AS total, COALESCE(SUM(estoque), 0)::int AS estoque
         FROM produtos GROUP BY categoria ORDER BY categoria`,
    );
  },

  async vendasDoProduto(id: string): Promise<number> {
    const linha = await consultarUm<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM pedido_itens WHERE produto_id = $1',
      [id],
    );
    return linha?.total ?? 0;
  },
};
