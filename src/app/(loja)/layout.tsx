import { ProvedorCarrinho } from '@/components/Carrinho';
import { ProvedorToast } from '@/components/Toasts';
import { WidgetChat } from '@/components/WidgetChat';
import { CabecalhoLoja } from '@/components/loja/CabecalhoLoja';

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
          <CabecalhoLoja />

          <main className="loja__conteudo">{children}</main>

          <WidgetChat />
        </div>
      </ProvedorCarrinho>
    </ProvedorToast>
  );
}
