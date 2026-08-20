import { interpolar, type Executor } from '../tipos';

/** Encerra o atendimento com uma despedida. */
export const finalizar: Executor = ({ no, contexto }) => ({
  falas: [{
    autor: 'bot',
    texto: interpolar(no.dados.texto ?? 'Obrigado por falar com a gente! 👋', contexto),
  }],
  desfecho: 'finalizar',
});
