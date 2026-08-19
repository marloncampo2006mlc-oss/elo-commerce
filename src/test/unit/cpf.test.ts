import { describe, expect, it } from 'vitest';
import { cpfValido } from '@/modules/clientes/clientes.schema';

describe('validação de CPF', () => {
  it('aceita CPFs com dígitos verificadores corretos', () => {
    for (const cpf of ['52998224725', '11144477735', '52601815906']) {
      expect(cpfValido(cpf), cpf).toBe(true);
    }
  });

  it('aceita CPF formatado com pontos e traço', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(cpfValido('52998224726')).toBe(false);
  });

  it('recusa sequências repetidas, que passam no cálculo mas não existem', () => {
    for (const cpf of ['00000000000', '11111111111', '99999999999']) {
      expect(cpfValido(cpf), cpf).toBe(false);
    }
  });

  it('recusa entradas com tamanho inválido', () => {
    for (const cpf of ['', '123', '529982247251']) {
      expect(cpfValido(cpf), cpf).toBe(false);
    }
  });
});
