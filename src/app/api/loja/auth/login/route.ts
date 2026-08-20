import type { NextRequest } from 'next/server';
import { acessoService } from '@/modules/loja/acesso.service';
import { loginClienteSchema } from '@/modules/loja/acesso.schema';
import { criarSessaoCliente } from '@/lib/sessaoCliente';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const { email, senha } = loginClienteSchema.parse(await request.json());
  const cliente = await acessoService.autenticar(email, senha);
  await criarSessaoCliente(cliente);
  return ok(cliente);
});
