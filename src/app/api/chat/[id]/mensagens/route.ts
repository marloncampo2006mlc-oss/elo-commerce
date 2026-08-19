import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

const corpoSchema = z.object({ texto: z.string().trim().min(1).max(500) });

/** Um turno da conversa. Público: quem fala é o cliente na loja. */
export const POST = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  const { id } = await params;
  const { texto } = corpoSchema.parse(await request.json());
  return ok(await atendimentoService.responder(id, texto));
});

/** Consulta o estado da conversa — usado para receber a resposta do atendente. */
export const GET = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  const { id } = await params;
  return ok(await atendimentoService.obter(id));
});
