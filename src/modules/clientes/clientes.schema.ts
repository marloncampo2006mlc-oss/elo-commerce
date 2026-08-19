import { z } from 'zod';

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE',
             'PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] as const;

/**
 * Valida CPF pelos dígitos verificadores — a regra real, não só o
 * formato. Função pura e sem dependências: é a unidade mais fácil de
 * cobrir por teste, e por isso a primeira testada.
 */
export function cpfValido(cpf: string): boolean {
  const digitos = String(cpf).replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;   // 111.111.111-11 e afins

  const calcular = (base: string, pesoInicial: number): number => {
    const soma = [...base].reduce(
      (acumulado, digito, indice) => acumulado + Number(digito) * (pesoInicial - indice), 0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcular(digitos.slice(0, 9), 10) === Number(digitos[9])
      && calcular(digitos.slice(0, 10), 11) === Number(digitos[10]);
}

const soDigitos = (valor: unknown) => String(valor ?? '').replace(/\D/g, '');
const vazioParaNull = (valor: unknown) => (valor === '' || valor === undefined ? null : valor);

export const clienteCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  cpf: z.string().transform(soDigitos).refine(cpfValido, 'CPF inválido'),
  telefone: z.preprocess(vazioParaNull, z.string().trim().max(20).nullable().optional()),
  data_nascimento: z.preprocess(vazioParaNull,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD').nullable().optional()),
  cidade: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable().optional()),
  uf: z.preprocess(vazioParaNull,
    z.enum(UFS, { message: 'UF inválida' }).nullable().optional()),
  status: z.enum(['ativo', 'inativo', 'prospect']).default('ativo'),
  observacoes: z.preprocess(vazioParaNull, z.string().max(2000).nullable().optional()),
});

export const clienteUpdateSchema = clienteCreateSchema.partial()
  .refine((obj) => Object.keys(obj).length > 0, 'Envie ao menos um campo para atualizar');

export const listarClientesSchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ativo', 'inativo', 'prospect']).optional(),
  uf: z.string().trim().toUpperCase().length(2).optional(),
  ordem: z.enum(['nome', 'recentes', 'gasto']).default('recentes'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(10),
});

export type FiltrosCliente = z.infer<typeof listarClientesSchema>;
export type EntradaCliente = z.infer<typeof clienteCreateSchema>;
