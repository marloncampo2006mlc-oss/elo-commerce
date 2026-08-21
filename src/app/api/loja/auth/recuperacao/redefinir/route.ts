import type { NextRequest } from 'next/server';
import { recuperacaoService } from '@/modules/loja/recuperacao.service';
import { redefinicaoSchema } from '@/modules/loja/acesso.schema';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

/** Passo 2: confere o código e grava a senha nova. */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const { email, codigo, senha } = redefinicaoSchema.parse(await request.json());
  const { nome } = await recuperacaoService.redefinir(email, codigo, senha);

  return ok({ nome: nome.split(' ')[0] });
});
