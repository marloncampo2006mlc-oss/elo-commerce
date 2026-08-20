/**
 * Gerador de BR Code (Pix "copia e cola"), no padrão EMV® QRCPS-MPM
 * adotado pelo Banco Central.
 *
 * O payload é uma sequência de campos no formato ID + tamanho + valor,
 * aninhável, terminada por um CRC16 do próprio texto. Implementar em vez
 * de usar biblioteca deixa visível o que cada campo significa — e é um
 * dos trechos mais fáceis de explicar numa entrevista.
 *
 * ─────────────────────────────────────────────────────────────────────
 * A CHAVE VEM DE VARIÁVEL DE AMBIENTE, nunca do código.
 *
 * Sem PIX_CHAVE definida, gera um código de demonstração: válido em
 * formato, com chave de exemplo. Isso evita que uma vitrine pública com
 * produtos fictícios exponha uma chave real de recebimento — a loja
 * seria um canal aberto de cobrança por mercadoria que não existe.
 *
 * Para demonstrar com a sua chave, defina no .env local:
 *   PIX_CHAVE=+5548984419747
 *   PIX_BENEFICIARIO=Marlon Luiz de Campos
 *   PIX_CIDADE=Florianopolis
 * ─────────────────────────────────────────────────────────────────────
 */

const CHAVE_DEMO = 'demo@elostore.exemplo';

export interface DadosPix {
  chave: string;
  beneficiario: string;
  cidade: string;
  valor: number;
  identificador: string;
  demonstracao: boolean;
}

/** Monta um campo no formato ID + tamanho (2 dígitos) + valor. */
const campo = (id: string, valor: string): string =>
  `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/**
 * CRC16/CCITT-FALSE — o algoritmo exigido pela especificação.
 * Polinômio 0x1021, valor inicial 0xFFFF, sem reflexão.
 */
export function crc16(texto: string): string {
  let resultado = 0xffff;

  for (let i = 0; i < texto.length; i += 1) {
    resultado ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      resultado = resultado & 0x8000
        ? ((resultado << 1) ^ 0x1021) & 0xffff
        : (resultado << 1) & 0xffff;
    }
  }

  return resultado.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Remove acentos e caracteres fora do permitido.
 * O padrão aceita apenas ASCII imprimível nos campos de texto.
 */
const normalizar = (texto: string, limite: number): string =>
  texto.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, limite)
    .toUpperCase();

export function dadosPix(valor: number, identificador: string): DadosPix {
  const chave = process.env.PIX_CHAVE?.trim();

  return {
    chave: chave || CHAVE_DEMO,
    beneficiario: process.env.PIX_BENEFICIARIO?.trim() || 'ELO STORE DEMO',
    cidade: process.env.PIX_CIDADE?.trim() || 'FLORIANOPOLIS',
    valor,
    identificador,
    demonstracao: !chave,
  };
}

/** Monta o payload completo do BR Code. */
export function gerarBrCode(dados: DadosPix): string {
  const valorFormatado = dados.valor.toFixed(2);
  const identificador = normalizar(dados.identificador, 25) || '***';

  const partes = [
    campo('00', '01'),                                    // formato do payload
    campo('01', '12'),                                    // 12 = uso múltiplo
    campo('26',                                           // conta do beneficiário
      campo('00', 'BR.GOV.BCB.PIX') + campo('01', dados.chave)),
    campo('52', '0000'),                                  // categoria do comerciante
    campo('53', '986'),                                   // moeda: 986 = BRL
    campo('54', valorFormatado),                          // valor da cobrança
    campo('58', 'BR'),                                    // país
    campo('59', normalizar(dados.beneficiario, 25)),      // nome do beneficiário
    campo('60', normalizar(dados.cidade, 15)),            // cidade
    campo('62', campo('05', identificador)),              // identificador da transação
  ].join('');

  // O CRC é calculado sobre o payload já contendo "6304".
  const comMarcador = `${partes}6304`;
  return `${comMarcador}${crc16(comMarcador)}`;
}

/** Identificador curto e legível para conciliar a cobrança. */
export const referenciaPix = (numeroPedido: number): string =>
  `ELO${String(numeroPedido).padStart(6, '0')}`;
