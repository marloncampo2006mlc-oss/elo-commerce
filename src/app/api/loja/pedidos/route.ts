import type { NextRequest } from 'next/server';
import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { pedidoCreateSchema } from '@/modules/pedidos/pedidos.schema';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

/**
 * Checkout da loja — público por decisão de produto: comprar é a ação
 * central do cliente. A validação de estoque e a transação atômica
 * acontecem no serviço, então nada aqui depende de confiança no cliente.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const dados = pedidoCreateSchema.parse({ ...(await request.json()), canal: 'site' });
  return ok(await pedidosService.criar(dados), 201);
});
