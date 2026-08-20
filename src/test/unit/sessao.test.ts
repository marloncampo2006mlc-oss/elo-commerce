import { beforeAll, describe, expect, it } from 'vitest';
import { gerarToken, lerToken, type SessaoUsuario } from '@/lib/sessao';

const USUARIO: SessaoUsuario = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Teste',
  email: 'teste@elo.dev',
  papel: 'gerente',
};

beforeAll(() => {
  process.env.SESSION_SECRET = 'segredo-de-teste-suficientemente-longo';
});

describe('token de sessão', () => {
  it('gera e relê a mesma identidade', () => {
    expect(lerToken(gerarToken(USUARIO))).toEqual(USUARIO);
  });

  it('recusa token com payload adulterado', () => {
    const token = gerarToken(USUARIO);
    const [payload, assinatura] = token.split('.');
    // troca o papel para administrador mantendo a assinatura original
    const adulterado = Buffer.from(
      JSON.stringify({ ...USUARIO, papel: 'administrador', exp: Date.now() + 60_000 }),
    ).toString('base64url');

    expect(payload).not.toBe(adulterado);
    expect(lerToken(`${adulterado}.${assinatura}`)).toBeNull();
  });

  it('recusa token sem assinatura ou malformado', () => {
    for (const invalido of ['', 'abc', 'abc.def', gerarToken(USUARIO).split('.')[0]!]) {
      expect(lerToken(invalido)).toBeNull();
    }
  });

  it('recusa token expirado', () => {
    const expirado = Buffer.from(
      JSON.stringify({ ...USUARIO, exp: Date.now() - 1000 }),
    ).toString('base64url');
    // assina corretamente, mas com validade no passado
    const token = gerarToken(USUARIO);
    const assinaturaValida = token.split('.')[1]!;
    expect(lerToken(`${expirado}.${assinaturaValida}`)).toBeNull();
  });
});
