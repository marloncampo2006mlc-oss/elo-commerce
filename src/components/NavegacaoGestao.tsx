'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { grupoDaPagina, menusPermitidos, type Grupo } from '@/lib/paginas';
import type { SessaoUsuario } from '@/lib/sessao';
import {
  IconeAtendimento, IconeCaixaAberta, IconeChevron, IconeClientes, IconeEngrenagem,
  IconeFluxo, IconeGrafico, IconeLoja, IconePainel, IconePedidos, IconeProdutos,
  IconeSair, IconeUsuarios,
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

/** Ícone do menu principal — é o que aparece na faixa recolhida. */
const ICONES_GRUPO: Record<Grupo, ReactNode> = {
  'Operação': <IconeCaixaAberta />,
  'Atendimento': <IconeAtendimento />,
  'Análise': <IconeGrafico />,
  'Administração': <IconeEngrenagem />,
};

/**
 * Menu da gestão, montado a partir dos privilégios efetivos da pessoa.
 *
 * Esconder um item aqui é conveniência, não segurança: quem digitar a
 * URL direto ainda é barrado pela guarda da própria página.
 *
 * COMPORTAMENTO
 * Em repouso o menu é uma faixa estreita, só com os ícones dos menus
 * principais. Levar o mouse até ela abre a largura inteira, com os
 * rótulos; tirar o mouse recolhe de volta.
 *
 * A faixa existe em vez de o menu sumir por completo porque um menu
 * invisível é um menu que ninguém encontra — a pessoa precisaria
 * adivinhar que há algo na borda esquerda. A faixa mostra que existe e
 * convida o movimento.
 *
 * Aberto, ele passa POR CIMA do conteúdo, sem empurrá-lo. Se a página
 * reflowasse a cada passada de mouse, ler uma tabela viraria um exercício
 * de perseguir a linha que se moveu.
 */
export function NavegacaoGestao({ usuario, privilegios }: {
  usuario: SessaoUsuario;
  privilegios: string[];
}) {
  const caminho = usePathname();
  const router = useRouter();
  const menus = menusPermitidos(privilegios);

  /**
   * Qual menu principal está aberto. Um de cada vez: dois abertos
   * empurram o resto para fora da tela e reintroduzem a rolagem que a
   * hierarquia veio resolver.
   */
  const [aberto, setAberto] = useState<Grupo | null>(null);

  /**
   * Navegar abre sozinho o menu de quem chegou.
   *
   * Sem isso, entrar em /gestao/pedidos por um link mostraria todos os
   * menus fechados, e a pessoa não veria onde está.
   */
  useEffect(() => { setAberto(grupoDaPagina(caminho)); }, [caminho]);

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const iniciais = usuario.nome.split(/\s+/).slice(0, 2)
    .map((parte) => parte[0]).join('').toUpperCase();

  return (
    <aside className="lateral" aria-label="Navegação da gestão">
      <Link href={menus[0]?.submenus[0]?.href ?? '/'} className="lateral__marca">
        <span className="lateral__logo" aria-hidden="true">◆</span>
        <span className="lateral__rotulo">
          <strong>Elo Platform</strong>
          <span>gestão</span>
        </span>
      </Link>

      <nav className="lateral__nav">
        {menus.map(({ grupo, submenus }) => {
          const expandido = aberto === grupo;
          const contemAtual = submenus.some(
            (pagina) => caminho === pagina.href || caminho.startsWith(`${pagina.href}/`));

          return (
            <div key={grupo} className="menu">
              <button type="button"
                      className={`menu__principal ${contemAtual ? 'menu__principal--ativo' : ''}`}
                      aria-expanded={expandido}
                      onClick={() => setAberto((atual) => (atual === grupo ? null : grupo))}>
                <span className="lateral__icone">{ICONES_GRUPO[grupo]}</span>
                <span className="lateral__rotulo">{grupo}</span>
                <span className={`menu__seta ${expandido ? 'menu__seta--aberta' : ''}`}
                      aria-hidden="true">
                  <IconeChevron tamanho={14} />
                </span>
              </button>

              {/* A altura anima para o submenu deslizar em vez de saltar.
                  `hidden` só quando fechado E fora de transição manteria
                  o item fora da ordem de tabulação — aqui basta o
                  contêiner recortar. */}
              <div className={`menu__submenus ${expandido ? 'menu__submenus--abertos' : ''}`}>
                {/* O wrapper existe para a animação: a técnica de animar
                    de 0fr a 1fr exige UM filho na grade. Com os links
                    soltos, o segundo em diante virava linha implícita de
                    altura automática e o menu fechado continuava ocupando
                    espaço. */}
                <div className="menu__lista">
                {submenus.map((pagina) => {
                  const ativo = caminho === pagina.href || caminho.startsWith(`${pagina.href}/`);
                  return (
                    <Link key={pagina.href} href={pagina.href}
                          className={`submenu ${ativo ? 'submenu--ativo' : ''}`}
                          tabIndex={expandido ? undefined : -1}
                          aria-current={ativo ? 'page' : undefined}>
                      <span className="submenu__icone">{ICONES[pagina.href]}</span>
                      <span className="lateral__rotulo">{pagina.rotulo}</span>
                    </Link>
                  );
                })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="lateral__rodape">
        <BotaoTema variante="menu" />

        <Link href="/" className="lateral__item">
          <span className="lateral__icone"><IconeLoja /></span>
          <span className="lateral__rotulo">Ver a loja</span>
        </Link>

        <div className="lateral__perfil">
          <span className="lateral__avatar">{iniciais}</span>
          <span className="lateral__perfil-texto lateral__rotulo">
            <strong>{usuario.nome}</strong>
            <span>{usuario.papel} · {privilegios.length} privilégio(s)</span>
          </span>
        </div>

        <button className="btn btn--sm btn--bloco lateral__sair" onClick={() => void sair()}>
          <IconeSair /> <span className="lateral__rotulo">Sair</span>
        </button>
      </div>
    </aside>
  );
}
