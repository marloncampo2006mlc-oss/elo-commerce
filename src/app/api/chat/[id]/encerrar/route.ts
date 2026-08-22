import type { NextRequest } from 'next/server';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

/**
 * O cliente encerra a própria conversa.
 *
 * Pública como o resto de /api/chat/*: o UUID da conversa já é a
 * credencial — é o mesmo modelo usado para enviar mensagem e consultar
 * o histórico.
 */
export const POST = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  const { id } = await params;
  return ok(await atendimentoService.encerrarComoCliente(id));
});
