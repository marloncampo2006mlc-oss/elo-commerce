import type { NextRequest } from 'next/server';
import { botsService } from '@/modules/bots/bots.service';
import { botCreateSchema } from '@/modules/bots/bots.schema';
import { exigirPapel, exigirSessao, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, semConteudo } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const GET = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  await exigirSessao();
  const { id } = await params;
  return ok(await botsService.obter(id));
});

export const PUT = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const { id } = await params;
  return ok(await botsService.atualizar(id, botCreateSchema.parse(await request.json())));
});

export const DELETE = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const { id } = await params;
  await botsService.remover(id);
  return semConteudo();
});
