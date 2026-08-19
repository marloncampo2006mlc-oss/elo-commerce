import type { NextRequest } from 'next/server';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const POST = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  const sessao = await exigirSessao();
  const { id } = await params;
  return ok(await atendimentoService.finalizar(id, sessao.id, sessao.nome));
});
