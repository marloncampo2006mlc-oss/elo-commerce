'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCarrinho } from '@/components/Carrinho';
import { IconeCarrinho } from './IconesLoja';
import { BotaoTema } from '@/components/BotaoTema';

const CATEGORIAS_MENU = ['Áudio', 'Telefonia', 'Redes'];

/**
 * A loja não expõe atalho para a gestão.
 *
 * Quem trabalha na operação chega por /gestao ou pelo favorito; o
 * cliente final nunca deveria ver que existe uma área interna. Misturar
 * as duas audiências no mesmo cabeçalho confunde a mais numerosa.
 */

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
          <BotaoTema />

          <Link href="/carrinho" className="botao-topo"
                aria-label={`Carrinho com ${quantidade} item(ns)`}>
            <IconeCarrinho />
            {quantidade > 0 && <span className="botao-topo__contador">{quantidade}</span>}
          </Link>

        </div>
      </div>
    </header>
  );
}
