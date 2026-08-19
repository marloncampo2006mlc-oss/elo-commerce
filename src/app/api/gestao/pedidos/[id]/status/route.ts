import type { NextRequest } from 'next/server';
import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { alterarStatusSchema } from '@/modules/pedidos/pedidos.schema';
import { exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const PATCH = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirSessao();
  const { id } = await params;
  const { status } = alterarStatusSchema.parse(await request.json());
  return ok(await pedidosService.alterarStatus(id, status));
});
