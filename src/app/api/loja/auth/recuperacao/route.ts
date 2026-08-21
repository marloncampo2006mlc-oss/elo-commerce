import type { NextRequest } from 'next/server';
import { recuperacaoService } from '@/modules/loja/recuperacao.service';
import { recuperacaoSchema } from '@/modules/loja/acesso.schema';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

/**
 * Passo 1 da recuperação: gera o código.
 *
 * Devolve o código no corpo porque não há serviço de e-mail configurado
 * — a tela o exibe no lugar da caixa de entrada. Trocar isso por um
 * envio real muda só esta rota: o serviço já trata o código como algo
 * que a pessoa recebe por fora.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const { email } = recuperacaoSchema.parse(await request.json());
  const { codigo, nome } = await recuperacaoService.solicitar(email);

  return ok({ codigo, nome: nome.split(' ')[0], validadeMinutos: 15 });
});
