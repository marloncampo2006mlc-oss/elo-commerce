import { interpolar, type Executor } from '../tipos';

/**
 * Encerra a etapa automatizada e coloca a conversa na fila humana.
 * Quem muda o status do atendimento é o serviço, a partir do desfecho.
 */
export const transferir: Executor = ({ no, contexto }) => ({
  falas: [{
    autor: 'bot',
    texto: interpolar(
      no.dados.texto ?? 'Vou te transferir para um de nossos atendentes. Um momento, por favor.',
      contexto,
    ),
  }],
  desfecho: 'transferir',
});
