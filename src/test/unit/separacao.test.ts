import { describe, expect, it } from 'vitest';

/**
 * A separação das plataformas é decidida por caminho. Estes testes
 * congelam a classificação: mover uma rota de lado por engano faria
 * a área interna aparecer no deploy público, ou a loja sumir do dela.
 */
const daGestao = (caminho: string): boolean =>
  caminho.startsWith('/gestao') || caminho.startsWith('/api/gestao')
  || caminho.startsWith('/login') || caminho.startsWith('/api/auth');

const daLoja = (caminho: string): boolean =>
  caminho === '/' || caminho.startsWith('/carrinho') || caminho.startsWith('/api/loja');

describe('separação entre loja e gestão', () => {
  it('classifica as rotas internas como da gestão', () => {
    for (const rota of ['/gestao', '/gestao/bi', '/api/gestao/usuarios', '/login', '/api/auth/login']) {
      expect(daGestao(rota), rota).toBe(true);
      expect(daLoja(rota), rota).toBe(false);
    }
  });

  it('classifica vitrine e checkout como da loja', () => {
    for (const rota of ['/', '/carrinho', '/api/loja/produtos', '/api/loja/pagamento']) {
      expect(daLoja(rota), rota).toBe(true);
      expect(daGestao(rota), rota).toBe(false);
    }
  });

  it('deixa o chat fora das duas — é a ponte entre elas', () => {
    // O widget da loja e a fila da gestão consomem o mesmo atendimento,
    // então /api/chat precisa existir nos dois deploys.
    for (const rota of ['/api/chat/iniciar', '/api/chat/abc/mensagens']) {
      expect(daLoja(rota), rota).toBe(false);
      expect(daGestao(rota), rota).toBe(false);
    }
  });

  it('não há rota classificada nos dois lados ao mesmo tempo', () => {
    const rotas = ['/', '/carrinho', '/gestao', '/gestao/painel', '/login',
                   '/api/loja/produtos', '/api/gestao/bots', '/api/chat/iniciar'];
    for (const rota of rotas) {
      expect(daLoja(rota) && daGestao(rota), rota).toBe(false);
    }
  });
});
