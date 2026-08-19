import { transaction } from '../../db/pool.js';
import { pedidosRepository } from './pedidos.repository.js';
import { clientesRepository } from '../clientes/clientes.repository.js';
import { NotFound, Conflict, Unprocessable } from '../../shared/errors.js';
import { TRANSICOES } from './pedidos.schema.js';

export const pedidosService = {
  listar: (filtros) => pedidosRepository.listar(filtros),

  async obter(id) {
    const pedido = await pedidosRepository.buscarPorId(id);
    if (!pedido) throw NotFound('Pedido');
    return pedido;
  },

  /**
   * Fluxo de venda. Tudo roda numa transação: se o estoque de um item
   * acabar no meio do caminho, nada é gravado — nem pedido, nem baixas.
   */
  async criar(dados) {
    const cliente = await clientesRepository.buscarPorId(dados.cliente_id);
    if (!cliente) throw Unprocessable('Cliente informado não existe');
    if (cliente.status === 'inativo') throw Conflict('Cliente inativo não pode gerar pedidos');

    const duplicados = dados.itens.length !== new Set(dados.itens.map((i) => i.produto_id)).size;
    if (duplicados) throw Unprocessable('Há produtos repetidos na lista de itens');

    const id = await transaction(async (client) => {
      try {
        return await pedidosRepository.criarComItens(client, dados);
      } catch (err) {
        if (err.message === 'PRODUTO_INEXISTENTE') throw Unprocessable('Um dos produtos não existe');
        if (err.message === 'PRODUTO_INATIVO') throw Conflict(`Produto "${err.nome}" está inativo`);
        throw err;
      }
    });

    return pedidosService.obter(id);
  },

  async alterarStatus(id, novoStatus) {
    const pedido = await pedidosService.obter(id);
    if (pedido.status === novoStatus) return pedido;

    const permitidos = TRANSICOES[pedido.status] ?? [];
    if (!permitidos.includes(novoStatus)) {
      throw Conflict(
        `Transição inválida: "${pedido.status}" → "${novoStatus}". ` +
        (permitidos.length ? `Permitido: ${permitidos.join(', ')}.` : 'Este pedido está finalizado.'));
    }

    return transaction(async (client) => {
      if (novoStatus === 'cancelado') await pedidosRepository.devolverEstoque(client, id);
      await client.query('UPDATE pedidos SET status = $2 WHERE id = $1', [id, novoStatus]);
      return pedidosRepository.buscarPorId(id);
    });
  },

  async remover(id) {
    const pedido = await pedidosService.obter(id);
    if (!['cancelado', 'rascunho'].includes(pedido.status)) {
      throw Conflict('Só é possível excluir pedidos cancelados ou em rascunho');
    }
    await pedidosRepository.remover(id);
  },
};
