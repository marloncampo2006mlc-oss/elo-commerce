/**
 * Mapa de páginas da gestão e o privilégio que cada uma exige.
 *
 * Fonte única, consumida por três lugares que precisam concordar:
 *   - a guarda de cada página (bloqueia de fato)
 *   - o menu lateral (mostra só o que a pessoa alcança)
 *   - o redirecionamento de /gestao (leva à primeira página permitida)
 *
 * Antes, cada página apenas exigia "ter sessão". Como as páginas são
 * Server Components que chamam os serviços diretamente, sem passar pela
 * API, a verificação que existia nas rotas era contornada: um atendente
 * abria /gestao/bi e via o faturamento inteiro.
 */

export interface PaginaGestao {
  href: string;
  rotulo: string;
  grupo: 'Operação' | 'Atendimento' | 'Análise' | 'Administração';
  /** Privilégio necessário para abrir a página. */
  privilegio: string;
}

export const PAGINAS: PaginaGestao[] = [
  { href: '/gestao/painel',      rotulo: 'Painel',          grupo: 'Operação',      privilegio: 'bi.ver' },
  { href: '/gestao/produtos',    rotulo: 'Produtos',        grupo: 'Operação',      privilegio: 'catalogo.ver' },
  { href: '/gestao/pedidos',     rotulo: 'Pedidos',         grupo: 'Operação',      privilegio: 'pedidos.ver' },
  { href: '/gestao/clientes',    rotulo: 'Clientes',        grupo: 'Operação',      privilegio: 'clientes.ver' },
  { href: '/gestao/no-code',     rotulo: 'No-Code',         grupo: 'Atendimento',   privilegio: 'bots.editar' },
  { href: '/gestao/atendimento', rotulo: 'Atendimento',     grupo: 'Atendimento',   privilegio: 'atendimento.atender' },
  { href: '/gestao/bi',          rotulo: 'BI / Supervisão', grupo: 'Análise',       privilegio: 'bi.ver' },
  { href: '/gestao/usuarios',    rotulo: 'Usuários',        grupo: 'Administração', privilegio: 'usuarios.gerenciar' },
];

export const GRUPOS = ['Operação', 'Atendimento', 'Análise', 'Administração'] as const;

export type Grupo = (typeof GRUPOS)[number];

/** Páginas que a pessoa consegue abrir, na ordem do menu. */
export const paginasPermitidas = (privilegios: string[]): PaginaGestao[] =>
  PAGINAS.filter((pagina) => privilegios.includes(pagina.privilegio));

export interface MenuPrincipal {
  grupo: Grupo;
  submenus: PaginaGestao[];
}

/**
 * O menu em dois níveis, montado a partir de PAGINAS.
 *
 * Derivado, e não escrito à mão: uma segunda lista com os mesmos itens
 * sairia do lugar na primeira página nova que alguém adicionasse — e o
 * item existiria no sistema sem existir no menu. Aqui `PAGINAS` continua
 * sendo a única fonte, e a hierarquia é uma leitura dela.
 *
 * Grupo sem nenhum item permitido não vira menu: um título que abre e
 * não mostra nada é pior que a ausência dele.
 */
export function menusPermitidos(privilegios: string[]): MenuPrincipal[] {
  const permitidas = paginasPermitidas(privilegios);

  return GRUPOS
    .map((grupo) => ({
      grupo,
      submenus: permitidas.filter((pagina) => pagina.grupo === grupo),
    }))
    .filter((menu) => menu.submenus.length > 0);
}

/** A qual menu principal pertence a página aberta — usado para abri-lo sozinho. */
export const grupoDaPagina = (caminho: string): Grupo | null =>
  PAGINAS.find((pagina) => caminho === pagina.href || caminho.startsWith(`${pagina.href}/`))
    ?.grupo ?? null;

/**
 * Para onde mandar quem entra em /gestao.
 *
 * Não dá para fixar o painel: um atendente não tem `bi.ver` e cairia
 * direto num bloqueio logo após o login. A primeira página permitida é
 * sempre um destino válido.
 */
export function primeiraPaginaPermitida(privilegios: string[]): string | null {
  return paginasPermitidas(privilegios)[0]?.href ?? null;
}

export const privilegioDaPagina = (href: string): string | undefined =>
  PAGINAS.find((pagina) => pagina.href === href)?.privilegio;
