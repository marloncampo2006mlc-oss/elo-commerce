import { z } from 'zod';
import { PAPEIS } from './usuarios.types';

const papelSchema = z.enum(PAPEIS as [typeof PAPEIS[number], ...typeof PAPEIS]);

export const usuarioCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  papel: papelSchema,
  // Mínimo de 8 é o piso recomendado pelo NIST para senha escolhida por
  // pessoa; abaixo disso a força vira só aparência.
  senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(200),
});

export const usuarioUpdateSchema = z.object({
  nome: z.string().trim().min(3).max(120).optional(),
  papel: papelSchema.optional(),
  ativo: z.boolean().optional(),
}).refine((obj) => Object.keys(obj).length > 0, 'Envie ao menos um campo');

export const novaSenhaSchema = z.object({
  senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(200),
});

export type EntradaUsuario = z.infer<typeof usuarioCreateSchema>;
