import { consultar, consultarUm, executar } from '@/lib/db';
import type { Cliente, ClienteResumo } from './clientes.types';
import type { FiltrosCliente } from './clientes.schema';

const CAMPOS = ['nome', 'email', 'cpf', 'telefone', 'data_nascimento',
                'cidade', 'uf', 'status', 'observacoes'] as const;
type CampoCliente = (typeof CAMPOS)[number];

export const clientesRepository = {
  async listar(filtros: FiltrosCliente): Promise<{ itens: ClienteResumo[]; total: number }> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtros.busca) {
      parametros.push(`%${filtros.busca}%`);
      condicoes.push(`(unaccent(nome) ILIKE unaccent($${parametros.length})
                       OR email ILIKE $${parametros.length}
                       OR cpf LIKE $${parametros.length})`);
    }
    if (filtros.status) {
      parametros.push(filtros.status);
      condicoes.push(`status = $${parametros.length}`);
    }
    if (filtros.uf) {
      parametros.push(filtros.uf);
      condicoes.push(`uf = $${parametros.length}`);
    }

    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const ordenacao = {
      nome: 'nome ASC',
      recentes: 'created_at DESC',
      gasto: 'total_gasto DESC NULLS LAST',
    }[filtros.ordem];

    parametros.push(filtros.limite, (filtros.pagina - 1) * filtros.limite);

    const linhas = await consultar<ClienteResumo & { _total: number }>(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM vw_clientes_resumo ${onde}
        ORDER BY ${ordenacao}
        LIMIT $${parametros.length - 1} OFFSET $${parametros.length}`,
      parametros,
    );

    return {
      itens: linhas.map(({ _total, ...cliente }) => cliente),
      total: linhas[0]?._total ?? 0,
    };
  },

  buscarPorId(id: string): Promise<ClienteResumo | null> {
    return consultarUm<ClienteResumo>('SELECT * FROM vw_clientes_resumo WHERE id = $1', [id]);
  },

  async criar(dados: Partial<Record<CampoCliente, unknown>>): Promise<Cliente> {
    const valores = CAMPOS.map((campo) => dados[campo] ?? null);
    const marcadores = CAMPOS.map((_, indice) => `$${indice + 1}`).join(', ');
    const criado = await consultarUm<Cliente>(
      `INSERT INTO clientes (${CAMPOS.join(', ')}) VALUES (${marcadores}) RETURNING *`,
      valores,
    );
    if (!criado) throw new Error('Falha ao inserir cliente');
    return criado;
  },

  async atualizar(id: string, dados: Partial<Record<CampoCliente, unknown>>): Promise<Cliente | null> {
    const campos = CAMPOS.filter((campo) => campo in dados);
    if (campos.length === 0) return consultarUm<Cliente>('SELECT * FROM clientes WHERE id = $1', [id]);

    const atribuicoes = campos.map((campo, indice) => `${campo} = $${indice + 2}`).join(', ');
    return consultarUm<Cliente>(
      `UPDATE clientes SET ${atribuicoes} WHERE id = $1 RETURNING *`,
      [id, ...campos.map((campo) => dados[campo])],
    );
  },

  async remover(id: string): Promise<boolean> {
    return (await executar('DELETE FROM clientes WHERE id = $1', [id])) > 0;
  },

  async contarPedidos(id: string): Promise<number> {
    const linha = await consultarUm<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM pedidos WHERE cliente_id = $1', [id],
    );
    return linha?.total ?? 0;
  },
};
