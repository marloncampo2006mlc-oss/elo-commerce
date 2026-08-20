import { interpolar, type Executor } from '../tipos';

/** Emite um texto e continua para o próximo nó. */
export const mensagem: Executor = ({ no, contexto }) => {
  const texto = interpolar(no.dados.texto ?? '', contexto).trim();
  return { falas: texto ? [{ autor: 'bot', texto }] : [] };
};
