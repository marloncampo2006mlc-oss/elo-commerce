import type { NextRequest } from 'next/server';
import { clientesService } from '@/modules/clientes/clientes.service';
import { clienteCreateSchema, listarClientesSchema } from '@/modules/clientes/clientes.schema';
import { exigirPapel, exigirSessao, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, parametrosDaUrl } from '@/lib/api';

export const GET = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirSessao();
  const filtros = listarClientesSchema.parse(parametrosDaUrl(request.url));
  return ok(await clientesService.listar(filtros));
});

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const dados = clienteCreateSchema.parse(await request.json());
  return ok(await clientesService.criar(dados), 201);
});
