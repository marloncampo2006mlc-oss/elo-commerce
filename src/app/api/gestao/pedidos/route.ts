import type { NextRequest } from 'next/server';
import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { listarPedidosSchema } from '@/modules/pedidos/pedidos.schema';
import { exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, parametrosDaUrl } from '@/lib/api';

export const GET = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirSessao();
  const filtros = listarPedidosSchema.parse(parametrosDaUrl(request.url));
  return ok(await pedidosService.listar(filtros));
});
