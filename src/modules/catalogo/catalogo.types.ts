export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  preco: number;
  estoque: number;
  ativo: boolean;
  imagem: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CategoriaResumo {
  categoria: string;
  total: number;
  estoque: number;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
  paginas: number;
}
