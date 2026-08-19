'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { moeda } from '@/lib/formato';
import { SeloStatus } from '@/components/SeloStatus';
import { useToast } from '@/components/Toasts';
import { TRANSICOES, type Pedido, type StatusPedido } from '@/modules/pedidos/pedidos.types';

/**
 * A tabela importa TRANSICOES do domínio — a mesma fonte que o servidor
 * usa para validar. Antes essa regra vivia duplicada no frontend.
 */
export function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter();
  const { sucesso, erro } = useToast();
  const [alterando, setAlterando] = useState<Pedido | null>(null);

  async function mudarStatus(pedido: Pedido, novo: StatusPedido) {
    try {
      const resposta = await fetch(`/api/gestao/pedidos/${pedido.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Transição recusada');
      sucesso('Status atualizado', `Pedido #${pedido.numero} → ${novo.replace(/_/g, ' ')}`);
      setAlterando(null);
      router.refresh();
    } catch (falha) {
      erro('Transição recusada', falha instanceof Error ? falha.message : 'Erro');
    }
  }

  return (
    <>
      <div className="cartao">
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th><th>Cliente</th><th>Canal</th>
                <th className="num">Itens</th><th className="num">Total</th>
                <th>Status</th><th>Data</th><th />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const proximos = TRANSICOES[pedido.status];
                return (
                  <tr key={pedido.id}>
                    <td className="mono"><strong>#{pedido.numero}</strong></td>
                    <td>
                      <div style={{ fontWeight: 550 }}>{pedido.cliente_nome}</div>
                      <div className="dim" style={{ fontSize: 11.5 }}>
                        {pedido.cliente_cidade}{pedido.cliente_uf && `/${pedido.cliente_uf}`}
                      </div>
                    </td>
                    <td><span className="selo selo--ciano">{pedido.canal}</span></td>
                    <td className="num">{pedido.qtd_pecas}</td>
                    <td className="num"><strong>{moeda(pedido.total)}</strong></td>
                    <td><SeloStatus valor={pedido.status} /></td>
                    <td className="dim">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="acoes">
                      {proximos.length > 0 && (
                        <button className="btn btn--sm" onClick={() => setAlterando(pedido)}>
                          Avançar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {alterando && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setAlterando(null)} />
          <div className="modal__caixa" role="dialog" aria-modal="true">
            <header className="modal__topo"><h2>Pedido #{alterando.numero}</h2></header>
            <div className="modal__corpo">
              <p className="dim" style={{ marginBottom: 14 }}>
                Status atual: <SeloStatus valor={alterando.status} /> — escolha a próxima etapa.
                Cancelar devolve as unidades ao estoque automaticamente.
              </p>

              <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                {TRANSICOES[alterando.status].map((status) => (
                  <button key={status}
                          className={`btn ${status === 'cancelado' ? 'btn--perigo' : 'btn--primario'}`}
                          onClick={() => void mudarStatus(alterando, status)}>
                    {status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setAlterando(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
