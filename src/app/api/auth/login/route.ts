import type { NextRequest } from 'next/server';
import { authService } from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.schema';
import { criarSessao } from '@/lib/sessao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const entrada = loginSchema.parse(await request.json());
  const usuario = await authService.autenticar(entrada);
  await criarSessao(usuario, entrada.lembrar);
  return ok(usuario);
});
