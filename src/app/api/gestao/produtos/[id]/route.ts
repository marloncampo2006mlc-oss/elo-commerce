import type { NextRequest } from 'next/server';
import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { produtoUpdateSchema } from '@/modules/catalogo/catalogo.schema';
import { exigirPapel, exigirSessao, PAPEIS_GESTAO } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, semConteudo } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const GET = comTratamentoDeErro(async (_request: NextRequest, { params }: Contexto) => {
  await exigirSessao();
  const { id } = await params;
  return ok(await catalogoService.obter(id));
});

export const PUT = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPapel(...PAPEIS_GESTAO);
  const { id } = await params;
  const dados = produtoUpdateSchema.parse(await request.json());
  return ok(await catalogoService.atualizar(id, dados));
});

export const DELETE = comTratamentoDeErro(async (_request: NextRequest, { params }: Contexto) => {
  // Exclusão é a operação mais destrutiva do catálogo: só administrador.
  await exigirPapel('administrador');
  const { id } = await params;
  await catalogoService.remover(id);
  return semConteudo();
});
