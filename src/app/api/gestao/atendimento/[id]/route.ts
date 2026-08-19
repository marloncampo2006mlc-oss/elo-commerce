import type { NextRequest } from 'next/server';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { consultar, consultarUm } from '@/lib/db';
import { exigirSessao } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const GET = comTratamentoDeErro(async (_r: NextRequest, { params }: Contexto) => {
  await exigirSessao();
  const { id } = await params;
  const [conversa, eventos] = await Promise.all([
    atendimentoService.obter(id),
    atendimentoService.eventos(id),
  ]);

  // O atendente precisa do contexto do cliente sem sair da conversa.
  const cliente = conversa.atendimento.cliente_id
    ? await consultarUm(
        `SELECT nome, email, telefone, cidade, uf, total_pedidos, total_gasto
           FROM vw_clientes_resumo WHERE id = $1`,
        [conversa.atendimento.cliente_id])
    : null;

  const pedidos = conversa.atendimento.cliente_id
    ? await consultar(
        `SELECT numero, status, total, created_at FROM vw_pedidos_detalhados
          WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [conversa.atendimento.cliente_id])
    : [];

  return ok({ ...conversa, eventos, cliente: cliente ? { ...cliente, pedidos } : null });
});
