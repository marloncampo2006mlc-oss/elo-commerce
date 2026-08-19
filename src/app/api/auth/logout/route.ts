import { encerrarSessao } from '@/lib/sessao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const POST = comTratamentoDeErro(async () => {
  await encerrarSessao();
  return ok({ autenticado: false });
});
