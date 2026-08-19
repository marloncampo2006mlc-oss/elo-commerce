/** Erro de aplicação com status HTTP semântico. */
export class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const NotFound     = (recurso) => new AppError(`${recurso} não encontrado(a)`, 404);
export const Conflict     = (msg)     => new AppError(msg, 409);
export const BadRequest   = (msg, d)  => new AppError(msg, 400, d);
export const Unprocessable= (msg, d)  => new AppError(msg, 422, d);
