import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ texto: z.string().trim().min(1).max(1000) });

export const POST = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  const sessao = await exigirSessao();
  const { id } = await params;
  const { texto } = corpoSchema.parse(await request.json());
  return ok(await atendimentoService.responderComoAtendente(id, sessao.id, texto));
});
