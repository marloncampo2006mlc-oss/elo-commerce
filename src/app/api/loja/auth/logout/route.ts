import { encerrarSessaoCliente } from '@/lib/sessaoCliente';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const POST = comTratamentoDeErro(async () => {
  await encerrarSessaoCliente();
  return ok({ autenticado: false });
});
