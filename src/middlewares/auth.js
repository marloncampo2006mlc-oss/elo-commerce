import { AppError } from '../shared/errors.js';
import { COOKIE_SESSAO, lerCookie, tokenValido } from '../shared/session.js';
import { env } from '../config/env.js';

/**
 * Exige sessão administrativa válida.
 *
 * Aplicado nas rotas de GESTÃO (criar/editar/excluir cadastros e mudar
 * status de pedido). O fluxo do cliente na loja — navegar, comprar e
 * conversar com o bot — permanece público, porque é justamente o que a
 * demonstração precisa mostrar funcionando.
 */
export function requireAuth(req, _res, next) {
  if (!env.session.configurado) {
    // Sem SESSION_SECRET/ADMIN_PASSWORD, negamos a escrita em vez de liberar.
    return next(new AppError(
      'Área administrativa indisponível: sessão não configurada no servidor', 503));
  }

  if (!tokenValido(lerCookie(req, COOKIE_SESSAO))) {
    return next(new AppError('Faça login para executar esta operação', 401));
  }

  next();
}

/** Só informa se há sessão, sem bloquear — usado pelo front para ajustar a UI. */
export const sessaoAtiva = (req) => tokenValido(lerCookie(req, COOKIE_SESSAO));
