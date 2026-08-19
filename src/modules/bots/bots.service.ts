import { botsRepository, type Bot, type BotVersao } from './bots.repository';
import { validarFluxo } from '@/chatbot/motor';
import { Conflito, NaoEncontrado, NaoProcessavel } from '@/lib/erros';
import { FLUXO_VAZIO, type Fluxo } from '@/chatbot/tipos';
import type { EntradaBot } from './bots.schema';

export const botsService = {
  listar: () => botsRepository.listar(),

  async obter(id: string): Promise<Bot> {
    const bot = await botsRepository.buscarPorId(id);
    if (!bot) throw NaoEncontrado('Bot');
    return bot;
  },

  /** Criar um bot já cria a versão 1 em rascunho, pronta para editar. */
  async criar(dados: EntradaBot, criadoPor: string | null): Promise<Bot> {
    const bot = await botsRepository.criar(dados.nome, dados.descricao ?? null, criadoPor);
    await botsRepository.criarVersao(bot.id, FLUXO_VAZIO, criadoPor);
    return bot;
  },

  async atualizar(id: string, dados: EntradaBot): Promise<Bot> {
    await botsService.obter(id);
    const atualizado = await botsRepository.atualizar(id, dados.nome, dados.descricao ?? null);
    if (!atualizado) throw NaoEncontrado('Bot');
    return atualizado;
  },

  async remover(id: string): Promise<void> {
    const bot = await botsService.obter(id);
    if (bot.ativo_na_loja) {
      throw Conflito('Este bot está atendendo a loja. Ative outro antes de excluí-lo.');
    }
    await botsRepository.remover(id);
  },

  versoes: (botId: string) => botsRepository.versoes(botId),

  /** Rascunho em que o editor trabalha; cria um se não houver. */
  async rascunho(botId: string, criadoPor: string | null): Promise<BotVersao> {
    await botsService.obter(botId);
    const existente = await botsRepository.rascunhoAtual(botId);
    if (existente) return existente;
    return botsRepository.criarVersao(botId, FLUXO_VAZIO, criadoPor);
  },

  async salvar(versaoId: string, fluxo: Fluxo): Promise<BotVersao> {
    const salvo = await botsRepository.salvarFluxo(versaoId, fluxo);
    if (!salvo) {
      throw Conflito('Só é possível editar uma versão em rascunho. Versões publicadas são imutáveis.');
    }
    return salvo;
  },

  /**
   * Publica o rascunho — mas só depois de validar o grafo. Recusar aqui
   * é muito melhor que quebrar com um cliente conversando.
   */
  async publicar(botId: string, versaoId: string): Promise<BotVersao> {
    const versao = await botsRepository.versaoPorId(versaoId);
    if (!versao || versao.bot_id !== botId) throw NaoEncontrado('Versão');
    if (versao.status !== 'rascunho') throw Conflito('Esta versão já foi publicada ou arquivada.');

    const problemas = validarFluxo(versao.fluxo);
    if (problemas.length > 0) {
      throw NaoProcessavel(
        'O fluxo tem problemas que impedem a publicação',
        problemas.map((problema) => ({ campo: problema.noId ?? 'fluxo', mensagem: problema.mensagem })),
      );
    }

    const publicada = await botsRepository.publicar(versaoId, botId);
    await botsRepository.definirAtivoNaLoja(botId);
    return publicada;
  },

  validar: (fluxo: Fluxo) => validarFluxo(fluxo),

  publicadaDaLoja: () => botsRepository.publicadaDaLoja(),
};
