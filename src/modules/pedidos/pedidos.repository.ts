import type { PoolClient } from 'pg';
import { consultar, consultarUm, executar } from '@/lib/db';
import type { ItemPedido, Pedido, PedidoDetalhado } from './pedidos.types';
import type { EntradaPedido, FiltrosPedido } from './pedidos.schema';

/** Erros internos do fluxo de venda, traduzidos pelo service. */
export class ProdutoIndisponivel extends Error {
  constructor(readonly motivo: 'inexistente' | 'inativo', readonly nome?: string) {
    super(`PRODUTO_${motivo.toUpperCase()}`);
  }
}

export const pedidosRepository = {
  async listar(filtros: FiltrosPedido): Promise<{ itens: Pedido[]; total: number }> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtros.busca) {
      parametros.push(`%${filtros.busca}%`);
      condicoes.push(`(unaccent(cliente_nome) ILIKE unaccent($${parametros.length})
                       OR numero::text ILIKE $${parametros.length})`);
    }
    for (const [coluna, valor] of [
      ['status', filtros.status], ['canal', filtros.canal], ['cliente_id', filtros.cliente_id],
    ] as const) {
      if (valor) {
        parametros.push(valor);
        condicoes.push(`${coluna} = $${parametros.length}`);
      }
    }

    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    parametros.push(filtros.limite, (filtros.pagina - 1) * filtros.limite);

    const linhas = await consultar<Pedido & { _total: number }>(
      `SELECT *, COUNT(*) OVER() AS _total
         FROM vw_pedidos_detalhados ${onde}
        ORDER BY created_at DESC
        LIMIT $${parametros.length - 1} OFFSET $${parametros.length}`,
      parametros,
    );

    return {
      itens: linhas.map(({ _total, ...pedido }) => pedido),
      total: linhas[0]?._total ?? 0,
    };
  },

  async buscarPorId(id: string): Promise<PedidoDetalhado | null> {
    const pedido = await consultarUm<Pedido>(
      'SELECT * FROM vw_pedidos_detalhados WHERE id = $1', [id],
    );
    if (!pedido) return null;

    const itens = await consultar<ItemPedido>(
      `SELECT i.id, i.produto_id, i.quantidade, i.preco_unitario, i.subtotal,
              p.nome AS produto_nome, p.sku, p.imagem, p.categoria
         FROM pedido_itens i
         JOIN produtos p ON p.id = i.produto_id
        WHERE i.pedido_id = $1
        ORDER BY p.nome`,
      [id],
    );

    return { ...pedido, itens };
  },

  /**
   * Cria pedido + itens + baixa de estoque na MESMA transação.
   *
   * Recebe o client da transação (e não usa o pool) porque todas as
   * queries precisam correr na mesma conexão — caso contrário o
   * BEGIN/COMMIT não as envolveria e a atomicidade seria ilusória.
   */
  async criarComItens(client: PoolClient, dados: EntradaPedido): Promise<string> {
    const { rows: [pedido] } = await client.query<{ id: string }>(
      `INSERT INTO pedidos (cliente_id, canal, observacao)
       VALUES ($1, $2, $3) RETURNING id`,
      [dados.cliente_id, dados.canal, dados.observacao ?? null],
    );
    if (!pedido) throw new Error('Falha ao criar pedido');

    for (const item of dados.itens) {
      // FOR UPDATE trava a linha do produto até o fim da transação:
      // duas compras simultâneas do último item não podem ambas passar.
      const { rows: [produto] } = await client.query<{
        id: string; preco: number; ativo: boolean; nome: string;
      }>(
        'SELECT id, preco, ativo, nome FROM produtos WHERE id = $1 FOR UPDATE',
        [item.produto_id],
      );

      if (!produto) throw new ProdutoIndisponivel('inexistente');
      if (!produto.ativo) throw new ProdutoIndisponivel('inativo', produto.nome);

      // Função no banco: lança exceção se não houver saldo, abortando tudo.
      await client.query('SELECT baixar_estoque($1, $2)', [item.produto_id, item.quantidade]);

      await client.query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (pedido_id, produto_id)
         DO UPDATE SET quantidade = pedido_itens.quantidade + EXCLUDED.quantidade`,
        [pedido.id, item.produto_id, item.quantidade, produto.preco],
      );
    }

    return pedido.id;
  },

  async atualizarStatus(client: PoolClient, id: string, status: string): Promise<void> {
    await client.query('UPDATE pedidos SET status = $2 WHERE id = $1', [id, status]);
  },

  /** Cancelamento devolve as unidades ao estoque. */
  async devolverEstoque(client: PoolClient, pedidoId: string): Promise<void> {
    await client.query(
      `UPDATE produtos p
          SET estoque = p.estoque + i.quantidade
         FROM pedido_itens i
        WHERE i.pedido_id = $1 AND i.produto_id = p.id`,
      [pedidoId],
    );
  },

  async remover(id: string): Promise<boolean> {
    return (await executar('DELETE FROM pedidos WHERE id = $1', [id])) > 0;
  },
};
