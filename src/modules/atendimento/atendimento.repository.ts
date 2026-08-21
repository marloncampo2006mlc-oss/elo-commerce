import type { PoolClient } from 'pg';
import { consultar, consultarUm, emTransacao, executar } from '@/lib/db';
import type { Contexto, Fala } from '@/chatbot/tipos';

export type StatusAtendimento =
  | 'em_andamento' | 'aguardando_atendente' | 'em_atendimento'
  | 'finalizado' | 'resolvido' | 'transferido' | 'abandonado';

export interface Atendimento {
  id: string;
  protocolo: string;
  cliente_id: string | null;
  canal: string;
  status: StatusAtendimento;
  no_atual: string | null;
  bot_versao_id: string | null;
  atendente_id: string | null;
  contexto: Contexto;
  teste: boolean;
  entrou_fila_em: Date | null;
  assumido_em: Date | null;
  finalizado_em: Date | null;
  created_at: Date;
}

export interface Mensagem {
  id: string;
  atendimento_id: string;
  autor: 'cliente' | 'bot' | 'atendente' | 'sistema';
  autor_id: string | null;
  conteudo: string;
  opcoes: Array<{ id: string; rotulo: string }> | null;
  created_at: Date;
}

export interface ItemFila extends Atendimento {
  cliente_nome: string | null;
  atendente_nome: string | null;
  total_mensagens: number;
  espera_segundos: number;
  /** 1 = próximo a ser atendido. null para quem já saiu da fila. */
  posicao_fila: number | null;
}

/** O que uma pessoa que espera precisa saber: onde está e há quanto tempo. */
export interface EsperaNaFila {
  posicao: number;
  espera_segundos: number;
  /** Quantos aguardam no total, para dar dimensão à posição. */
  total_na_fila: number;
}

export const atendimentoRepository = {
  async proximoProtocolo(): Promise<string> {
    const linha = await consultarUm<{ protocolo: string }>(
      `SELECT 'AT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
              LPAD((COUNT(*) + 1)::text, 4, '0') AS protocolo
         FROM atendimentos WHERE created_at::date = CURRENT_DATE`,
    );
    return linha?.protocolo ?? `AT-${Date.now()}`;
  },

  async criar(dados: {
    protocolo: string; canal: string; botVersaoId: string | null;
    clienteId: string | null; teste: boolean; noAtual: string | null;
  }): Promise<Atendimento> {
    const criado = await consultarUm<Atendimento>(
      `INSERT INTO atendimentos (protocolo, canal, bot_versao_id, cliente_id, teste, no_atual, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'em_andamento') RETURNING *`,
      [dados.protocolo, dados.canal, dados.botVersaoId, dados.clienteId, dados.teste, dados.noAtual],
    );
    if (!criado) throw new Error('Falha ao abrir atendimento');
    return criado;
  },

  buscarPorId(id: string): Promise<Atendimento | null> {
    return consultarUm<Atendimento>('SELECT * FROM atendimentos WHERE id = $1', [id]);
  },

  mensagens(atendimentoId: string): Promise<Mensagem[]> {
    return consultar<Mensagem>(
      `SELECT m.*, u.nome AS autor_nome
         FROM atendimento_mensagens m
         LEFT JOIN usuarios u ON u.id = m.autor_id
        WHERE m.atendimento_id = $1
        ORDER BY m.seq`,
      [atendimentoId],
    );
  },

  async gravarMensagem(
    client: PoolClient, atendimentoId: string,
    autor: Mensagem['autor'], conteudo: string,
    opcoes?: unknown, autorId?: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO atendimento_mensagens (atendimento_id, autor, conteudo, opcoes, autor_id)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [atendimentoId, autor, conteudo, opcoes ? JSON.stringify(opcoes) : null, autorId ?? null],
    );
  },

  async gravarEvento(
    client: PoolClient, atendimentoId: string,
    tipo: string, descricao: string, usuarioId?: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO atendimento_eventos (atendimento_id, tipo, descricao, usuario_id)
       VALUES ($1, $2, $3, $4)`,
      [atendimentoId, tipo, descricao, usuarioId ?? null],
    );
  },

  eventos(atendimentoId: string) {
    return consultar<{ id: string; tipo: string; descricao: string; created_at: Date }>(
      'SELECT id, tipo, descricao, created_at FROM atendimento_eventos WHERE atendimento_id = $1 ORDER BY created_at',
      [atendimentoId],
    );
  },

  /**
   * Persiste um turno inteiro numa transação: a fala do cliente, as
   * respostas do bot e o novo estado da conversa entram juntos ou não
   * entram — evita transcrição pela metade se algo falhar no meio.
   */
  registrarTurno(dados: {
    atendimentoId: string;
    entradaCliente: string | null;
    falas: Fala[];
    noAtual: string | null;
    contexto: Contexto;
    status: StatusAtendimento;
    entrouFila: boolean;
    finalizou: boolean;
  }): Promise<void> {
    return emTransacao(async (client) => {
      if (dados.entradaCliente !== null) {
        await atendimentoRepository.gravarMensagem(
          client, dados.atendimentoId, 'cliente', dados.entradaCliente);
      }

      for (const fala of dados.falas) {
        await atendimentoRepository.gravarMensagem(
          client, dados.atendimentoId, fala.autor, fala.texto, fala.opcoes);
      }

      await client.query(
        `UPDATE atendimentos
            SET no_atual = $2,
                contexto = $3::jsonb,
                status = $4,
                entrou_fila_em = CASE WHEN $5 THEN NOW() ELSE entrou_fila_em END,
                finalizado_em  = CASE WHEN $6 THEN NOW() ELSE finalizado_em  END
          WHERE id = $1`,
        [dados.atendimentoId, dados.noAtual, JSON.stringify(dados.contexto),
         dados.status, dados.entrouFila, dados.finalizou],
      );

      if (dados.entrouFila) {
        await atendimentoRepository.gravarEvento(
          client, dados.atendimentoId, 'transferencia',
          'Cliente solicitou atendimento humano — conversa entrou na fila');
      }
      if (dados.finalizou) {
        await atendimentoRepository.gravarEvento(
          client, dados.atendimentoId, 'finalizacao', 'Atendimento encerrado pelo fluxo');
      }
    });
  },

  /** Fila de espera, mais antigos primeiro — quem espera há mais tempo é atendido antes. */
  fila(): Promise<ItemFila[]> {
    return consultar<ItemFila>(
      `SELECT a.*, c.nome AS cliente_nome, u.nome AS atendente_nome,
              (SELECT COUNT(*)::int FROM atendimento_mensagens m WHERE m.atendimento_id = a.id)
                AS total_mensagens,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(a.entrou_fila_em, a.created_at)))::int
                AS espera_segundos,
              CASE WHEN a.status = 'aguardando_atendente' THEN (
                SELECT COUNT(*)::int + 1 FROM atendimentos f
                 WHERE f.status = 'aguardando_atendente' AND NOT f.teste
                   AND COALESCE(f.entrou_fila_em, f.created_at)
                     < COALESCE(a.entrou_fila_em, a.created_at)
              ) END AS posicao_fila
         FROM atendimentos a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         LEFT JOIN usuarios u ON u.id = a.atendente_id
        WHERE a.status IN ('aguardando_atendente', 'em_atendimento')
          AND NOT a.teste
        ORDER BY (a.status = 'aguardando_atendente') DESC,
                 COALESCE(a.entrou_fila_em, a.created_at) ASC`,
    );
  },

  /**
   * Posição e tempo de espera de uma conversa específica.
   *
   * A posição é contada, não armazenada: guardar um número de fila numa
   * coluna exigiria reescrever todas as linhas a cada atendimento
   * assumido, e qualquer falha no meio deixaria a fila mentindo. Contar
   * quantos entraram antes usa o dado que já existe e nunca desatualiza.
   *
   * Devolve null quando a conversa não está esperando — quem já foi
   * atendido não tem posição.
   */
  esperaNaFila(atendimentoId: string): Promise<EsperaNaFila | null> {
    return consultarUm<EsperaNaFila>(
      `SELECT (SELECT COUNT(*)::int + 1 FROM atendimentos f
                WHERE f.status = 'aguardando_atendente' AND NOT f.teste
                  AND COALESCE(f.entrou_fila_em, f.created_at)
                    < COALESCE(a.entrou_fila_em, a.created_at)) AS posicao,
              (SELECT COUNT(*)::int FROM atendimentos f
                WHERE f.status = 'aguardando_atendente' AND NOT f.teste) AS total_na_fila,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(a.entrou_fila_em, a.created_at)))::int
                AS espera_segundos
         FROM atendimentos a
        WHERE a.id = $1 AND a.status = 'aguardando_atendente'`,
      [atendimentoId],
    );
  },

  historico(limite = 30): Promise<ItemFila[]> {
    return consultar<ItemFila>(
      `SELECT a.*, c.nome AS cliente_nome, u.nome AS atendente_nome,
              (SELECT COUNT(*)::int FROM atendimento_mensagens m WHERE m.atendimento_id = a.id)
                AS total_mensagens,
              0 AS espera_segundos,
              NULL::int AS posicao_fila
         FROM atendimentos a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         LEFT JOIN usuarios u ON u.id = a.atendente_id
        WHERE NOT a.teste
        ORDER BY a.created_at DESC
        LIMIT $1`,
      [limite],
    );
  },

  /**
   * Assume o atendimento. A condição no UPDATE garante que dois
   * atendentes clicando ao mesmo tempo não peguem a mesma conversa:
   * o segundo não afeta nenhuma linha.
   */
  async assumir(atendimentoId: string, atendenteId: string, nomeAtendente: string): Promise<boolean> {
    return emTransacao(async (client) => {
      const { rowCount } = await client.query(
        `UPDATE atendimentos
            SET status = 'em_atendimento', atendente_id = $2, assumido_em = NOW()
          WHERE id = $1 AND status = 'aguardando_atendente'`,
        [atendimentoId, atendenteId],
      );

      if (!rowCount) return false;

      await atendimentoRepository.gravarEvento(
        client, atendimentoId, 'assumido', `${nomeAtendente} assumiu o atendimento`, atendenteId);
      await atendimentoRepository.gravarMensagem(
        client, atendimentoId, 'sistema', `${nomeAtendente} entrou na conversa.`);

      return true;
    });
  },

  responderComoAtendente(
    atendimentoId: string, atendenteId: string, texto: string,
  ): Promise<void> {
    return emTransacao(async (client) => {
      await atendimentoRepository.gravarMensagem(
        client, atendimentoId, 'atendente', texto, null, atendenteId);
    });
  },

  finalizar(atendimentoId: string, atendenteId: string, nome: string): Promise<void> {
    return emTransacao(async (client) => {
      await client.query(
        `UPDATE atendimentos SET status = 'finalizado', finalizado_em = NOW() WHERE id = $1`,
        [atendimentoId],
      );
      await atendimentoRepository.gravarMensagem(
        client, atendimentoId, 'sistema', 'Atendimento finalizado.');
      await atendimentoRepository.gravarEvento(
        client, atendimentoId, 'finalizacao', `${nome} finalizou o atendimento`, atendenteId);
    });
  },

  async vincularCliente(atendimentoId: string, clienteId: string): Promise<void> {
    await executar('UPDATE atendimentos SET cliente_id = $2 WHERE id = $1',
      [atendimentoId, clienteId]);
  },
};
