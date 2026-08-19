/**
 * Constantes sem nenhuma dependência de runtime.
 *
 * O middleware do Next roda no Edge Runtime, que não tem `node:crypto`.
 * Importar lib/sessao lá derrubava a aplicação inteira — então o que os
 * dois lados compartilham mora aqui, num módulo neutro.
 */
export const COOKIE_SESSAO = 'elo_sessao';
