'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export interface ItemCarrinho {
  id: string; nome: string; preco: number; imagem: string | null; estoque: number; qtd: number;
}

interface ContextoCarrinho {
  itens: ItemCarrinho[];
  total: number;
  quantidade: number;
  adicionar: (item: Omit<ItemCarrinho, 'qtd'>) => boolean;
  alterarQtd: (id: string, delta: number) => void;
  remover: (id: string) => void;
  limpar: () => void;
}

const Contexto = createContext<ContextoCarrinho | null>(null);

export function useCarrinho(): ContextoCarrinho {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useCarrinho precisa estar dentro de ProvedorCarrinho');
  return contexto;
}

const CHAVE = 'elo-carrinho';

/** Carrinho vive no cliente e sobrevive ao refresh via localStorage. */
export function ProvedorCarrinho({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) setItens(JSON.parse(salvo) as ItemCarrinho[]);
    } catch { /* localStorage indisponível não deve quebrar a loja */ }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) localStorage.setItem(CHAVE, JSON.stringify(itens));
  }, [itens, carregado]);

  const adicionar = useCallback((novo: Omit<ItemCarrinho, 'qtd'>): boolean => {
    let coube = true;
    setItens((atuais) => {
      const existente = atuais.find((item) => item.id === novo.id);
      if (!existente) return [...atuais, { ...novo, qtd: 1 }];
      if (existente.qtd >= existente.estoque) { coube = false; return atuais; }
      return atuais.map((item) => item.id === novo.id ? { ...item, qtd: item.qtd + 1 } : item);
    });
    return coube;
  }, []);

  const alterarQtd = useCallback((id: string, delta: number) => {
    setItens((atuais) => atuais.flatMap((item) => {
      if (item.id !== id) return [item];
      const nova = item.qtd + delta;
      if (nova <= 0) return [];
      if (nova > item.estoque) return [item];
      return [{ ...item, qtd: nova }];
    }));
  }, []);

  const valor = useMemo<ContextoCarrinho>(() => ({
    itens,
    total: itens.reduce((soma, item) => soma + item.preco * item.qtd, 0),
    quantidade: itens.reduce((soma, item) => soma + item.qtd, 0),
    adicionar,
    alterarQtd,
    remover: (id) => setItens((atuais) => atuais.filter((item) => item.id !== id)),
    limpar: () => setItens([]),
  }), [itens, adicionar, alterarQtd]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export { moeda } from '@/lib/formato';
