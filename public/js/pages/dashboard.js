import { api } from '../api.js';
import { brl, numero, badge, dataHora, esc, carregando, avatar, miniProduto } from '../ui.js';
import { areaChart, donutChart, CORES_GRAFICO } from '../graficos.js';

const kpi = (rotulo, valor, nota, icone) => `
  <div class="kpi">
    <span class="kpi__icone">${icone}</span>
    <div class="kpi__rotulo">${rotulo}</div>
    <div class="kpi__valor">${valor}</div>
    <div class="kpi__nota">${nota}</div>
  </div>`;

export async function dashboard(alvo) {
  alvo.innerHTML = carregando(6);
  const d = await api.dashboard();
  const i = d.indicadores;

  const automacao = i.pedidos ? Math.round((i.pedidos_automatizados / i.pedidos) * 100) : 0;

  const pontos = d.faturamentoDiario.map((p) => ({
    valor: p.faturamento,
    rotulo: new Date(p.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }));

  const fatias = d.vendasPorCanal.map((c, idx) => ({
    rotulo: c.canal === 'ura' ? 'URA' : c.canal,
    valor: c.faturamento,
    cor: CORES_GRAFICO[idx % CORES_GRAFICO.length],
  }));

  const maxReceita = Math.max(...d.topProdutos.map((p) => Number(p.receita)), 1);

  alvo.innerHTML = `
    <section class="kpis">
      ${kpi('Faturamento', brl(i.faturamento), `${brl(i.faturamento_mes)} neste mês`, '💰')}
      ${kpi('Pedidos', numero(i.pedidos), `${i.pedidos_mes} no mês · ticket ${brl(i.ticket_medio)}`, '🧾')}
      ${kpi('Clientes', numero(i.clientes), `${i.clientes_ativos} ativos na base`, '👥')}
      ${kpi('Automação', `${automacao}%`, `${i.pedidos_automatizados} pedidos via chatbot/URA`, '🤖')}
    </section>

    <section class="grid-dash">
      <div class="card">
        <div class="card__topo">
          <div><h3>Faturamento diário</h3><p>Últimos 30 dias, pedidos não cancelados</p></div>
          <span class="badge badge--violeta direita">${brl(i.faturamento_mes)} no mês</span>
        </div>
        <div style="padding:18px 20px 8px">${areaChart(pontos)}</div>
      </div>

      <div class="card">
        <div class="card__topo"><div><h3>Vendas por canal</h3><p>Participação no faturamento</p></div></div>
        <div style="padding:20px">${donutChart(fatias)}</div>
      </div>
    </section>

    <section class="grid-dash-3">
      <div class="card">
        <div class="card__topo"><div><h3>Produtos mais vendidos</h3></div></div>
        <div class="lista-simples">
          ${d.topProdutos.length ? d.topProdutos.map((p) => `
            <div class="lista-simples__item">
              ${miniProduto(p.imagem, p.nome)}
              <div class="lista-simples__txt">
                <strong>${esc(p.nome)}</strong>
                <span>${p.unidades_vendidas} un. · ${esc(p.categoria)}</span>
                <div class="barra-progresso"><i style="width:${(p.receita / maxReceita) * 100}%"></i></div>
              </div>
              <span class="lista-simples__valor">${brl(p.receita)}</span>
            </div>`).join('') : '<p class="dim" style="padding:20px">Nenhuma venda registrada.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card__topo"><div><h3>Últimos pedidos</h3></div>
          <a class="btn btn--sm btn--fantasma direita" href="#/pedidos">ver todos</a></div>
        <div class="lista-simples">
          ${d.ultimosPedidos.map((p) => `
            <div class="lista-simples__item">
              ${avatar(p.cliente_nome)}
              <div class="lista-simples__txt">
                <strong>#${p.numero} · ${esc(p.cliente_nome)}</strong>
                <span>${dataHora(p.created_at)} · ${esc(p.canal)}</span>
              </div>
              <div style="text-align:right">
                <div class="lista-simples__valor">${brl(p.total)}</div>
                ${badge(p.status)}
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card__topo"><div><h3>Alertas de estoque</h3><p>5 unidades ou menos</p></div></div>
        <div class="lista-simples">
          ${d.alertaEstoque.length ? d.alertaEstoque.map((p) => `
            <div class="lista-simples__item">
              ${miniProduto(p.imagem, p.nome)}
              <div class="lista-simples__txt">
                <strong>${esc(p.nome)}</strong><span class="mono">${esc(p.sku)}</span>
              </div>
              <span class="badge badge--${p.estoque === 0 ? 'vermelho' : 'ambar'}">${p.estoque} un.</span>
            </div>`).join('') : '<p class="dim" style="padding:20px">Estoque saudável em todos os itens. ✅</p>'}
        </div>
        <div class="card__topo" style="border-top:1px solid var(--borda);border-bottom:0">
          <div><h3>Situação dos pedidos</h3></div>
        </div>
        <div style="padding:6px 20px 18px">
          ${d.pedidosPorStatus.map((s) => `
            <div class="flex entre" style="padding:5px 0;font-size:12.5px">
              ${badge(s.status)}<b>${s.total}</b>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
}
