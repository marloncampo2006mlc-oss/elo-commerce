import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { exigirPrivilegio } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { semConteudo } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ digitando: z.boolean() });

export const POST = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  const sessao = await exigirPrivilegio('atendimento.atender');
  const { id } = await params;
  const { digitando } = corpoSchema.parse(await request.json());
  await atendimentoService.marcarDigitacaoAtendente(id, sessao.id, digitando);
  return semConteudo();
});
