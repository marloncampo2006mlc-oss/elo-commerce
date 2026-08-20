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
  icone: string;
  grupo: 'Operação' | 'Atendimento' | 'Análise' | 'Administração';
  /** Privilégio necessário para abrir a página. */
  privilegio: string;
}

export const PAGINAS: PaginaGestao[] = [
  { href: '/gestao/painel',      rotulo: 'Painel',          icone: '◈', grupo: 'Operação',      privilegio: 'bi.ver' },
  { href: '/gestao/produtos',    rotulo: 'Produtos',        icone: '▤', grupo: 'Operação',      privilegio: 'catalogo.ver' },
  { href: '/gestao/pedidos',     rotulo: 'Pedidos',         icone: '▦', grupo: 'Operação',      privilegio: 'pedidos.ver' },
  { href: '/gestao/clientes',    rotulo: 'Clientes',        icone: '◍', grupo: 'Operação',      privilegio: 'clientes.ver' },
  { href: '/gestao/no-code',     rotulo: 'No-Code',         icone: '⬡', grupo: 'Atendimento',   privilegio: 'bots.editar' },
  { href: '/gestao/atendimento', rotulo: 'Atendimento',     icone: '◐', grupo: 'Atendimento',   privilegio: 'atendimento.atender' },
  { href: '/gestao/bi',          rotulo: 'BI / Supervisão', icone: '◔', grupo: 'Análise',       privilegio: 'bi.ver' },
  { href: '/gestao/usuarios',    rotulo: 'Usuários',        icone: '◍', grupo: 'Administração', privilegio: 'usuarios.gerenciar' },
];

export const GRUPOS = ['Operação', 'Atendimento', 'Análise', 'Administração'] as const;

/** Páginas que a pessoa consegue abrir, na ordem do menu. */
export const paginasPermitidas = (privilegios: string[]): PaginaGestao[] =>
  PAGINAS.filter((pagina) => privilegios.includes(pagina.privilegio));

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
