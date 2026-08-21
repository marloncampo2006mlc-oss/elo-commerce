import Link from 'next/link';
import { carregarAcesso } from '@/lib/guardaPagina';
import { primeiraPaginaPermitida, paginasPermitidas } from '@/lib/paginas';
import { BarraGestao } from '@/components/BarraGestao';
import { IconeCadeado } from '@/components/Icones';

export const dynamic = 'force-dynamic';

/**
 * Página de recusa. Em vez de só dizer "não pode", mostra o que a pessoa
 * PODE abrir — quem foi barrado normalmente está tentando trabalhar, não
 * invadir.
 */
export default async function SemAcesso() {
  const { sessao, privilegios } = await carregarAcesso();
  const permitidas = paginasPermitidas(privilegios);
  const primeira = primeiraPaginaPermitida(privilegios);

  return (
    <>
      <BarraGestao titulo="Acesso restrito" subtitulo="Esta área não faz parte do seu perfil" />

      <div className="pagina">
        <div className="cartao cartao--pad" style={{ maxWidth: 560 }}>
          <div className="aviso__icone" aria-hidden="true"><IconeCadeado tamanho={26} /></div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>
            Seu perfil não alcança esta página
          </h2>
          <p className="dim" style={{ marginBottom: 20 }}>
            Você está como <strong>{sessao.papel}</strong>. Se precisa deste acesso para
            trabalhar, peça a um administrador — ele consegue liberar privilégio por
            privilégio em Usuários.
          </p>

          {permitidas.length > 0 ? (
            <>
              <div className="lateral__grupo" style={{ paddingLeft: 0 }}>Onde você pode ir</div>
              <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                {permitidas.map((pagina) => (
                  <Link key={pagina.href} href={pagina.href}
                        className={`btn btn--sm ${pagina.href === primeira ? 'btn--primario' : ''}`}>
                    {pagina.rotulo}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="dim">
              Nenhuma área liberada no momento. Fale com um administrador.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
