export interface Cliente {
  id: string;
  nome: string;
  email: string;
  /**
   * Opcional desde que o login social e o cadastro por e-mail passaram
   * a não exigi-lo — só o checkout continua pedindo, para a nota fiscal.
   */
  cpf: string | null;
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
