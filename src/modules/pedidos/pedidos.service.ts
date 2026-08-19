import { emTransacao } from '@/lib/db';
import { pedidosRepository, ProdutoIndisponivel } from './pedidos.repository';
import { clientesRepository } from '@/modules/clientes/clientes.repository';
import { Conflito, NaoEncontrado, NaoProcessavel } from '@/lib/erros';
import { TRANSICOES, type PedidoDetalhado, type StatusPedido } from './pedidos.types';
import type { Pagina } from '@/modules/catalogo/catalogo.types';
import type { EntradaPedido, FiltrosPedido } from './pedidos.schema';
import type { Pedido } from './pedidos.types';

export const pedidosService = {
  async listar(filtros: FiltrosPedido): Promise<Pagina<Pedido>> {
    const { itens, total } = await pedidosRepository.listar(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
      paginas: Math.max(1, Math.ceil(total / filtros.limite)),
    };
  },

  async obter(id: string): Promise<PedidoDetalhado> {
    const pedido = await pedidosRepository.buscarPorId(id);
    if (!pedido) throw NaoEncontrado('Pedido');
    return pedido;
  },

  /**
   * Fluxo de venda. Tudo dentro de uma transação: se o estoque de um
   * item acabar no meio do caminho, nada é gravado — nem pedido, nem
   * itens, nem baixas parciais.
   */
  async criar(dados: EntradaPedido): Promise<PedidoDetalhado> {
    const cliente = await clientesRepository.buscarPorId(dados.cliente_id);
    if (!cliente) throw NaoProcessavel('Cliente informado não existe');
    if (cliente.status === 'inativo') throw Conflito('Cliente inativo não pode gerar pedidos');

    const produtosUnicos = new Set(dados.itens.map((item) => item.produto_id));
    if (produtosUnicos.size !== dados.itens.length) {
      throw NaoProcessavel('Há produtos repetidos na lista de itens');
    }

    const id = await emTransacao(async (client) => {
      try {
        return await pedidosRepository.criarComItens(client, dados);
      } catch (erro) {
        if (erro instanceof ProdutoIndisponivel) {
          throw erro.motivo === 'inexistente'
            ? NaoProcessavel('Um dos produtos não existe')
            : Conflito(`Produto "${erro.nome}" está inativo`);
        }
        throw erro;
      }
    });

    return pedidosService.obter(id);
  },

  /** Só permite caminhos válidos da máquina de estados. */
  async alterarStatus(id: string, novoStatus: StatusPedido): Promise<PedidoDetalhado> {
    const pedido = await pedidosService.obter(id);
    if (pedido.status === novoStatus) return pedido;

    const permitidos = TRANSICOES[pedido.status];
    if (!permitidos.includes(novoStatus)) {
      throw Conflito(
        `Transição inválida: "${pedido.status}" → "${novoStatus}". ` +
        (permitidos.length ? `Permitido: ${permitidos.join(', ')}.` : 'Este pedido está finalizado.'),
      );
    }

    await emTransacao(async (client) => {
      if (novoStatus === 'cancelado') await pedidosRepository.devolverEstoque(client, id);
      await pedidosRepository.atualizarStatus(client, id, novoStatus);
    });

    return pedidosService.obter(id);
  },

  async remover(id: string): Promise<void> {
    const pedido = await pedidosService.obter(id);
    if (!['cancelado', 'rascunho'].includes(pedido.status)) {
      throw Conflito('Só é possível excluir pedidos cancelados ou em rascunho');
    }
    await pedidosRepository.remover(id);
  },
};
