'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { moeda } from '@/lib/formato';
import { useCarrinho } from './Carrinho';
import { useToast } from './Toasts';
import { IconeCarrinho } from './loja/IconesLoja';
import { AcessoCliente } from './loja/AcessoCliente';
import { Pagamento } from './loja/Pagamento';
import { IconeCaixa, IconeFechar } from '@/components/Icones';

interface ClienteSessao { id: string; nome: string; email: string }

export function PainelCarrinho({ cliente }: { cliente: ClienteSessao | null }) {
  const { itens, total, alterarQtd, remover, limpar } = useCarrinho();
  const { erro } = useToast();
  const router = useRouter();

  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState<{ id: string; numero: number; total: number } | null>(null);

  async function finalizar() {
    if (itens.length === 0) return;
    setEnviando(true);

    try {
      const resposta = await fetch('/api/loja/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observacao: observacao || null,
          itens: itens.map((item) => ({ produto_id: item.id, quantidade: item.qtd })),
        }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Não foi possível finalizar');

      setPedido({ id: corpo.data.id, numero: corpo.data.numero, total: corpo.data.total });
      limpar();
      router.refresh();   // a vitrine recalcula o estoque
    } catch (falha) {
      erro('Não foi possível finalizar', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  /* Pedido criado: segue para o pagamento. */
  if (pedido) {
    return (
      <div className="caixa-etapa">
        <Pagamento pedidoId={pedido.id} numero={pedido.numero} total={pedido.total} />
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="cartao">
        <div className="vazio">
          <div className="vazio__icone"><IconeCarrinho tamanho={26} /></div>
          <strong>Seu carrinho está vazio</strong>
          <p>Adicione produtos da vitrine para continuar.</p>
          <Link href="/" className="btn" style={{ marginTop: 16 }}>Ver produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="cartao cartao--pad">
        <h1 style={{ fontSize: 20, marginBottom: 14 }}>Seu carrinho</h1>

        {itens.map((item) => (
          <div key={item.id} className="carrinho-linha">
            <div className="mini">
              {item.imagem?.startsWith('/')
                ? <img src={item.imagem} alt={item.nome} />
                : <IconeCaixa tamanho={18} />}
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
                    aria-label={`Remover ${item.nome}`}><IconeFechar tamanho={13} /></button>
          </div>
        ))}
      </div>

      <aside className="cartao cartao--pad checkout__lado">
        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Resumo</h2>

        <div className="total-linha"><span>Subtotal</span><span>{moeda(total)}</span></div>
        <div className="total-linha">
          <span>Frete</span><span style={{ color: 'var(--verde)' }}>grátis</span>
        </div>
        <div className="total-linha total-linha--destaque">
          <span>Total</span><span>{moeda(total)}</span>
        </div>

        {cliente ? (
          <>
            <div className="checkout__cliente">
              <span className="avatar">{cliente.nome.slice(0, 2).toUpperCase()}</span>
              <span>
                <strong>{cliente.nome}</strong>
                <span className="dim" style={{ display: 'block', fontSize: 11.5 }}>
                  {cliente.email}
                </span>
              </span>
            </div>

            <div className="campo" style={{ marginTop: 14 }}>
              <label htmlFor="obs">Observação</label>
              <input id="obs" value={observacao} maxLength={500}
                     onChange={(evento) => setObservacao(evento.target.value)}
                     placeholder="Ex.: entregar à tarde" />
            </div>

            <button className="btn btn--primario btn--bloco" style={{ marginTop: 18 }}
                    onClick={() => void finalizar()} disabled={enviando}>
              {enviando ? 'Processando…' : 'Ir para o pagamento'}
            </button>
          </>
        ) : (
          /* Sem sessão, o checkout vira a tela de acesso. Pedir login só
             na hora de pagar evita barrar quem ainda está navegando. */
          <div style={{ marginTop: 18 }}>
            <AcessoCliente />
          </div>
        )}
      </aside>
    </div>
  );
}
