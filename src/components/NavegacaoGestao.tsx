'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GRUPOS, paginasPermitidas } from '@/lib/paginas';
import type { SessaoUsuario } from '@/lib/sessao';

/**
 * Menu da gestão, montado a partir dos privilégios efetivos da pessoa.
 *
 * Esconder um item aqui é conveniência, não segurança: quem digitar a
 * URL direto ainda é barrado pela guarda da própria página. Mas mostrar
 * um menu que leva a um bloqueio é uma experiência ruim — o menu deve
 * refletir o que a pessoa realmente alcança.
 */
export function NavegacaoGestao({ usuario, privilegios }: {
  usuario: SessaoUsuario;
  privilegios: string[];
}) {
  const caminho = usePathname();
  const router = useRouter();
  const permitidas = paginasPermitidas(privilegios);

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="lateral">
      <Link href={permitidas[0]?.href ?? '/'} className="lateral__marca">
        <span className="avatar" aria-hidden="true">◆</span>
        <span>
          <strong>Elo Platform</strong>
          <span>gestão</span>
        </span>
      </Link>

      <nav className="lateral__nav" aria-label="Navegação da gestão">
        {GRUPOS.map((grupo) => {
          const itens = permitidas.filter((pagina) => pagina.grupo === grupo);
          if (itens.length === 0) return null;   // grupo vazio não vira título órfão

          return (
            <div key={grupo}>
              <div className="lateral__grupo">{grupo}</div>
              {itens.map((pagina) => {
                const ativo = caminho === pagina.href || caminho.startsWith(`${pagina.href}/`);
                return (
                  <Link key={pagina.href} href={pagina.href}
                        className={`lateral__item ${ativo ? 'lateral__item--ativo' : ''}`}
                        aria-current={ativo ? 'page' : undefined}>
                    <span className="lateral__icone" aria-hidden="true">{pagina.icone}</span>
                    {pagina.rotulo}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="lateral__rodape">
        <Link href="/" className="lateral__item">
          <span className="lateral__icone" aria-hidden="true">◉</span>
          Ver a loja
        </Link>

        <div style={{ padding: '8px 11px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{usuario.nome}</div>
          <div className="dim" style={{ fontSize: 11 }}>
            {usuario.papel} · {privilegios.length} privilégio(s)
          </div>
        </div>

        <button className="btn btn--sm" onClick={() => void sair()}>Sair</button>
      </div>
    </aside>
  );
}
