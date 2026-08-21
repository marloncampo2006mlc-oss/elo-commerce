import { z } from 'zod';
import { cpfValido } from '@/modules/clientes/clientes.schema';

export const cadastroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe seu nome completo').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  cpf: z.string().transform((v) => String(v).replace(/\D/g, '')).refine(cpfValido, 'CPF inválido'),
  senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(200),
  telefone: z.string().trim().max(20).nullish(),
});

export const loginClienteSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});

export type EntradaCadastro = z.infer<typeof cadastroSchema>;

export const recuperacaoSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
});

export const redefinicaoSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  codigo: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
  senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(200),
});
