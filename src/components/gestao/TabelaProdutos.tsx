'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { moeda } from '@/lib/formato';
import { useToast } from '@/components/Toasts';
import type { Produto } from '@/modules/catalogo/catalogo.types';
import { IconeCaixa } from '@/components/Icones';

export function TabelaProdutos({ produtos, categorias, total }: {
  produtos: Produto[]; categorias: string[]; total: number;
}) {
  const router = useRouter();
  const { sucesso, erro } = useToast();
  const [ajustando, setAjustando] = useState<Produto | null>(null);
  const [delta, setDelta] = useState('10');
  const [ocupado, setOcupado] = useState(false);

  async function ajustarEstoque() {
    if (!ajustando) return;
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/gestao/produtos/${ajustando.id}/estoque`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ajuste: Number(delta) }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha no ajuste');
      sucesso('Estoque atualizado', `${ajustando.nome}: ${corpo.data.estoque} unidades`);
      setAjustando(null);
      router.refresh();
    } catch (falha) {
      erro('Ajuste recusado', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="cartao">
        <div className="cartao__topo">
          <div><h3>Catálogo</h3><p>{total} produtos · {categorias.length} categorias</p></div>
        </div>

        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th><th>Categoria</th>
                <th className="num">Preço</th><th className="num">Estoque</th>
                <th>Situação</th><th />
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>
                    <div className="flex">
                      <span className="mini">
                        {produto.imagem?.startsWith('/')
                          ? <img src={produto.imagem} alt="" />
                          : <IconeCaixa tamanho={16} />}
                      </span>
                      <div>
                        <div style={{ fontWeight: 550 }}>{produto.nome}</div>
                        <div className="dim mono" style={{ fontSize: 11 }}>{produto.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="selo selo--violeta">{produto.categoria}</span></td>
                  <td className="num"><strong>{moeda(produto.preco)}</strong></td>
                  <td className="num">
                    <span className={`selo selo--${
                      produto.estoque === 0 ? 'vermelho' : produto.estoque <= 5 ? 'ambar' : 'verde'
                    }`}>{produto.estoque}</span>
                  </td>
                  <td>
                    <span className={`selo selo--${produto.ativo ? 'verde' : 'cinza'}`}>
                      {produto.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td className="acoes">
                    <button className="btn btn--sm" onClick={() => { setAjustando(produto); setDelta('10'); }}>
                      Ajustar estoque
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ajustando && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setAjustando(null)} />
          <div className="modal__caixa" role="dialog" aria-modal="true">
            <header className="modal__topo"><h2>Ajuste de estoque</h2></header>
            <div className="modal__corpo">
              <div className="flex" style={{ marginBottom: 16 }}>
                <span className="mini">
                  {ajustando.imagem?.startsWith('/')
                    ? <img src={ajustando.imagem} alt="" />
                    : <IconeCaixa tamanho={18} />}
                </span>
                <div>
                  <strong>{ajustando.nome}</strong>
                  <div className="dim mono" style={{ fontSize: 11.5 }}>{ajustando.sku}</div>
                </div>
                <span className="selo selo--violeta" style={{ marginLeft: 'auto' }}>
                  saldo: {ajustando.estoque}
                </span>
              </div>

              <div className="campo">
                <label htmlFor="ajuste">Ajuste (positivo entra, negativo sai)</label>
                <input id="ajuste" type="number" value={delta}
                       onChange={(evento) => setDelta(evento.target.value)} />
              </div>

              <div className="flex" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {[-10, -5, -1, 1, 5, 10, 50].map((valor) => (
                  <button key={valor} className="btn btn--sm" onClick={() => setDelta(String(valor))}>
                    {valor > 0 ? '+' : ''}{valor}
                  </button>
                ))}
              </div>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setAjustando(null)}>Cancelar</button>
                <button className="btn btn--primario" onClick={() => void ajustarEstoque()} disabled={ocupado}>
                  {ocupado ? 'Aplicando…' : 'Aplicar ajuste'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
