import { z } from 'zod';

export const STATUS_PEDIDO = ['rascunho','aguardando_pagamento','pago','enviado','entregue','cancelado'];
export const CANAIS = ['site','chatbot','ura','whatsapp','telefone'];

/** Transições permitidas: impede que um pedido "entregue" volte a "pago". */
export const TRANSICOES = {
  rascunho: ['aguardando_pagamento', 'cancelado'],
  aguardando_pagamento: ['pago', 'cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

export const pedidoCreateSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente válido'),
  canal: z.enum(CANAIS).default('site'),
  observacao: z.string().max(500).nullish(),
  itens: z.array(z.object({
    produto_id: z.string().uuid('Produto inválido'),
    quantidade: z.coerce.number().int().positive('Quantidade deve ser maior que zero').max(999),
  })).min(1, 'O pedido precisa de ao menos um item'),
});

export const statusSchema = z.object({ status: z.enum(STATUS_PEDIDO) });

export const listarQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(STATUS_PEDIDO).optional(),
  canal: z.enum(CANAIS).optional(),
  cliente_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idSchema = z.object({ id: z.string().uuid('Identificador inválido') });
