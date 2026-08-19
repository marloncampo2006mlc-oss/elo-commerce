import type { NextRequest } from 'next/server';
import { botsService } from '@/modules/bots/bots.service';
import { botCreateSchema } from '@/modules/bots/bots.schema';
import { exigirPapel, exigirSessao, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const GET = comTratamentoDeErro(async () => {
  await exigirSessao();
  return ok(await botsService.listar());
});

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const sessao = await exigirPapel(...PAPEIS_GESTAO);
  const dados = botCreateSchema.parse(await request.json());
  return ok(await botsService.criar(dados, sessao.id), 201);
});
