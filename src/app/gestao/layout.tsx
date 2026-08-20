import { carregarAcesso } from '@/lib/guardaPagina';
import { ProvedorToast } from '@/components/Toasts';
import { NavegacaoGestao } from '@/components/NavegacaoGestao';

/**
 * Layout da GESTÃO — área interna.
 *
 * Carrega o acesso efetivo uma vez e o repassa ao menu. Cada página
 * ainda faz a própria verificação: o layout não pode substituí-la,
 * porque quem digita a URL de uma página específica precisa ser barrado
 * naquela página, e não apenas ver um menu diferente.
 */
export default async function LayoutGestao({ children }: { children: React.ReactNode }) {
  const { sessao, privilegios } = await carregarAcesso();

  return (
    <ProvedorToast>
      <div className="gestao">
        <NavegacaoGestao usuario={sessao} privilegios={privilegios} />
        <div className="conteudo">{children}</div>
      </div>
    </ProvedorToast>
  );
}
