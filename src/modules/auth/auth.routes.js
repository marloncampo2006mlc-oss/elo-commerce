import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../shared/validate.js';
import { asyncHandler, ok } from '../../shared/http.js';
import { AppError } from '../../shared/errors.js';
import {
  criarToken, senhaConfere, montarCookieSessao, montarCookieExpirado,
} from '../../shared/session.js';
import { sessaoAtiva } from '../../middlewares/auth.js';
import { env } from '../../config/env.js';

const loginSchema = z.object({
  senha: z.string().min(1, 'Informe a senha de acesso').max(200),
});

export const authRoutes = Router();

/** Estado da sessão: o front usa para decidir o que exibir. */
authRoutes.get('/sessao', (req, res) =>
  ok(res, { autenticado: sessaoAtiva(req), configurado: env.session.configurado }));

authRoutes.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  if (!env.session.configurado) {
    throw new AppError('Área administrativa indisponível: sessão não configurada', 503);
  }

  if (!senhaConfere(req.body.senha)) {
    // Atraso pequeno desestimula tentativa automatizada de senha.
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw new AppError('Senha incorreta', 401);
  }

  res.setHeader('Set-Cookie', montarCookieSessao(criarToken()));
  ok(res, { autenticado: true });
}));

authRoutes.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', montarCookieExpirado());
  ok(res, { autenticado: false });
});
