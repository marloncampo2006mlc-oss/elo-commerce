import { clientesRepository } from './clientes.repository';
import { Conflito, NaoEncontrado } from '@/lib/erros';
import type { Pagina } from '@/modules/catalogo/catalogo.types';
import type { Cliente, ClienteResumo } from './clientes.types';
import type { EntradaCliente, FiltrosCliente } from './clientes.schema';

export const clientesService = {
  async listar(filtros: FiltrosCliente): Promise<Pagina<ClienteResumo>> {
    const { itens, total } = await clientesRepository.listar(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
      paginas: Math.max(1, Math.ceil(total / filtros.limite)),
    };
  },

  async obter(id: string): Promise<ClienteResumo> {
    const cliente = await clientesRepository.buscarPorId(id);
    if (!cliente) throw NaoEncontrado('Cliente');
    return cliente;
  },

  criar(dados: EntradaCliente): Promise<Cliente> {
    return clientesRepository.criar(dados);
  },

  async atualizar(id: string, dados: Partial<EntradaCliente>): Promise<Cliente> {
    await clientesService.obter(id);
    const atualizado = await clientesRepository.atualizar(id, dados);
    if (!atualizado) throw NaoEncontrado('Cliente');
    return atualizado;
  },

  /** Cliente com pedidos não é excluído: inativar preserva o histórico. */
  async remover(id: string): Promise<void> {
    await clientesService.obter(id);
    const pedidos = await clientesRepository.contarPedidos(id);
    if (pedidos > 0) {
      throw Conflito(
        `Cliente possui ${pedidos} pedido(s) registrado(s). Inative o cadastro em vez de excluí-lo.`,
      );
    }
    await clientesRepository.remover(id);
  },
};
