import { describe, expect, it } from 'vitest';
import { crc16, gerarBrCode, referenciaPix, type DadosPix } from '@/lib/pix';

const base: DadosPix = {
  chave: 'demo@elostore.exemplo',
  beneficiario: 'Elo Store Demo',
  cidade: 'Florianopolis',
  valor: 129.9,
  identificador: 'ELO000042',
  demonstracao: true,
};

/**
 * O BR Code precisa seguir o padrão EMV à risca: um dígito errado no
 * tamanho de um campo, ou um CRC incorreto, e o aplicativo do banco
 * recusa o código sem dizer o motivo.
 */
describe('BR Code do Pix', () => {
  it('calcula o CRC16/CCITT-FALSE corretamente', () => {
    // Vetor conhecido do algoritmo: "123456789" → 0x29B1
    expect(crc16('123456789')).toBe('29B1');
  });

  it('começa com o indicador de formato e termina com o CRC', () => {
    const codigo = gerarBrCode(base);
    expect(codigo.startsWith('000201')).toBe(true);
    expect(codigo.slice(-8, -4)).toBe('6304');
    expect(codigo.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('o CRC confere com o próprio payload', () => {
    const codigo = gerarBrCode(base);
    const semCrc = codigo.slice(0, -4);
    expect(crc16(semCrc)).toBe(codigo.slice(-4));
  });

  it('declara moeda brasileira e país BR', () => {
    const codigo = gerarBrCode(base);
    expect(codigo).toContain('5303986');   // 986 = BRL
    expect(codigo).toContain('5802BR');
  });

  it('inclui o valor com duas casas decimais', () => {
    expect(gerarBrCode({ ...base, valor: 5890 })).toContain('54075890.00');
    expect(gerarBrCode({ ...base, valor: 129.9 })).toContain('5406129.90');
  });

  it('inclui a chave dentro do campo do arranjo Pix', () => {
    const codigo = gerarBrCode({ ...base, chave: '+5548999999999' });
    expect(codigo).toContain('BR.GOV.BCB.PIX');
    expect(codigo).toContain('+5548999999999');
  });

  it('remove acentos do beneficiário e da cidade', () => {
    // O padrão só aceita ASCII imprimível nesses campos.
    const codigo = gerarBrCode({ ...base, beneficiario: 'José Antônio', cidade: 'São Paulo' });
    expect(codigo).toContain('JOSE ANTONIO');
    expect(codigo).toContain('SAO PAULO');
    expect(codigo).not.toMatch(/[À-ÿ]/);
  });

  it('gera referência legível a partir do número do pedido', () => {
    expect(referenciaPix(42)).toBe('ELO000042');
    expect(referenciaPix(123456)).toBe('ELO123456');
  });
});
