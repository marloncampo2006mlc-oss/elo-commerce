import { redirect } from 'next/navigation';
import { lerSessao } from '@/lib/sessao';
import { ProvedorToast } from '@/components/Toasts';
import { NavegacaoGestao } from '@/components/NavegacaoGestao';

/**
 * Layout da GESTÃO — área interna.
 *
 * A verificação de sessão acontece aqui, no servidor, antes de renderizar
 * qualquer página filha: o HTML administrativo nunca é gerado para quem
 * não está autenticado. O middleware faz o mesmo na borda; ter as duas
 * camadas é intencional.
 */
export default async function LayoutGestao({ children }: { children: React.ReactNode }) {
  const sessao = await lerSessao();
  if (!sessao) redirect('/login');

  return (
    <ProvedorToast>
      <div className="gestao">
        <NavegacaoGestao usuario={sessao} />
        <div className="conteudo">{children}</div>
      </div>
    </ProvedorToast>
  );
}
