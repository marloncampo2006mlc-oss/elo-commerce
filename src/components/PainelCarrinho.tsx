'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { moeda } from '@/lib/formato';
import { useCarrinho } from './Carrinho';
import { useToast } from './Toasts';
import { IconeCarrinho } from './loja/IconesLoja';

interface ClienteOpcao { id: string; nome: string; email: string }

export function PainelCarrinho({ clientes }: { clientes: ClienteOpcao[] }) {
  const { itens, total, alterarQtd, remover, limpar } = useCarrinho();
  const { sucesso, erro } = useToast();
  const router = useRouter();

  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoFeito, setPedidoFeito] = useState<{ numero: number; total: number } | null>(null);

  async function finalizar() {
    if (!clienteId || itens.length === 0) return;
    setEnviando(true);

    try {
      const resposta = await fetch('/api/loja/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          canal: 'site',
          observacao: observacao || null,
          itens: itens.map((item) => ({ produto_id: item.id, quantidade: item.qtd })),
        }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Não foi possível finalizar');

      setPedidoFeito({ numero: corpo.data.numero, total: corpo.data.total });
      limpar();
      sucesso('Compra realizada!', `Pedido #${corpo.data.numero}`);
      router.refresh();   // a vitrine recalcula o estoque
    } catch (falha) {
      erro('Não foi possível finalizar', falha instanceof Error ? falha.message : 'Erro inesperado');
    } finally {
      setEnviando(false);
    }
  }

  if (pedidoFeito) {
    return (
      <div className="cartao cartao--pad" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Pedido confirmado</h1>
        <p className="dim" style={{ marginBottom: 18 }}>
          Pedido <strong>#{pedidoFeito.numero}</strong> · {moeda(pedidoFeito.total)}
        </p>
        <p className="dim" style={{ fontSize: 13, marginBottom: 22 }}>
          O estoque já foi baixado e o pedido aparece na gestão. Você pode consultar o andamento
          pelo assistente virtual, informando o número do pedido.
        </p>
        <Link href="/" className="btn btn--primario">Voltar à vitrine</Link>
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="cartao">
        <div className="vazio">
          <div className="vazio__icone"><IconeCarrinho tamanho={26} /></div>
          <strong>Seu carrinho está vazio</strong>
          <p style={{ marginTop: 6 }}>Adicione produtos da vitrine para continuar.</p>
          <Link href="/" className="btn" style={{ marginTop: 16 }}>Ver produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
      <div className="cartao cartao--pad">
        <h1 style={{ fontSize: 20, marginBottom: 14 }}>Seu carrinho</h1>

        {itens.map((item) => (
          <div key={item.id} className="carrinho-linha">
            <div className="mini">
              {item.imagem?.startsWith('/')
                ? <img src={item.imagem} alt={item.nome} />
                : <span>📦</span>}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550 }}>{item.nome}</div>
              <div className="dim" style={{ fontSize: 12 }}>{moeda(item.preco)} cada</div>
            </div>

            <div className="qtd">
              <button onClick={() => alterarQtd(item.id, -1)} aria-label="Diminuir">−</button>
              <span>{item.qtd}</span>
              <button onClick={() => alterarQtd(item.id, +1)} aria-label="Aumentar">+</button>
            </div>

            <strong style={{ minWidth: 96, textAlign: 'right' }}>
              {moeda(item.preco * item.qtd)}
            </strong>

            <button className="btn btn--sm btn--perigo" onClick={() => remover(item.id)}
                    aria-label={`Remover ${item.nome}`}>✕</button>
          </div>
        ))}
      </div>

      <aside className="cartao cartao--pad" style={{ position: 'sticky', top: 90 }}>
        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Resumo</h2>

        <div className="total-linha"><span>Subtotal</span><span>{moeda(total)}</span></div>
        <div className="total-linha">
          <span>Frete</span><span style={{ color: 'var(--verde)' }}>grátis</span>
        </div>
        <div className="total-linha total-linha--destaque">
          <span>Total</span><span>{moeda(total)}</span>
        </div>

        <div className="campo" style={{ marginTop: 18 }}>
          <label htmlFor="cliente">Comprando como</label>
          <select id="cliente" value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ marginTop: 12 }}>
          <label htmlFor="obs">Observação</label>
          <input id="obs" value={observacao} maxLength={500}
                 onChange={(evento) => setObservacao(evento.target.value)}
                 placeholder="Ex.: entregar à tarde" />
        </div>

        <button className="btn btn--primario btn--bloco" style={{ marginTop: 18 }}
                onClick={() => void finalizar()} disabled={enviando || !clienteId}>
          {enviando ? 'Processando…' : 'Finalizar compra'}
        </button>
      </aside>
    </div>
  );
}
