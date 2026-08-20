/**
 * Formatação compartilhada entre servidor e cliente.
 *
 * Fica num módulo neutro (sem 'use client') porque Server Components não
 * conseguem chamar funções exportadas de um módulo cliente — só renderizar
 * componentes dele.
 */

export const moeda = (valor: number): string =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const numero = (valor: number): string => Number(valor ?? 0).toLocaleString('pt-BR');

export const dataCurta = (valor: Date | string): string =>
  new Date(valor).toLocaleDateString('pt-BR');

export const dataHora = (valor: Date | string): string =>
  new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

export const cpfFormatado = (cpf: string): string =>
  String(cpf ?? '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
