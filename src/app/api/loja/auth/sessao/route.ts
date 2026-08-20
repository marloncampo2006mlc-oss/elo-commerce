import { lerSessaoCliente } from '@/lib/sessaoCliente';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const GET = comTratamentoDeErro(async () => {
  const cliente = await lerSessaoCliente();
  return ok({ autenticado: Boolean(cliente), cliente });
});
