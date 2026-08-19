import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { exigirPapel, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

const corpoSchema = z.object({ versaoId: z.string().uuid() });

/**
 * Abre uma conversa de TESTE contra uma versão específica (o rascunho).
 * Marcada como teste, fica fora das métricas e da fila de atendimento.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const { versaoId } = corpoSchema.parse(await request.json());
  return ok(await atendimentoService.iniciar({ versaoId, teste: true, canal: 'chatbot' }), 201);
});
