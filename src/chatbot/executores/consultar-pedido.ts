import { interpolar, moeda, type Executor, type SaidaExecutor } from '../tipos';

const ROTULOS: Record<string, string> = {
  rascunho: 'em rascunho',
  aguardando_pagamento: 'aguardando pagamento',
  pago: 'pago e em separação',
  enviado: 'a caminho',
  entregue: 'entregue',
  cancelado: 'cancelado',
};

/**
 * Busca um pedido pelo número informado pelo cliente.
 *
 * Lê de {{pedido}} no contexto por padrão, ou aceita a entrada direta —
 * assim o bloco funciona logo depois de uma Pergunta.
 */
export const consultarPedido: Executor = async ({ no, entrada, contexto, deps }): Promise<SaidaExecutor> => {
  const bruto = interpolar(no.dados.termo ?? '{{pedido}}', contexto).trim() || (entrada ?? '');
  const numero = Number(bruto.replace(/\D/g, ''));

  if (!numero) {
    return {
      falas: [{ autor: 'bot', texto: 'Não consegui identificar o número do pedido.' }],
      contexto: { pedido_encontrado: 'nao' },
    };
  }

  const pedido = await deps.consultarPedido(numero);

  if (!pedido) {
    return {
      falas: [{
        autor: 'bot',
        texto: `Não localizei o pedido nº ${numero} na nossa base. Confira o número, por favor.`,
      }],
      contexto: { pedido_encontrado: 'nao' },
    };
  }

  const data = new Date(pedido.criadoEm).toLocaleDateString('pt-BR');

  return {
    falas: [{
      autor: 'bot',
      texto:
        `Pedido nº ${pedido.numero}, feito em ${data} por ${pedido.clienteNome}. ` +
        `Total de ${moeda(pedido.total)}. Situação: ${ROTULOS[pedido.status] ?? pedido.status}.`,
    }],
    contexto: {
      pedido_encontrado: 'sim',
      pedido_status: pedido.status,
      pedido_total: String(pedido.total),
    },
  };
};
