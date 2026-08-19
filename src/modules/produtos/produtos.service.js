import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { produtosRepository } from './produtos.repository.js';
import { NotFound, Conflict } from '../../shared/errors.js';

const PASTA_IMAGENS = join(dirname(fileURLToPath(import.meta.url)), '../../../public/assets/produtos');
const EXTENSOES = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

export const produtosService = {
  listar: (filtros) => produtosRepository.listar(filtros),

  async obter(id) {
    const produto = await produtosRepository.buscarPorId(id);
    if (!produto) throw NotFound('Produto');
    return produto;
  },

  criar: (dados) => produtosRepository.criar(dados),

  async atualizar(id, dados) {
    await produtosService.obter(id);
    return produtosRepository.atualizar(id, dados);
  },

  async remover(id) {
    await produtosService.obter(id);
    const vendas = await produtosRepository.vendasDoProduto(id);
    if (vendas > 0) {
      throw Conflict(
        `Produto consta em ${vendas} pedido(s). Desative-o para tirá-lo da vitrine sem perder o histórico.`);
    }
    await produtosRepository.remover(id);
  },

  async ajustarEstoque(id, ajuste) {
    await produtosService.obter(id);
    const atualizado = await produtosRepository.ajustarEstoque(id, ajuste);
    if (!atualizado) throw Conflict('O ajuste deixaria o estoque negativo');
    return atualizado;
  },

  categorias: () => produtosRepository.categorias(),

  /**
   * Lê a pasta de imagens do catálogo. O formulário usa isso para
   * oferecer as opções já disponíveis — basta soltar um arquivo novo
   * em public/assets/produtos para ele aparecer, sem tocar no código.
   */
  async imagensDisponiveis() {
    try {
      const arquivos = await readdir(PASTA_IMAGENS);
      return arquivos
        .filter((a) => EXTENSOES.some((ext) => a.toLowerCase().endsWith(ext)))
        .sort()
        .map((a) => ({ arquivo: a, caminho: `/assets/produtos/${a}` }));
    } catch {
      return [];   // pasta ausente não é erro: o cadastro cai para emoji
    }
  },
};
