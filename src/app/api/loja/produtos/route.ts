import type { NextRequest } from 'next/server';
import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok, parametrosDaUrl } from '@/lib/api';

/**
 * Vitrine pública: sempre restrita a produtos ativos e com estoque.
 * O cliente não escolhe esse filtro — quem decide é o serviço.
 */
export const GET = comTratamentoDeErro(async (request: NextRequest) => {
  const filtros = listarProdutosSchema.parse(parametrosDaUrl(request.url));
  return ok(await catalogoService.vitrine(filtros));
});
