'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Filtros da vitrine. O estado real mora na URL — assim o resultado é
 * compartilhável, sobrevive ao refresh e o servidor continua sendo quem
 * consulta o banco.
 */
export function FiltrosVitrine({ categorias }: { categorias: string[] }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [busca, setBusca] = useState(parametros.get('busca') ?? '');

  // Debounce: evita uma navegação por tecla digitada.
  useEffect(() => {
    const atual = parametros.get('busca') ?? '';
    if (busca === atual) return;

    const tempo = setTimeout(() => {
      const novos = new URLSearchParams(parametros.toString());
      if (busca) novos.set('busca', busca);
      else novos.delete('busca');
      router.replace(`/?${novos.toString()}`);
    }, 350);

    return () => clearTimeout(tempo);
  }, [busca, parametros, router]);

  function alterar(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros.toString());
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    router.replace(`/?${novos.toString()}`);
  }

  return (
    <div className="filtros">
      <div className="busca">
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="O que você procura?"
          aria-label="Buscar produtos"
        />
      </div>

      <select className="filtro" aria-label="Categoria"
              value={parametros.get('categoria') ?? ''}
              onChange={(evento) => alterar('categoria', evento.target.value)}>
        <option value="">Todas as categorias</option>
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria}>{categoria}</option>
        ))}
      </select>

      <select className="filtro" aria-label="Ordenação"
              value={parametros.get('ordem') ?? 'nome'}
              onChange={(evento) => alterar('ordem', evento.target.value)}>
        <option value="nome">Ordenar por nome</option>
        <option value="preco_asc">Menor preço</option>
        <option value="preco_desc">Maior preço</option>
      </select>
    </div>
  );
}
