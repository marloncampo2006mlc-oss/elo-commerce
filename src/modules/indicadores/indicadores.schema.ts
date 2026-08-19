import { z } from 'zod';

export const PERIODOS = ['hoje', 'ontem', '7dias', '30dias', 'mes', 'tudo'] as const;
export type Periodo = (typeof PERIODOS)[number];

export const filtroSchema = z.object({
  periodo: z.enum(PERIODOS).default('30dias'),
});

/**
 * Traduz o período escolhido em uma cláusula SQL.
 *
 * O intervalo é montado aqui, a partir de um conjunto fechado de opções —
 * nunca de texto livre vindo do cliente, o que manteria a query aberta a
 * injeção.
 */
export function intervaloSql(periodo: Periodo): { inicio: string; rotulo: string } {
  switch (periodo) {
    case 'hoje':   return { inicio: "CURRENT_DATE", rotulo: 'hoje' };
    case 'ontem':  return { inicio: "CURRENT_DATE - INTERVAL '1 day'", rotulo: 'ontem' };
    case '7dias':  return { inicio: "CURRENT_DATE - INTERVAL '6 days'", rotulo: 'últimos 7 dias' };
    case '30dias': return { inicio: "CURRENT_DATE - INTERVAL '29 days'", rotulo: 'últimos 30 dias' };
    case 'mes':    return { inicio: "date_trunc('month', CURRENT_DATE)", rotulo: 'mês atual' };
    case 'tudo':   return { inicio: "'1970-01-01'::date", rotulo: 'todo o período' };
  }
}
