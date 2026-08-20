import { lerSessao } from '@/lib/sessao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const POST = undefined;

/** Consulta leve usada pelo front para saber se há sessão ativa. */
export const GET = comTratamentoDeErro(async () => {
  const usuario = await lerSessao();
  return ok({ autenticado: Boolean(usuario), usuario });
});
