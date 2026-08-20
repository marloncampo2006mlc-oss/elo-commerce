import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { lerSessaoCliente } from '@/lib/sessaoCliente';
import { comTratamentoDeErro, NaoAutorizado } from '@/lib/erros';
import { ok } from '@/lib/api';

const corpoSchema = z.object({
  observacao: z.string().max(500).nullish(),
  itens: z.array(z.object({
    produto_id: z.string().uuid('Produto inválido'),
    quantidade: z.coerce.number().int().positive().max(999),
  })).min(1, 'O pedido precisa de ao menos um item'),
});

/**
 * Checkout da loja.
 *
 * O cliente vem da SESSÃO, nunca do corpo da requisição: aceitar um
 * cliente_id enviado pelo navegador permitiria comprar em nome de
 * outra pessoa. A validação de estoque e a transação atômica seguem
 * no serviço.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const cliente = await lerSessaoCliente();
  if (!cliente) throw NaoAutorizado('Entre na sua conta para finalizar a compra');

  const corpo = corpoSchema.parse(await request.json());

  return ok(await pedidosService.criar({
    cliente_id: cliente.id,
    canal: 'site',
    observacao: corpo.observacao ?? null,
    itens: corpo.itens,
  }), 201);
});
