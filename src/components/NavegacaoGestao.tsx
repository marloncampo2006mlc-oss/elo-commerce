'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { GRUPOS, paginasPermitidas } from '@/lib/paginas';
import type { SessaoUsuario } from '@/lib/sessao';
import {
  IconeAtendimento, IconeClientes, IconeFluxo, IconeGrafico, IconeLoja,
  IconePainel, IconePedidos, IconeProdutos, IconeSair, IconeUsuarios,
} from './Icones';
import { BotaoTema } from './BotaoTema';

/** Cada rota tem seu ícone; a chave é o href, que já é único. */
const ICONES: Record<string, ReactNode> = {
  '/gestao/painel': <IconePainel />,
  '/gestao/produtos': <IconeProdutos />,
  '/gestao/pedidos': <IconePedidos />,
  '/gestao/clientes': <IconeClientes />,
  '/gestao/no-code': <IconeFluxo />,
  '/gestao/atendimento': <IconeAtendimento />,
  '/gestao/bi': <IconeGrafico />,
  '/gestao/usuarios': <IconeUsuarios />,
};

/**
 * Menu da gestão, montado a partir dos privilégios efetivos da pessoa.
 *
 * Esconder um item aqui é conveniência, não segurança: quem digitar a
 * URL direto ainda é barrado pela guarda da própria página.
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

  const iniciais = usuario.nome.split(/\s+/).slice(0, 2)
    .map((parte) => parte[0]).join('').toUpperCase();

  return (
    <aside className="lateral">
      <Link href={permitidas[0]?.href ?? '/'} className="lateral__marca">
        <span className="lateral__logo" aria-hidden="true">◆</span>
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
                    <span className="lateral__icone">{ICONES[pagina.href]}</span>
                    {pagina.rotulo}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="lateral__rodape">
        <BotaoTema variante="menu" />

        <Link href="/" className="lateral__item">
          <span className="lateral__icone"><IconeLoja /></span>
          Ver a loja
        </Link>

        <div className="lateral__perfil">
          <span className="lateral__avatar">{iniciais}</span>
          <span className="lateral__perfil-texto">
            <strong>{usuario.nome}</strong>
            <span>{usuario.papel} · {privilegios.length} privilégio(s)</span>
          </span>
        </div>

        <button className="btn btn--sm btn--bloco" onClick={() => void sair()}>
          <IconeSair /> Sair
        </button>
      </div>
    </aside>
  );
}
