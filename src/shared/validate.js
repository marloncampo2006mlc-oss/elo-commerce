import { ZodError } from 'zod';
import { AppError } from './errors.js';

/**
 * Middleware-fábrica de validação. Substitui req[origem] pelo dado já
 * validado e convertido, então o controller nunca vê entrada crua.
 */
export const validate = (schema, origem = 'body') => (req, _res, next) => {
  try {
    req[origem] = schema.parse(req[origem]);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({
        campo: i.path.join('.') || '(raiz)',
        mensagem: i.message,
      }));
      return next(new AppError('Dados inválidos', 422, details));
    }
    next(err);
  }
};
