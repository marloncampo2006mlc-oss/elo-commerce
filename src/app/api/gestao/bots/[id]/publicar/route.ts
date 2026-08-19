import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { botsService } from '@/modules/bots/bots.service';
import { exigirPapel, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

const corpoSchema = z.object({ versaoId: z.string().uuid() });

/**
 * Publica a versão. O serviço valida o grafo antes e recusa com a lista
 * de problemas — é aqui que um fluxo quebrado deixa de chegar ao cliente.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const { id } = await params;
  const { versaoId } = corpoSchema.parse(await request.json());
  return ok(await botsService.publicar(id, versaoId));
});
