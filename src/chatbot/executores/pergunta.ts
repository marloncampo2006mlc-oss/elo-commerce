import { interpolar, type Executor } from '../tipos';

/**
 * Faz uma pergunta aberta e espera a resposta.
 *
 * Na primeira passagem (entrada null) apenas pergunta. Quando o cliente
 * responde, o motor volta a este nó, a resposta é gravada no contexto e
 * o fluxo segue.
 */
export const pergunta: Executor = ({ no, entrada, contexto }) => {
  if (entrada === null) {
    return {
      falas: [{ autor: 'bot', texto: interpolar(no.dados.texto ?? 'Pode me dizer?', contexto) }],
      aguardaEntrada: true,
    };
  }

  const resposta = entrada.trim();
  if (!resposta) {
    return {
      falas: [{ autor: 'bot', texto: 'Não consegui ler sua resposta. Pode escrever novamente?' }],
      aguardaEntrada: true,
      repetir: true,
    };
  }

  const variavel = no.dados.variavel?.trim() || 'resposta';
  return { falas: [], contexto: { [variavel]: resposta } };
};
