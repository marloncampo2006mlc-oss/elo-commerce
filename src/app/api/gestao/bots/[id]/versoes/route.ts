import type { NextRequest } from 'next/server';
import { botsService } from '@/modules/bots/bots.service';
import { exigirPapel, exigirSessao, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

/** Lista as versões do bot (histórico de publicações). */
export const GET = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  await exigirSessao();
  const { id } = await params;
  return ok(await botsService.versoes(id));
});

/** Devolve (ou cria) o rascunho em que o editor trabalha. */
export const POST = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  const sessao = await exigirPapel(...PAPEIS_GESTAO);
  const { id } = await params;
  return ok(await botsService.rascunho(id, sessao.id));
});
