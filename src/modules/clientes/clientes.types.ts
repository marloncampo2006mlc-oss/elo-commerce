export interface Cliente {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  data_nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  status: 'ativo' | 'inativo' | 'prospect';
  observacoes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Cliente com histórico consolidado (view vw_clientes_resumo). */
export interface ClienteResumo extends Cliente {
  total_pedidos: number;
  total_gasto: number;
  ultimo_pedido: Date | null;
}
