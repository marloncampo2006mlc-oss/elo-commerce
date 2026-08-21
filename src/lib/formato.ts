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

/**
 * Duração de espera em texto curto: 45s, 12min, 2h07min.
 *
 * Vive aqui porque a mesa de atendimento e o widget da loja mostram a
 * mesma espera para as duas pontas da mesma conversa — se cada lado
 * formatasse do seu jeito, o cliente e o atendente veriam números
 * diferentes para o mesmo tempo.
 */
export function tempoEspera(segundos: number): string {
  const total = Math.max(0, Math.trunc(segundos ?? 0));
  if (total < 60) return `${total}s`;

  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos}min`;

  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}min`;
}

/** "1º", "2º"… — a posição de quem espera, do jeito que se lê em português. */
export const ordinal = (posicao: number): string => `${Math.max(1, posicao)}º`;
