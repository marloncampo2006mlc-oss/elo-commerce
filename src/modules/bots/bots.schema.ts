import { z } from 'zod';
import { TIPOS_NO } from '@/chatbot/tipos';

const opcaoSchema = z.object({
  id: z.string().min(1),
  rotulo: z.string().trim().min(1, 'A opção precisa de um rótulo').max(80),
});

const noSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(TIPOS_NO),
  posicao: z.object({ x: z.number(), y: z.number() }),
  dados: z.object({
    texto: z.string().max(2000).optional(),
    variavel: z.string().max(40).optional(),
    opcoes: z.array(opcaoSchema).max(10).optional(),
    operador: z.enum(['igual', 'diferente', 'contem', 'preenchido', 'maior', 'menor']).optional(),
    valor: z.string().max(200).optional(),
    termo: z.string().max(200).optional(),
    limite: z.number().int().min(1).max(10).optional(),
    titulo: z.string().max(80).optional(),
  }).default({}),
});

const arestaSchema = z.object({
  id: z.string().min(1),
  origem: z.string().min(1),
  destino: z.string().min(1),
  saida: z.string().nullable().optional(),
});

export const fluxoSchema = z.object({
  nodes: z.array(noSchema).max(200),
  edges: z.array(arestaSchema).max(400),
});

export const botCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(120),
  descricao: z.string().max(500).nullish(),
});

export const salvarFluxoSchema = z.object({ fluxo: fluxoSchema });

export type EntradaBot = z.infer<typeof botCreateSchema>;
