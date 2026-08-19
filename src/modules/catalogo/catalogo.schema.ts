import { z } from 'zod';

const vazioParaNull = (valor: unknown) => (valor === '' || valor === undefined ? null : valor);

export const produtoCreateSchema = z.object({
  sku: z.string().trim().toUpperCase().min(3).max(24)
        .regex(/^[A-Z0-9-]+$/, 'Use apenas letras, números e hífen'),
  nome: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(140),
  descricao: z.preprocess(vazioParaNull, z.string().max(2000).nullable().optional()),
  categoria: z.string().trim().min(2).max(60),
  preco: z.coerce.number().positive('O preço deve ser maior que zero').max(9_999_999),
  estoque: z.coerce.number().int().min(0, 'Estoque não pode ser negativo').default(0),
  ativo: z.coerce.boolean().default(true),
  imagem: z.preprocess(vazioParaNull, z.string().max(255).nullable().optional()),
});

export const produtoUpdateSchema = produtoCreateSchema.partial()
  .refine((obj) => Object.keys(obj).length > 0, 'Envie ao menos um campo para atualizar');

export const listarProdutosSchema = z.object({
  busca: z.string().trim().optional(),
  categoria: z.string().trim().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  emFalta: z.enum(['true', 'false']).optional(),
  ordem: z.enum(['nome', 'preco_asc', 'preco_desc', 'estoque', 'recentes']).default('recentes'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(12),
});

export const ajusteEstoqueSchema = z.object({
  ajuste: z.coerce.number().int().refine((v) => v !== 0, 'Informe um ajuste diferente de zero'),
});

export type FiltrosProduto = z.infer<typeof listarProdutosSchema>;
export type EntradaProduto = z.infer<typeof produtoCreateSchema>;
