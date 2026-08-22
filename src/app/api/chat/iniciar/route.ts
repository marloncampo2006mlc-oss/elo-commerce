import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

const corpoSchema = z.object({
  canal: z.enum(['chatbot', 'ura', 'whatsapp']).default('chatbot'),
  clienteId: z.string().uuid().nullish(),
  /** Conversa que o widget tinha aberta — encerrada ao abrir esta. */
  anteriorId: z.string().uuid().nullish(),
});

/**
 * Abre uma conversa na loja — rota pública, é o widget do cliente.
 * O fluxo usado é sempre a versão publicada do bot ativo: nada de
 * conteúdo hardcoded no widget.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const corpo = await request.json().catch(() => ({}));
  const { canal, clienteId, anteriorId } = corpoSchema.parse(corpo);
  return ok(await atendimentoService.iniciar({ canal, clienteId, anteriorId }), 201);
});
