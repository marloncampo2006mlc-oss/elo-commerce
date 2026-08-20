import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  lembrar: z.boolean().default(false),
});

export type EntradaLogin = z.infer<typeof loginSchema>;
