import { consultar, consultarUm } from '@/lib/db';
import { intervaloSql, type Periodo } from './indicadores.schema';

export interface Indicadores {
  faturamento: number; pedidos: number; ticket_medio: number;
  itens_vendidos: number; cancelados: number;
  clientes_novos: number; clientes_total: number;
  atendimentos: number; resolvidos_bot: number; transferidos: number;
}

export interface PontoTempo { dia: string; faturamento: number; pedidos: number }
export interface Fatia { rotulo: string; valor: number; quantidade: number }

export const indicadoresRepository = {
  async resumo(periodo: Periodo): Promise<Indicadores> {
    const { inicio } = intervaloSql(periodo);
    const fim = periodo === 'ontem' ? "CURRENT_DATE" : "CURRENT_DATE + INTERVAL '1 day'";

    const linha = await consultarUm<Indicadores>(`
      WITH janela AS (SELECT ${inicio} AS ini, ${fim} AS fim)
      SELECT
        (SELECT COALESCE(SUM(total), 0) FROM pedidos, janela
          WHERE status <> 'cancelado' AND created_at >= ini AND created_at < fim) AS faturamento,
        (SELECT COUNT(*)::int FROM pedidos, janela
          WHERE status <> 'cancelado' AND created_at >= ini AND created_at < fim) AS pedidos,
        (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM pedidos, janela
          WHERE status <> 'cancelado' AND created_at >= ini AND created_at < fim) AS ticket_medio,
        (SELECT COALESCE(SUM(i.quantidade), 0)::int FROM pedido_itens i
           JOIN pedidos p ON p.id = i.pedido_id, janela
          WHERE p.status <> 'cancelado' AND p.created_at >= ini AND p.created_at < fim) AS itens_vendidos,
        (SELECT COUNT(*)::int FROM pedidos, janela
          WHERE status = 'cancelado' AND created_at >= ini AND created_at < fim) AS cancelados,
        (SELECT COUNT(*)::int FROM clientes, janela
          WHERE created_at >= ini AND created_at < fim) AS clientes_novos,
        (SELECT COUNT(*)::int FROM clientes) AS clientes_total,
        (SELECT COUNT(*)::int FROM atendimentos, janela
          WHERE NOT teste AND created_at >= ini AND created_at < fim) AS atendimentos,
        (SELECT COUNT(*)::int FROM atendimentos, janela
          WHERE NOT teste AND status IN ('finalizado','resolvido') AND atendente_id IS NULL
            AND created_at >= ini AND created_at < fim) AS resolvidos_bot,
        (SELECT COUNT(*)::int FROM atendimentos, janela
          WHERE NOT teste AND (atendente_id IS NOT NULL OR status = 'aguardando_atendente')
            AND created_at >= ini AND created_at < fim) AS transferidos
    `);

    if (!linha) throw new Error('Falha ao calcular indicadores');
    return linha;
  },

  /** Série temporal com dias vazios preenchidos — senão o gráfico mente. */
  serieDiaria(periodo: Periodo): Promise<PontoTempo[]> {
    const { inicio } = intervaloSql(periodo);
    return consultar<PontoTempo>(`
      SELECT TO_CHAR(d.dia, 'DD/MM') AS dia,
             COALESCE(SUM(p.total), 0) AS faturamento,
             COUNT(p.id)::int AS pedidos
        FROM generate_series(${inicio}, CURRENT_DATE, '1 day') d(dia)
        LEFT JOIN pedidos p
               ON p.created_at::date = d.dia::date AND p.status <> 'cancelado'
       GROUP BY d.dia ORDER BY d.dia
    `);
  },

  porCanal(periodo: Periodo): Promise<Fatia[]> {
    const { inicio } = intervaloSql(periodo);
    return consultar<Fatia>(`
      SELECT canal AS rotulo, COALESCE(SUM(total), 0) AS valor, COUNT(*)::int AS quantidade
        FROM pedidos
       WHERE status <> 'cancelado' AND created_at >= ${inicio}
       GROUP BY canal ORDER BY valor DESC
    `);
  },

  porStatus(periodo: Periodo): Promise<Fatia[]> {
    const { inicio } = intervaloSql(periodo);
    return consultar<Fatia>(`
      SELECT status AS rotulo, COALESCE(SUM(total), 0) AS valor, COUNT(*)::int AS quantidade
        FROM pedidos WHERE created_at >= ${inicio}
       GROUP BY status ORDER BY quantidade DESC
    `);
  },

  topProdutos(periodo: Periodo, limite = 6): Promise<Array<{
    nome: string; imagem: string | null; categoria: string; unidades: number; receita: number;
  }>> {
    const { inicio } = intervaloSql(periodo);
    return consultar(`
      SELECT pr.nome, pr.imagem, pr.categoria,
             SUM(i.quantidade)::int AS unidades,
             SUM(i.subtotal) AS receita
        FROM pedido_itens i
        JOIN produtos pr ON pr.id = i.produto_id
        JOIN pedidos p ON p.id = i.pedido_id
       WHERE p.status <> 'cancelado' AND p.created_at >= ${inicio}
       GROUP BY pr.id ORDER BY receita DESC LIMIT $1
    `, [limite]);
  },

  clientesRecorrentes(limite = 6) {
    return consultar<{ nome: string; pedidos: number; total: number; ultimo: Date | null }>(`
      SELECT nome, total_pedidos AS pedidos, total_gasto AS total, ultimo_pedido AS ultimo
        FROM vw_clientes_resumo
       WHERE total_pedidos > 0
       ORDER BY total_pedidos DESC, total_gasto DESC LIMIT $1
    `, [limite]);
  },

  atendimentoPorCanal(periodo: Periodo): Promise<Fatia[]> {
    const { inicio } = intervaloSql(periodo);
    return consultar<Fatia>(`
      SELECT canal AS rotulo, COUNT(*)::int AS quantidade, COUNT(*)::int AS valor
        FROM atendimentos
       WHERE NOT teste AND created_at >= ${inicio}
       GROUP BY canal ORDER BY quantidade DESC
    `);
  },

  alertaEstoque() {
    return consultar<{ id: string; nome: string; sku: string; estoque: number; imagem: string | null }>(`
      SELECT id, nome, sku, estoque, imagem FROM produtos
       WHERE ativo AND estoque <= 5 ORDER BY estoque ASC LIMIT 6
    `);
  },
};
