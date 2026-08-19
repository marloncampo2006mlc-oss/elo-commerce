import Link from 'next/link';
import { ProvedorCarrinho } from '@/components/Carrinho';
import { ProvedorToast } from '@/components/Toasts';
import { WidgetChat } from '@/components/WidgetChat';
import { IndicadorCarrinho } from '@/components/IndicadorCarrinho';

/**
 * Layout da LOJA — área pública do cliente.
 *
 * Estruturalmente separado da gestão: outro cabeçalho, outra navegação,
 * outro ritmo visual. Um cliente nunca vê a sidebar administrativa.
 */
export default function LayoutLoja({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorToast>
      <ProvedorCarrinho>
        <div className="loja">
          <header className="loja__topo">
            <div className="loja__topo-interno">
              <Link href="/" className="loja__marca">
                <span className="loja__logo" aria-hidden="true">◆</span>
                <span>Elo Store</span>
              </Link>

              <nav className="loja__nav" aria-label="Navegação da loja">
                <Link href="/">Vitrine</Link>
                <Link href="/?categoria=Áudio">Áudio</Link>
                <Link href="/?categoria=Telefonia">Telefonia</Link>
                <Link href="/?categoria=Redes">Redes</Link>
              </nav>

              <div className="loja__acoes">
                <IndicadorCarrinho />
                <Link href="/gestao/painel" className="btn btn--sm btn--fantasma">
                  Área da gestão
                </Link>
              </div>
            </div>
          </header>

          <main className="loja__conteudo">{children}</main>

          <WidgetChat />
        </div>
      </ProvedorCarrinho>
    </ProvedorToast>
  );
}
