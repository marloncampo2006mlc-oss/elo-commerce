import { z } from 'zod';
import { CANAIS_VENDA, STATUS_PEDIDO } from './pedidos.types';

export const pedidoCreateSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente válido'),
  canal: z.enum(CANAIS_VENDA).default('site'),
  observacao: z.string().max(500).nullish(),
  itens: z.array(z.object({
    produto_id: z.string().uuid('Produto inválido'),
    quantidade: z.coerce.number().int().positive('Quantidade deve ser maior que zero').max(999),
  })).min(1, 'O pedido precisa de ao menos um item'),
});

export const alterarStatusSchema = z.object({ status: z.enum(STATUS_PEDIDO) });

export const listarPedidosSchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(STATUS_PEDIDO).optional(),
  canal: z.enum(CANAIS_VENDA).optional(),
  cliente_id: z.string().uuid().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(10),
});

export type EntradaPedido = z.infer<typeof pedidoCreateSchema>;
export type FiltrosPedido = z.infer<typeof listarPedidosSchema>;
