import type { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { z } from 'zod';
import { lerSessaoCliente } from '@/lib/sessaoCliente';
import { consultarUm, executar } from '@/lib/db';
import { dadosPix, gerarBrCode, referenciaPix } from '@/lib/pix';
import { comTratamentoDeErro, NaoAutorizado, NaoEncontrado } from '@/lib/erros';
import { ok } from '@/lib/api';

const corpoSchema = z.object({
  pedidoId: z.string().uuid(),
  forma: z.enum(['pix', 'credito', 'debito']),
});

/**
 * Registra a forma de pagamento e, no caso do Pix, devolve o BR Code.
 *
 * O código é montado no servidor: a chave de recebimento vem de variável
 * de ambiente e não deve chegar ao navegador por outro caminho que não
 * o próprio payload da cobrança.
 */
export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  const cliente = await lerSessaoCliente();
  if (!cliente) throw NaoAutorizado('Entre na sua conta para concluir o pagamento');

  const { pedidoId, forma } = corpoSchema.parse(await request.json());

  const pedido = await consultarUm<{ numero: number; total: number; cliente_id: string }>(
    'SELECT numero, total, cliente_id FROM pedidos WHERE id = $1', [pedidoId]);

  if (!pedido) throw NaoEncontrado('Pedido');
  // Sem esta checagem, trocar o id na requisição exporia a cobrança de
  // outra pessoa — inclusive o valor que ela gastou.
  if (pedido.cliente_id !== cliente.id) throw NaoAutorizado('Este pedido não é seu');

  const referencia = referenciaPix(pedido.numero);

  await executar(
    'UPDATE pedidos SET forma_pagamento = $2, pagamento_referencia = $3 WHERE id = $1',
    [pedidoId, forma, referencia]);

  if (forma !== 'pix') {
    return ok({ forma, referencia, numero: pedido.numero, total: pedido.total });
  }

  const dados = dadosPix(pedido.total, referencia);
  const brCode = gerarBrCode(dados);

  const qrcode = await QRCode.toString(brCode, {
    type: 'svg', margin: 1, width: 260,
    color: { dark: '#0b1020', light: '#ffffff' },
  });

  return ok({
    forma, referencia, numero: pedido.numero, total: pedido.total,
    brCode, qrcode,
    beneficiario: dados.beneficiario,
    demonstracao: dados.demonstracao,
  });
});
