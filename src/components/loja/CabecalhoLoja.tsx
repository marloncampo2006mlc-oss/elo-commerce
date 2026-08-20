'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCarrinho } from '@/components/Carrinho';
import { IconeCarrinho, IconeGestao } from './IconesLoja';

const CATEGORIAS_MENU = ['Áudio', 'Telefonia', 'Redes'];

export function CabecalhoLoja() {
  const { quantidade } = useCarrinho();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const categoriaAtual = parametros.get('categoria');

  // "Vitrine" fica ativa quando estamos na home sem filtro de categoria.
  const naVitrine = caminho === '/' && !categoriaAtual;

  return (
    <header className="topo">
      <div className="topo__interno">
        <Link href="/" className="topo__marca">
          <span className="topo__logo" aria-hidden="true">◆</span>
          <span>Elo Store</span>
        </Link>

        <nav className="topo__nav" aria-label="Categorias">
          <Link href="/" className={naVitrine ? 'topo__link topo__link--ativo' : 'topo__link'}
                aria-current={naVitrine ? 'page' : undefined}>
            Vitrine
          </Link>
          {CATEGORIAS_MENU.map((categoria) => {
            const ativo = categoriaAtual === categoria;
            return (
              <Link key={categoria} href={`/?categoria=${encodeURIComponent(categoria)}`}
                    className={ativo ? 'topo__link topo__link--ativo' : 'topo__link'}
                    aria-current={ativo ? 'page' : undefined}>
                {categoria}
              </Link>
            );
          })}
        </nav>

        <div className="topo__acoes">
          <Link href="/carrinho" className="botao-topo"
                aria-label={`Carrinho com ${quantidade} item(ns)`}>
            <IconeCarrinho />
            {quantidade > 0 && <span className="botao-topo__contador">{quantidade}</span>}
          </Link>

          <Link href="/gestao" className="botao-topo botao-topo--largo">
            <IconeGestao />
            <span>Área da gestão</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
