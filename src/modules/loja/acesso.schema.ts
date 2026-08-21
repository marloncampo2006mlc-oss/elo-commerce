import { z } from 'zod';

/**
 * Cadastro na loja.
 *
 * Sem CPF de propósito: pedi-lo aqui bloqueava quem só queria testar a
 * conta, porque o banco exige CPF único e uma pessoa não tem um segundo
 * documento para abrir uma segunda conta. Quem precisar de nota fiscal
 * informa o CPF no checkout, onde o dado é de fato necessário — a
 * própria coluna no banco já é opcional por esse motivo.
 */
export const cadastroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe seu nome completo').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
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
