import { z } from 'zod';

export const iniciarSchema = z.object({
  canal: z.enum(['chatbot', 'ura', 'whatsapp', 'telefone']).default('chatbot'),
  cliente_id: z.string().uuid().nullish(),
});

export const mensagemSchema = z.object({
  entrada: z.string().trim().min(1, 'Digite algo para continuar').max(200),
});

export const listarQuerySchema = z.object({
  status: z.enum(['em_andamento', 'resolvido', 'transferido', 'abandonado']).optional(),
  canal: z.enum(['site', 'chatbot', 'ura', 'whatsapp', 'telefone']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idSchema = z.object({ id: z.string().uuid('Identificador inválido') });
