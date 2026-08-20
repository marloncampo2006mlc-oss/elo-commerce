import type { NextRequest } from 'next/server';
import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { ajusteEstoqueSchema } from '@/modules/catalogo/catalogo.schema';
import { exigirPrivilegio } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const PATCH = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPrivilegio('catalogo.editar');
  const { id } = await params;
  const { ajuste } = ajusteEstoqueSchema.parse(await request.json());
  return ok(await catalogoService.ajustarEstoque(id, ajuste));
});
