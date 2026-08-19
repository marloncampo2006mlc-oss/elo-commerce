import { z } from 'zod';

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

/** Valida CPF pelos dígitos verificadores (regra real, não só formato). */
export function cpfValido(cpf) {
  const n = String(cpf).replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const digito = (base, pesoInicial) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(n.slice(0, 9), 10) === Number(n[9]) && digito(n.slice(0, 10), 11) === Number(n[10]);
}

const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');
const vazioParaNull = (v) => (v === '' || v === undefined ? null : v);

export const clienteCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  cpf: z.string().transform(somenteDigitos).refine(cpfValido, 'CPF inválido'),
  telefone: z.preprocess(vazioParaNull, z.string().trim().max(20).nullable().optional()),
  data_nascimento: z.preprocess(vazioParaNull,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD').nullable().optional()),
  cidade: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable().optional()),
  uf: z.preprocess(vazioParaNull,
    z.string().trim().toUpperCase().refine((v) => v === null || UFS.includes(v), 'UF inválida').nullable().optional()),
  status: z.enum(['ativo', 'inativo', 'prospect']).default('ativo'),
  observacoes: z.preprocess(vazioParaNull, z.string().max(2000).nullable().optional()),
});

// No update tudo é opcional, mas o corpo não pode vir vazio.
export const clienteUpdateSchema = clienteCreateSchema.partial()
  .refine((o) => Object.keys(o).length > 0, 'Envie ao menos um campo para atualizar');

export const listarQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ativo', 'inativo', 'prospect']).optional(),
  uf: z.string().trim().toUpperCase().length(2).optional(),
  ordem: z.enum(['nome', 'recentes', 'gasto']).default('recentes'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idSchema = z.object({ id: z.string().uuid('Identificador inválido') });
