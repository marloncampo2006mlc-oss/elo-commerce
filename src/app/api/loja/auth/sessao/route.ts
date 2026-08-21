import { lerSessaoCliente } from '@/lib/sessaoCliente';
import { googleConfigurado } from '@/modules/loja/google';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

/**
 * Estado do acesso do cliente.
 *
 * Devolve junto quais provedores sociais estão configurados. É um
 * booleano, nunca a credencial: a tela precisa saber se pode oferecer o
 * botão, e oferecer um caminho que o servidor vai recusar é pior do que
 * não oferecer — a pessoa clica, sai da loja e volta com um erro.
 */
export const GET = comTratamentoDeErro(async () => {
  const cliente = await lerSessaoCliente();
  return ok({
    autenticado: Boolean(cliente),
    cliente,
    provedores: { google: googleConfigurado() },
  });
});
