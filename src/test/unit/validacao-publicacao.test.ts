import { describe, expect, it } from 'vitest';
import { validarFluxo } from '@/chatbot/motor';
import type { Fluxo } from '@/chatbot/tipos';

const no = (id: string, tipo: string, dados: object = {}) =>
  ({ id, tipo, posicao: { x: 0, y: 0 }, dados }) as Fluxo['nodes'][number];
const liga = (origem: string, destino: string, saida?: string) =>
  ({ id: `${origem}${destino}${saida ?? ''}`, origem, destino, saida: saida ?? null });

/**
 * Estes testes protegem o cliente final: um fluxo quebrado tem que ser
 * recusado na publicação, não descoberto durante uma conversa real.
 */
describe('regras que impedem publicar um fluxo quebrado', () => {
  it('recusa bloco sem saída no meio do fluxo', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('m', 'mensagem', { texto: 'oi' })],
      edges: [liga('i', 'm')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('não leva a lugar nenhum'))).toBe(true);
  });

  it('aceita bloco terminal sem saída', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('f', 'finalizar', { texto: 'tchau' })],
      edges: [liga('i', 'f')],
    };
    expect(validarFluxo(fluxo)).toEqual([]);
  });

  it('recusa condição sem os dois caminhos conectados', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'),
              no('c', 'condicao', { variavel: 'x', operador: 'igual', valor: '1' }),
              no('f', 'finalizar')],
      edges: [liga('i', 'c'), liga('c', 'f', 'sim')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('"nao"'))).toBe(true);
  });

  it('recusa pergunta que não guarda a resposta', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('p', 'pergunta', { texto: 'Nome?' }), no('f', 'finalizar')],
      edges: [liga('i', 'p'), liga('p', 'f')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('onde guardar'))).toBe(true);
  });

  it('recusa menu vazio', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('m', 'menu', { opcoes: [] }), no('f', 'finalizar')],
      edges: [liga('i', 'm'), liga('m', 'f')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('nenhuma opção'))).toBe(true);
  });
});
