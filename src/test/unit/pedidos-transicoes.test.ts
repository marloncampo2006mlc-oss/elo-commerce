import { describe, expect, it } from 'vitest';
import { podeTransitar, STATUS_PEDIDO, TRANSICOES } from '@/modules/pedidos/pedidos.types';

describe('máquina de estados do pedido', () => {
  it('permite o caminho feliz completo da venda', () => {
    expect(podeTransitar('rascunho', 'aguardando_pagamento')).toBe(true);
    expect(podeTransitar('aguardando_pagamento', 'pago')).toBe(true);
    expect(podeTransitar('pago', 'enviado')).toBe(true);
    expect(podeTransitar('enviado', 'entregue')).toBe(true);
  });

  it('impede voltar no fluxo', () => {
    expect(podeTransitar('entregue', 'pago')).toBe(false);
    expect(podeTransitar('enviado', 'aguardando_pagamento')).toBe(false);
  });

  it('impede pular etapas', () => {
    expect(podeTransitar('aguardando_pagamento', 'entregue')).toBe(false);
    expect(podeTransitar('rascunho', 'pago')).toBe(false);
  });

  it('trata entregue e cancelado como estados finais', () => {
    expect(TRANSICOES.entregue).toHaveLength(0);
    expect(TRANSICOES.cancelado).toHaveLength(0);
  });

  it('permite cancelar enquanto o pedido não foi enviado', () => {
    expect(podeTransitar('rascunho', 'cancelado')).toBe(true);
    expect(podeTransitar('aguardando_pagamento', 'cancelado')).toBe(true);
    expect(podeTransitar('pago', 'cancelado')).toBe(true);
    // depois de despachado, cancelar deixa de ser uma decisão do sistema
    expect(podeTransitar('enviado', 'cancelado')).toBe(false);
  });

  it('declara transições para todos os status existentes', () => {
    for (const status of STATUS_PEDIDO) {
      expect(TRANSICOES[status], status).toBeDefined();
    }
  });
});
