'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconeBusca, IconeFiltro } from './loja/IconesLoja';

/**
 * Filtros da vitrine. O estado real mora na URL — assim o resultado é
 * compartilhável, sobrevive ao refresh e o servidor continua sendo quem
 * consulta o banco.
 */
export function FiltrosVitrine({ categorias }: { categorias: string[] }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [busca, setBusca] = useState(parametros.get('busca') ?? '');
  const [avancados, setAvancados] = useState(false);

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

  const temFiltro = Boolean(parametros.get('categoria') || parametros.get('busca'));

  return (
    <>
      <div className="filtros">
        <div className="campo-busca">
          <span className="campo-busca__icone"><IconeBusca /></span>
          <input value={busca} onChange={(evento) => setBusca(evento.target.value)}
                 placeholder="O que você procura?" aria-label="Buscar produtos" />
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

        <button className={`btn filtro-botao ${avancados ? 'filtro-botao--ativo' : ''}`}
                onClick={() => setAvancados((atual) => !atual)}
                aria-expanded={avancados}>
          <IconeFiltro /> Filtros
        </button>
      </div>

      {avancados && (
        <div className="filtros-avancados">
          <div className="filtros-avancados__grupo">
            <span className="filtros-avancados__rotulo">Faixa de preço</span>
            <div className="flex" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[
                { rotulo: 'Até R$ 500', valor: '0-500' },
                { rotulo: 'R$ 500 a 2.000', valor: '500-2000' },
                { rotulo: 'Acima de R$ 2.000', valor: '2000-' },
              ].map((faixa) => (
                <button key={faixa.valor}
                        className={`btn btn--sm ${
                          parametros.get('faixa') === faixa.valor ? 'btn--primario' : ''}`}
                        onClick={() => alterar('faixa',
                          parametros.get('faixa') === faixa.valor ? '' : faixa.valor)}>
                  {faixa.rotulo}
                </button>
              ))}
            </div>
          </div>

          {temFiltro && (
            <button className="btn btn--sm" onClick={() => router.replace('/')}>
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </>
  );
}
