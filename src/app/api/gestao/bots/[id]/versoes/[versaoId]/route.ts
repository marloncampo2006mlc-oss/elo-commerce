import type { NextRequest } from 'next/server';
import { botsService } from '@/modules/bots/bots.service';
import { salvarFluxoSchema } from '@/modules/bots/bots.schema';
import { exigirPrivilegio } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string; versaoId: string }> };

/** Salvar o fluxo: só funciona em versão com status rascunho. */
export const PUT = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPrivilegio('bots.editar');
  const { versaoId } = await params;
  const { fluxo } = salvarFluxoSchema.parse(await request.json());
  const salvo = await botsService.salvar(versaoId, fluxo);
  return ok({ versao: salvo, problemas: botsService.validar(fluxo) });
});
