import { catalogoRepository } from './catalogo.repository';
import { Conflito, NaoEncontrado } from '@/lib/erros';
import type { CategoriaResumo, Pagina, Produto } from './catalogo.types';
import type { EntradaProduto, FiltrosProduto } from './catalogo.schema';

/**
 * Regras de negócio do catálogo. Não conhece HTTP (isso é do handler)
 * nem SQL (isso é do repositório).
 */
export const catalogoService = {
  async listar(filtros: FiltrosProduto): Promise<Pagina<Produto>> {
    const { itens, total } = await catalogoRepository.listar(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
      paginas: Math.max(1, Math.ceil(total / filtros.limite)),
    };
  },

  async obter(id: string): Promise<Produto> {
    const produto = await catalogoRepository.buscarPorId(id);
    if (!produto) throw NaoEncontrado('Produto');
    return produto;
  },

  criar(dados: EntradaProduto): Promise<Produto> {
    return catalogoRepository.criar(dados);
  },

  async atualizar(id: string, dados: Partial<EntradaProduto>): Promise<Produto> {
    await catalogoService.obter(id);          // garante 404 antes do UPDATE
    const atualizado = await catalogoRepository.atualizar(id, dados);
    if (!atualizado) throw NaoEncontrado('Produto');
    return atualizado;
  },

  /**
   * Produto já vendido não é excluído: apagá-lo quebraria o histórico de
   * pedidos. A saída correta é desativar, que o tira da vitrine sem
   * perder o passado.
   */
  async remover(id: string): Promise<void> {
    await catalogoService.obter(id);
    const vendas = await catalogoRepository.vendasDoProduto(id);
    if (vendas > 0) {
      throw Conflito(
        `Produto consta em ${vendas} pedido(s). Desative-o para tirá-lo da vitrine sem perder o histórico.`,
      );
    }
    await catalogoRepository.remover(id);
  },

  async ajustarEstoque(id: string, ajuste: number): Promise<Produto> {
    await catalogoService.obter(id);
    const atualizado = await catalogoRepository.ajustarEstoque(id, ajuste);
    if (!atualizado) throw Conflito('O ajuste deixaria o estoque negativo');
    return atualizado;
  },

  categorias(): Promise<CategoriaResumo[]> {
    return catalogoRepository.categorias();
  },

  /** Vitrine da loja: só produtos ativos e disponíveis. */
  async vitrine(filtros: FiltrosProduto): Promise<Pagina<Produto>> {
    const pagina = await catalogoService.listar({ ...filtros, ativo: 'true' });
    return { ...pagina, itens: pagina.itens.filter((produto) => produto.estoque > 0) };
  },
};
