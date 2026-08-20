import type { NextRequest } from 'next/server';
import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema, produtoCreateSchema } from '@/modules/catalogo/catalogo.schema';
import { exigirPrivilegio, exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, parametrosDaUrl } from '@/lib/api';

/** Listagem administrativa: enxerga inativos e sem estoque. */
export const GET = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirSessao();
  const filtros = listarProdutosSchema.parse(parametrosDaUrl(request.url));
  return ok(await catalogoService.listar(filtros));
});

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirPrivilegio('catalogo.editar');
  const dados = produtoCreateSchema.parse(await request.json());
  return ok(await catalogoService.criar(dados), 201);
});
