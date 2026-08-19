import { AppError } from '../shared/errors.js';
import { env } from '../config/env.js';

/** Traduz erros do PostgreSQL para mensagens de negócio legíveis. */
function traduzirErroPostgres(err) {
  switch (err.code) {
    case '23505': { // unique_violation
      const campo = /Key \((.+?)\)=/.exec(err.detail)?.[1] ?? 'registro';
      return new AppError(`Já existe um registro com esse ${campo}`, 409);
    }
    case '23503': // foreign_key_violation
      return new AppError('Operação bloqueada: existem registros vinculados a este item', 409);
    case '23514': // check_violation
      return new AppError(`Valor fora das regras da coluna (${err.constraint})`, 422);
    case '22P02': // invalid_text_representation
      return new AppError('Identificador ou valor em formato inválido', 400);
    default:
      if (err.message?.startsWith('ESTOQUE_INSUFICIENTE'))
        return new AppError('Estoque insuficiente para um dos produtos do pedido', 409);
      return null;
  }
}

// eslint-disable-next-line no-unused-vars -- Express identifica o handler pelos 4 argumentos
export function errorHandler(err, req, res, _next) {
  const traduzido = err instanceof AppError ? err : traduzirErroPostgres(err);

  if (traduzido) {
    return res.status(traduzido.status).json({
      erro: traduzido.message,
      detalhes: traduzido.details ?? undefined,
    });
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    erro: 'Erro interno no servidor',
    detalhes: env.isDev ? err.message : undefined,
  });
}

export function notFound(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}
