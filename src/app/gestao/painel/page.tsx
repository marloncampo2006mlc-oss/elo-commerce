import Link from 'next/link';
import { indicadoresService } from '@/modules/indicadores/indicadores.service';
import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { listarPedidosSchema } from '@/modules/pedidos/pedidos.schema';
import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { BarraGestao } from '@/components/BarraGestao';
import { moeda } from '@/lib/formato';
import { SeloStatus } from '@/components/SeloStatus';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

export default async function Painel() {
  await exigirAcesso('bi.ver');

  const [dados, pedidos, fila] = await Promise.all([
    indicadoresService.completo('30dias'),
    pedidosService.listar(listarPedidosSchema.parse({ limite: 6 })),
    atendimentoService.fila(),
  ]);

  const { resumo, estoque } = dados;
  const aguardando = fila.filter((item) => item.status === 'aguardando_atendente').length;

  return (
    <>
      <BarraGestao titulo="Painel" subtitulo="Visão geral da operação nos últimos 30 dias" />

      <div className="pagina">
        <section className="kpis">
          <div className="kpi">
            <span className="kpi__icone">💰</span>
            <div className="kpi__rotulo">Faturamento</div>
            <div className="kpi__valor">{moeda(resumo.faturamento)}</div>
            <div className="kpi__nota">{resumo.pedidos} pedidos · ticket {moeda(resumo.ticket_medio)}</div>
          </div>
          <div className="kpi">
            <span className="kpi__icone">📦</span>
            <div className="kpi__rotulo">Itens vendidos</div>
            <div className="kpi__valor">{resumo.itens_vendidos}</div>
            <div className="kpi__nota">{resumo.cancelados} pedido(s) cancelado(s)</div>
          </div>
          <div className="kpi">
            <span className="kpi__icone">👥</span>
            <div className="kpi__rotulo">Clientes</div>
            <div className="kpi__valor">{resumo.clientes_total}</div>
            <div className="kpi__nota">{resumo.clientes_novos} novos no período</div>
          </div>
          <div className="kpi">
            <span className="kpi__icone">🎧</span>
            <div className="kpi__rotulo">Fila de atendimento</div>
            <div className="kpi__valor">{aguardando}</div>
            <div className="kpi__nota">
              {aguardando > 0 ? 'aguardando atendente agora' : 'nenhum cliente esperando'}
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="cartao">
            <div className="cartao__topo">
              <div><h3>Últimos pedidos</h3></div>
              <Link href="/gestao/pedidos" className="btn btn--sm btn--fantasma direita">ver todos</Link>
            </div>
            <div className="lista">
              {pedidos.itens.map((pedido) => (
                <div key={pedido.id} className="lista__item">
                  <span className="avatar">{pedido.cliente_nome.slice(0, 2).toUpperCase()}</span>
                  <div className="lista__txt">
                    <strong>#{pedido.numero} · {pedido.cliente_nome}</strong>
                    <span>{new Date(pedido.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })} · {pedido.canal}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lista__valor">{moeda(pedido.total)}</div>
                    <SeloStatus valor={pedido.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cartao">
            <div className="cartao__topo">
              <div><h3>Alertas de estoque</h3><p>5 unidades ou menos</p></div>
            </div>
            <div className="lista">
              {estoque.length === 0 ? (
                <p className="dim" style={{ padding: 20 }}>Estoque saudável em todos os itens ✅</p>
              ) : estoque.map((produto) => (
                <div key={produto.id} className="lista__item">
                  <span className="mini">
                    {produto.imagem?.startsWith('/')
                      ? <img src={produto.imagem} alt="" /> : <span>📦</span>}
                  </span>
                  <div className="lista__txt">
                    <strong>{produto.nome}</strong>
                    <span className="mono">{produto.sku}</span>
                  </div>
                  <span className={`selo selo--${produto.estoque === 0 ? 'vermelho' : 'ambar'}`}>
                    {produto.estoque} un.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
