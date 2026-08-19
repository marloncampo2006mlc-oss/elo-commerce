import { clientesRepository } from './clientes.repository.js';
import { NotFound, Conflict } from '../../shared/errors.js';

/**
 * Regras de negócio de clientes. O controller não conhece SQL e o
 * repositório não conhece HTTP — só esta camada conhece as duas.
 */
export const clientesService = {
  listar: (filtros) => clientesRepository.listar(filtros),

  async obter(id) {
    const cliente = await clientesRepository.buscarPorId(id);
    if (!cliente) throw NotFound('Cliente');
    return cliente;
  },

  criar: (dados) => clientesRepository.criar(dados),

  async atualizar(id, dados) {
    await clientesService.obter(id);           // garante 404 antes do UPDATE
    return clientesRepository.atualizar(id, dados);
  },

  async remover(id) {
    await clientesService.obter(id);
    const pedidos = await clientesRepository.contarPedidos(id);
    if (pedidos > 0) {
      throw Conflict(
        `Cliente possui ${pedidos} pedido(s) registrado(s). Inative o cadastro em vez de excluí-lo.`);
    }
    await clientesRepository.remover(id);
  },

  ufs: () => clientesRepository.ufsDisponiveis(),
};
