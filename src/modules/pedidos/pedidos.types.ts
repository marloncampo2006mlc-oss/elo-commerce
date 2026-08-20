export const STATUS_PEDIDO = [
  'rascunho', 'aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado',
] as const;

export const CANAIS_VENDA = ['site', 'chatbot', 'ura', 'whatsapp', 'telefone'] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export type CanalVenda = (typeof CANAIS_VENDA)[number];

/**
 * Máquina de estados do pedido — FONTE ÚNICA.
 *
 * Antes esta tabela existia duplicada no backend e no frontend, o que
 * significa duas verdades que divergem com o tempo. Agora o front
 * importa daqui, e só o servidor decide o que é transição válida.
 */
export const TRANSICOES: Record<StatusPedido, readonly StatusPedido[]> = {
  rascunho: ['aguardando_pagamento', 'cancelado'],
  aguardando_pagamento: ['pago', 'cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

export const podeTransitar = (de: StatusPedido, para: StatusPedido): boolean =>
  TRANSICOES[de].includes(para);

export interface Pedido {
  id: string;
  numero: number;
  status: StatusPedido;
  canal: CanalVenda;
  total: number;
  observacao: string | null;
  created_at: Date;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  qtd_itens: number;
  qtd_pecas: number;
}

export interface ItemPedido {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto_nome: string;
  sku: string;
  imagem: string | null;
  categoria: string;
}

export interface PedidoDetalhado extends Pedido {
  itens: ItemPedido[];
}
