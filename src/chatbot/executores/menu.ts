import { interpolar, type Executor, type OpcaoMenu } from '../tipos';

const normalizar = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Apresenta alternativas numeradas e aguarda a escolha.
 *
 * Aceita três formas de resposta, para funcionar tanto em URA (tecla)
 * quanto em chat (texto): o número da opção, o id, ou o próprio rótulo.
 */
export const menu: Executor = ({ no, entrada, contexto }) => {
  const opcoes: OpcaoMenu[] = no.dados.opcoes ?? [];

  if (entrada === null) {
    return {
      falas: [{
        autor: 'bot',
        texto: interpolar(no.dados.texto ?? 'Escolha uma opção:', contexto),
        opcoes,
      }],
      aguardaEntrada: true,
    };
  }

  const escolha = normalizar(entrada);
  const porNumero = Number(escolha);
  const encontrada =
    (Number.isInteger(porNumero) && porNumero >= 1 && porNumero <= opcoes.length
      ? opcoes[porNumero - 1]
      : undefined)
    ?? opcoes.find((opcao) => normalizar(opcao.id) === escolha)
    ?? opcoes.find((opcao) => normalizar(opcao.rotulo) === escolha)
    ?? opcoes.find((opcao) => normalizar(opcao.rotulo).includes(escolha) && escolha.length >= 3);

  if (!encontrada) {
    return {
      falas: [{
        autor: 'bot',
        texto: 'Não entendi a opção. Pode escolher uma das alternativas?',
        opcoes,
      }],
      aguardaEntrada: true,
      repetir: true,
    };
  }

  return { falas: [], saida: encontrada.id, contexto: { ultima_opcao: encontrada.rotulo } };
};
