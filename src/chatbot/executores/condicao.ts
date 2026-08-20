import { interpolar, type Executor } from '../tipos';

/**
 * Desvia o fluxo conforme uma variável do contexto.
 * Sai por 'sim' quando a comparação é verdadeira, e por 'nao' quando não é.
 */
export const condicao: Executor = ({ no, contexto }) => {
  const valorAtual = (contexto[no.dados.variavel?.trim() ?? ''] ?? '').trim();
  const esperado = interpolar(no.dados.valor ?? '', contexto).trim();

  const comparar = (): boolean => {
    switch (no.dados.operador ?? 'igual') {
      case 'igual':      return valorAtual.toLowerCase() === esperado.toLowerCase();
      case 'diferente':  return valorAtual.toLowerCase() !== esperado.toLowerCase();
      case 'contem':     return valorAtual.toLowerCase().includes(esperado.toLowerCase());
      case 'preenchido': return valorAtual.length > 0;
      case 'maior':      return Number(valorAtual) > Number(esperado);
      case 'menor':      return Number(valorAtual) < Number(esperado);
      default:           return false;
    }
  };

  return { falas: [], saida: comparar() ? 'sim' : 'nao' };
};
