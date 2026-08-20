import type { PoolClient } from 'pg';
import { consultar, consultarUm, emTransacao, executar } from '@/lib/db';
import type { Fluxo } from '@/chatbot/tipos';

export interface Bot {
  id: string;
  nome: string;
  descricao: string | null;
  ativo_na_loja: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BotVersao {
  id: string;
  bot_id: string;
  versao: number;
  fluxo: Fluxo;
  status: 'rascunho' | 'publicada' | 'arquivada';
  notas: string | null;
  publicada_em: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BotComResumo extends Bot {
  total_versoes: number;
  versao_publicada: number | null;
  versao_rascunho: number | null;
}

export const botsRepository = {
  listar(): Promise<BotComResumo[]> {
    return consultar<BotComResumo>(
      `SELECT b.*,
              COALESCE(v.total, 0)  AS total_versoes,
              v.publicada           AS versao_publicada,
              v.rascunho            AS versao_rascunho
         FROM bots b
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS total,
                     MAX(versao) FILTER (WHERE status = 'publicada') AS publicada,
                     MAX(versao) FILTER (WHERE status = 'rascunho')  AS rascunho
                FROM bot_versoes WHERE bot_id = b.id
         ) v ON TRUE
        ORDER BY b.ativo_na_loja DESC, b.created_at DESC`,
    );
  },

  buscarPorId(id: string): Promise<Bot | null> {
    return consultarUm<Bot>('SELECT * FROM bots WHERE id = $1', [id]);
  },

  async criar(nome: string, descricao: string | null, criadoPor: string | null): Promise<Bot> {
    const bot = await consultarUm<Bot>(
      'INSERT INTO bots (nome, descricao, criado_por) VALUES ($1, $2, $3) RETURNING *',
      [nome, descricao, criadoPor],
    );
    if (!bot) throw new Error('Falha ao criar bot');
    return bot;
  },

  atualizar(id: string, nome: string, descricao: string | null): Promise<Bot | null> {
    return consultarUm<Bot>(
      'UPDATE bots SET nome = $2, descricao = $3 WHERE id = $1 RETURNING *',
      [id, nome, descricao],
    );
  },

  async remover(id: string): Promise<boolean> {
    return (await executar('DELETE FROM bots WHERE id = $1', [id])) > 0;
  },

  versoes(botId: string): Promise<BotVersao[]> {
    return consultar<BotVersao>(
      'SELECT * FROM bot_versoes WHERE bot_id = $1 ORDER BY versao DESC', [botId],
    );
  },

  versaoPorId(id: string): Promise<BotVersao | null> {
    return consultarUm<BotVersao>('SELECT * FROM bot_versoes WHERE id = $1', [id]);
  },

  /** Rascunho em edição — é nele que o editor salva. */
  rascunhoAtual(botId: string): Promise<BotVersao | null> {
    return consultarUm<BotVersao>(
      `SELECT * FROM bot_versoes
        WHERE bot_id = $1 AND status = 'rascunho'
        ORDER BY versao DESC LIMIT 1`,
      [botId],
    );
  },

  versaoPublicada(botId: string): Promise<BotVersao | null> {
    return consultarUm<BotVersao>(
      `SELECT * FROM bot_versoes WHERE bot_id = $1 AND status = 'publicada' LIMIT 1`,
      [botId],
    );
  },

  /** Versão que a loja está usando agora (bot marcado como ativo). */
  publicadaDaLoja(): Promise<(BotVersao & { bot_nome: string }) | null> {
    return consultarUm<BotVersao & { bot_nome: string }>(
      `SELECT v.*, b.nome AS bot_nome
         FROM bot_versoes v
         JOIN bots b ON b.id = v.bot_id
        WHERE b.ativo_na_loja AND v.status = 'publicada'
        LIMIT 1`,
    );
  },

  async criarVersao(
    botId: string, fluxo: Fluxo, criadoPor: string | null, client?: PoolClient,
  ): Promise<BotVersao> {
    const sql = `INSERT INTO bot_versoes (bot_id, versao, fluxo, criado_por)
                 VALUES ($1, COALESCE((SELECT MAX(versao) FROM bot_versoes WHERE bot_id = $1), 0) + 1,
                         $2::jsonb, $3)
                 RETURNING *`;
    const parametros = [botId, JSON.stringify(fluxo), criadoPor];

    if (client) {
      const { rows: [versao] } = await client.query<BotVersao>(sql, parametros);
      if (!versao) throw new Error('Falha ao criar versão');
      return versao;
    }

    const versao = await consultarUm<BotVersao>(sql, parametros);
    if (!versao) throw new Error('Falha ao criar versão');
    return versao;
  },

  salvarFluxo(versaoId: string, fluxo: Fluxo): Promise<BotVersao | null> {
    return consultarUm<BotVersao>(
      `UPDATE bot_versoes SET fluxo = $2::jsonb
        WHERE id = $1 AND status = 'rascunho'
        RETURNING *`,
      [versaoId, JSON.stringify(fluxo)],
    );
  },

  /**
   * Publica uma versão: a anterior vira arquivada e a nova assume, na
   * mesma transação. O índice único no banco garante que nunca existam
   * duas publicadas para o mesmo bot, mesmo sob concorrência.
   */
  publicar(versaoId: string, botId: string): Promise<BotVersao> {
    return emTransacao(async (client) => {
      await client.query(
        `UPDATE bot_versoes SET status = 'arquivada'
          WHERE bot_id = $1 AND status = 'publicada'`,
        [botId],
      );

      const { rows: [versao] } = await client.query<BotVersao>(
        `UPDATE bot_versoes
            SET status = 'publicada', publicada_em = NOW()
          WHERE id = $1
          RETURNING *`,
        [versaoId],
      );
      if (!versao) throw new Error('Versão não encontrada ao publicar');

      // Publicar já deixa um novo rascunho pronto para a próxima edição,
      // para que a versão no ar nunca seja alterada por engano.
      await client.query(
        `INSERT INTO bot_versoes (bot_id, versao, fluxo, criado_por)
         SELECT bot_id,
                COALESCE((SELECT MAX(versao) FROM bot_versoes WHERE bot_id = $1), 0) + 1,
                fluxo, criado_por
           FROM bot_versoes WHERE id = $2`,
        [botId, versaoId],
      );

      return versao;
    });
  },

  /** Marca qual bot atende a loja (apenas um por vez). */
  definirAtivoNaLoja(botId: string): Promise<void> {
    return emTransacao(async (client) => {
      await client.query('UPDATE bots SET ativo_na_loja = FALSE WHERE ativo_na_loja');
      await client.query('UPDATE bots SET ativo_na_loja = TRUE WHERE id = $1', [botId]);
    });
  },
};
