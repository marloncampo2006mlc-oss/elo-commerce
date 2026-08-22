import { consultar, consultarUm } from '@/lib/db';
import {
  atendimentoRepository, type Atendimento, type EsperaNaFila, type Mensagem,
} from './atendimento.repository';
import { botsRepository } from '@/modules/bots/bots.repository';
import { acharNoInicial, executarTurno } from '@/chatbot/motor';
import { Conflito, NaoEncontrado, NaoProcessavel } from '@/lib/erros';
import type { DependenciasExecutor, Fluxo } from '@/chatbot/tipos';

/**
 * Dependências reais do motor: é o único ponto onde os blocos do
 * chatbot alcançam o banco. Mantê-las aqui deixa o motor testável com
 * implementações falsas, sem nenhuma infraestrutura.
 */
const dependenciasReais: DependenciasExecutor = {
  async buscarProdutos(termo, limite) {
    if (!termo) {
      return consultar(
        `SELECT nome, preco, categoria FROM produtos
          WHERE ativo AND estoque > 0 ORDER BY preco ASC LIMIT $1`, [limite]);
    }
    return consultar(
      `SELECT nome, preco, categoria FROM produtos
        WHERE ativo AND estoque > 0
          AND (unaccent(nome) ILIKE unaccent($1) OR unaccent(categoria) ILIKE unaccent($1))
        ORDER BY preco ASC LIMIT $2`,
      [`%${termo}%`, limite]);
  },

  async consultarPedido(numero) {
    const linha = await consultarUm<{
      numero: number; status: string; total: number; created_at: Date; cliente_nome: string;
    }>(
      `SELECT numero, status, total, created_at, cliente_nome
         FROM vw_pedidos_detalhados WHERE numero = $1`, [numero]);

    return linha
      ? { numero: linha.numero, status: linha.status, total: linha.total,
          criadoEm: linha.created_at, clienteNome: linha.cliente_nome }
      : null;
  },
};

export interface ConversaCompleta {
  atendimento: Atendimento;
  mensagens: Mensagem[];
  digitando: { cliente: boolean; atendente: boolean };
  /**
   * Preenchido só enquanto a conversa espera na fila. É o que permite
   * dizer ao cliente onde ele está, em vez do genérico "aguarde" — a
   * espera sem informação é o que faz a pessoa desistir.
   */
  fila: EsperaNaFila | null;
}

export const atendimentoService = {
  /**
   * Abre uma conversa. `versaoId` é usado pelo modo Testar do No-Code;
   * sem ele, usa a versão publicada do bot ativo na loja.
   *
   * O atendimento guarda a versão que o atendeu: publicar uma v2 no meio
   * de uma conversa não muda o fluxo de quem já está conversando.
   */
  async iniciar(opcoes: {
    canal?: string; clienteId?: string | null; versaoId?: string | null; teste?: boolean;
    /** Conversa que esta pessoa tinha aberta antes — será abandonada. */
    anteriorId?: string | null;
  } = {}): Promise<ConversaCompleta> {
    /**
     * Fecha a conversa anterior ANTES de abrir a nova.
     *
     * Sem isso, cada reinício deixava um "Visitante" órfão na fila, e a
     * lista virava um monte de conversas idênticas das quais só a última
     * tinha alguém do outro lado.
     *
     * O id vem do navegador, que é quem sabe qual conversa aquela pessoa
     * tinha — visitante anônimo não tem cadastro para o servidor
     * consultar. Não é uma credencial: abandonar só interrompe uma
     * conversa que já estava sem dono, e no pior caso alguém encerra a
     * própria sessão.
     */
    if (opcoes.anteriorId) {
      await atendimentoRepository.abandonar(opcoes.anteriorId).catch(() => {
        // Id inválido ou já encerrado não pode impedir a conversa nova:
        // a pessoa está tentando falar com a loja agora.
      });
    }

    const versao = opcoes.versaoId
      ? await botsRepository.versaoPorId(opcoes.versaoId)
      : await botsRepository.publicadaDaLoja();

    if (!versao) {
      throw NaoProcessavel(
        'Nenhum chatbot publicado. Crie um fluxo no No-Code e publique para ativar o atendimento.');
    }

    const fluxo = versao.fluxo as Fluxo;
    const inicial = acharNoInicial(fluxo);

    const atendimento = await atendimentoRepository.criar({
      canal: opcoes.canal ?? 'chatbot',
      botVersaoId: versao.id,
      clienteId: opcoes.clienteId ?? null,
      teste: opcoes.teste ?? false,
      noAtual: inicial?.id ?? null,
    });

    // Roda o primeiro turno sem entrada: apresenta a saudação e o menu.
    const turno = await executarTurno({
      fluxo, noAtual: inicial?.id ?? null, entrada: null, contexto: {}, deps: dependenciasReais,
    });

    await atendimentoRepository.registrarTurno({
      atendimentoId: atendimento.id,
      entradaCliente: null,
      falas: turno.falas,
      noAtual: turno.noAtual,
      contexto: turno.contexto,
      status: turno.desfecho === 'transferir' ? 'aguardando_atendente'
            : turno.desfecho === 'finalizar' ? 'finalizado' : 'em_andamento',
      entrouFila: turno.desfecho === 'transferir',
      finalizou: turno.desfecho === 'finalizar',
    });

    return atendimentoService.obter(atendimento.id);
  },

  async obter(id: string): Promise<ConversaCompleta> {
    const atendimento = await atendimentoRepository.buscarPorId(id);
    if (!atendimento) throw NaoEncontrado('Atendimento');

    // A consulta da fila só acontece para quem está esperando: quem já
    // foi assumido não tem posição, e cobrar o banco por isso a cada
    // consulta do widget seria desperdício num caminho muito chamado.
    const [mensagens, fila] = await Promise.all([
      atendimentoRepository.mensagens(id),
      atendimento.status === 'aguardando_atendente'
        ? atendimentoRepository.esperaNaFila(id)
        : Promise.resolve(null),
    ]);

    const agora = Date.now();
    return {
      atendimento,
      mensagens,
      fila,
      digitando: {
        cliente: Boolean(atendimento.cliente_digitando_ate
          && new Date(atendimento.cliente_digitando_ate).getTime() > agora),
        atendente: Boolean(atendimento.atendente_digitando_ate
          && new Date(atendimento.atendente_digitando_ate).getTime() > agora),
      },
    };
  },

  /** Um turno da conversa com o bot. */
  async responder(id: string, entrada: string): Promise<ConversaCompleta> {
    const { atendimento } = await atendimentoService.obter(id);

    if (atendimento.status === 'em_atendimento' || atendimento.status === 'aguardando_atendente') {
      // Já saiu do bot: a fala vai direto para o histórico, sem motor.
      await atendimentoRepository.registrarTurno({
        atendimentoId: id,
        entradaCliente: entrada,
        falas: [],
        noAtual: atendimento.no_atual,
        contexto: atendimento.contexto,
        status: atendimento.status,
        entrouFila: false,
        finalizou: false,
      });
      return atendimentoService.obter(id);
    }

    if (!['em_andamento'].includes(atendimento.status)) {
      throw Conflito('Este atendimento já foi encerrado. Inicie uma nova conversa.');
    }

    const versao = atendimento.bot_versao_id
      ? await botsRepository.versaoPorId(atendimento.bot_versao_id)
      : null;
    if (!versao) throw NaoProcessavel('O fluxo deste atendimento não está mais disponível.');

    const turno = await executarTurno({
      fluxo: versao.fluxo as Fluxo,
      noAtual: atendimento.no_atual,
      entrada,
      contexto: atendimento.contexto,
      deps: dependenciasReais,
    });

    await atendimentoRepository.registrarTurno({
      atendimentoId: id,
      entradaCliente: entrada,
      falas: turno.falas,
      noAtual: turno.noAtual,
      contexto: turno.contexto,
      status: turno.desfecho === 'transferir' ? 'aguardando_atendente'
            : turno.desfecho === 'finalizar' ? 'finalizado' : 'em_andamento',
      entrouFila: turno.desfecho === 'transferir',
      finalizou: turno.desfecho === 'finalizar',
    });

    return atendimentoService.obter(id);
  },

  fila: () => atendimentoRepository.fila(),
  historico: (limite?: number) => atendimentoRepository.historico(limite),
  eventos: (id: string) => atendimentoRepository.eventos(id),

  async assumir(id: string, atendenteId: string, nome: string): Promise<ConversaCompleta> {
    const assumiu = await atendimentoRepository.assumir(id, atendenteId, nome);
    if (!assumiu) {
      throw Conflito('Esta conversa já foi assumida por outro atendente ou saiu da fila.');
    }
    return atendimentoService.obter(id);
  },

  async responderComoAtendente(id: string, atendenteId: string, texto: string): Promise<ConversaCompleta> {
    const { atendimento } = await atendimentoService.obter(id);
    if (atendimento.status !== 'em_atendimento') {
      throw Conflito('Assuma o atendimento antes de responder.');
    }
    if (atendimento.atendente_id !== atendenteId) {
      throw Conflito('Esta conversa está com outro atendente.');
    }
    await atendimentoRepository.responderComoAtendente(id, atendenteId, texto);
    return atendimentoService.obter(id);
  },

  async marcarDigitacaoCliente(id: string, digitando: boolean): Promise<void> {
    const atendimento = await atendimentoRepository.buscarPorId(id);
    if (!atendimento) throw NaoEncontrado('Atendimento');
    await atendimentoRepository.marcarDigitacao(id, 'cliente', digitando);
  },

  async marcarDigitacaoAtendente(
    id: string, atendenteId: string, digitando: boolean,
  ): Promise<void> {
    const atendimento = await atendimentoRepository.buscarPorId(id);
    if (!atendimento) throw NaoEncontrado('Atendimento');
    if (atendimento.status !== 'em_atendimento' || atendimento.atendente_id !== atendenteId) {
      throw Conflito('Esta conversa não está em atendimento com você.');
    }
    await atendimentoRepository.marcarDigitacao(id, 'atendente', digitando);
  },

  async finalizar(id: string, atendenteId: string, nome: string): Promise<ConversaCompleta> {
    const { atendimento } = await atendimentoService.obter(id);
    if (atendimento.status === 'finalizado') return atendimentoService.obter(id);
    await atendimentoRepository.finalizar(id, atendenteId, nome);
    return atendimentoService.obter(id);
  },

  /**
   * O cliente encerra a própria conversa, do widget da loja.
   *
   * Idempotente: um segundo clique — ou um duplo envio da rede — não
   * gera um segundo "você encerrou o atendimento" no histórico.
   */
  async encerrarComoCliente(id: string): Promise<ConversaCompleta> {
    const { atendimento } = await atendimentoService.obter(id);
    if (atendimento.status === 'finalizado') return atendimentoService.obter(id);
    await atendimentoRepository.finalizarComoCliente(id);
    return atendimentoService.obter(id);
  },
};
