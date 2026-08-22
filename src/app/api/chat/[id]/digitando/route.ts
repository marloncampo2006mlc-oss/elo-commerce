import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { comTratamentoDeErro } from '@/lib/erros';
import { semConteudo } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ digitando: z.boolean() });

export const POST = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  const { id } = await params;
  const { digitando } = corpoSchema.parse(await request.json());
  await atendimentoService.marcarDigitacaoCliente(id, digitando);
  return semConteudo();
});
