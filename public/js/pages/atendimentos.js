import { api } from '../api.js';
import { esc, badge, dataHora, carregando, vazio, paginacao, abrirModal, ROTULOS } from '../ui.js';

const estado = { status: '', canal: '', page: 1, limit: 10 };
let alvoAtual = null;

export async function atendimentos(alvo) {
  alvoAtual = alvo;
  const stats = await api.atendimentos.estatisticas();
  const taxa = stats.total ? Math.round((stats.resolvidos / stats.total) * 100) : 0;

  alvo.innerHTML = `
    <section class="kpis">
      <div class="kpi"><span class="kpi__icone">💬</span>
        <div class="kpi__rotulo">Atendimentos</div><div class="kpi__valor">${stats.total}</div>
        <div class="kpi__nota">${stats.em_andamento} em andamento agora</div></div>
      <div class="kpi"><span class="kpi__icone">✅</span>
        <div class="kpi__rotulo">Resolvidos pelo bot</div><div class="kpi__valor">${taxa}%</div>
        <div class="kpi__nota">${stats.resolvidos} sem intervenção humana</div></div>
      <div class="kpi"><span class="kpi__icone">🎧</span>
        <div class="kpi__rotulo">Transferidos</div><div class="kpi__valor">${stats.transferidos}</div>
        <div class="kpi__nota">encaminhados a um atendente</div></div>
      <div class="kpi"><span class="kpi__icone">🔁</span>
        <div class="kpi__rotulo">Interações por sessão</div><div class="kpi__valor">${stats.media_interacoes}</div>
        <div class="kpi__nota">média de mensagens trocadas</div></div>
    </section>

    <div class="barra-ferramentas">
      <select class="filtro" id="f-status">
        <option value="">Todos os status</option>
        ${['em_andamento','resolvido','transferido','abandonado']
          .map((s) => `<option value="${s}">${ROTULOS[s] ?? s}</option>`).join('')}
      </select>
      <select class="filtro" id="f-canal">
        <option value="">Todos os canais</option>
        ${['chatbot','ura','whatsapp','telefone'].map((c) => `<option value="${c}">${ROTULOS[c] ?? c}</option>`).join('')}
      </select>
      <button class="btn btn--primario" id="btn-simular" style="margin-left:auto">▶ Abrir o assistente</button>
    </div>
    <div id="lista">${carregando()}</div>`;

  for (const [id, chave] of [['#f-status', 'status'], ['#f-canal', 'canal']]) {
    const el = alvo.querySelector(id);
    el.value = estado[chave];
    el.onchange = (e) => { estado[chave] = e.target.value; estado.page = 1; renderizarLista(); };
  }
  alvo.querySelector('#btn-simular').onclick = () => document.getElementById('fab-chat').click();

  await renderizarLista();
}

async function renderizarLista() {
  const container = alvoAtual.querySelector('#lista');
  const { data: itens, meta } = await api.atendimentos.listar(estado);

  if (!itens.length) {
    container.innerHTML = `<div class="card">${vazio('◐', 'Nenhum atendimento registrado',
      'Abra o assistente no canto da tela para gerar uma sessão.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="tabela-wrap"><table>
        <thead><tr><th>Protocolo</th><th>Cliente</th><th>Canal</th>
          <th>Nó atual</th><th class="num">Mensagens</th><th>Status</th><th>Início</th><th></th></tr></thead>
        <tbody>
          ${itens.map((a) => `
            <tr>
              <td class="mono"><b>${esc(a.protocolo)}</b></td>
              <td>${a.cliente_nome ? esc(a.cliente_nome) : '<span class="dim">não identificado</span>'}</td>
              <td><span class="badge badge--ciano">${esc(ROTULOS[a.canal] ?? a.canal)}</span></td>
              <td class="mono dim">${esc(a.no_atual)}</td>
              <td class="num">${a.mensagens}</td>
              <td>${badge(a.status)}</td>
              <td class="dim">${dataHora(a.created_at)}</td>
              <td class="acoes"><button class="btn btn--sm" data-ver="${a.id}">Transcrição</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
      ${paginacao(meta)}
    </div>`;

  container.querySelectorAll('[data-pagina]').forEach((b) =>
    b.onclick = () => { estado.page = Number(b.dataset.pagina); renderizarLista(); });
  container.querySelectorAll('[data-ver]').forEach((b) => b.onclick = () => verTranscricao(b.dataset.ver));
}

async function verTranscricao(id) {
  const a = await api.atendimentos.obter(id);

  abrirModal(`Protocolo ${a.protocolo}`, `
    <div class="pilha mb-14">
      <div class="pilha__item"><strong>${esc(ROTULOS[a.canal] ?? a.canal)}</strong><span>canal</span></div>
      <div class="pilha__item"><strong>${esc(a.cliente_nome ?? 'não identificado')}</strong><span>cliente</span></div>
      <div class="pilha__item"><strong>${esc(a.no_atual)}</strong><span>último nó do fluxo</span></div>
      <div class="pilha__item"><strong>${a.transcript.length}</strong><span>mensagens</span></div>
    </div>
    <div class="card" style="padding:16px;max-height:44vh;overflow-y:auto">
      <div style="display:flex;flex-direction:column;gap:9px">
        ${a.transcript.map((m) => `
          <div class="msg msg--${m.autor === 'cliente' ? 'cliente' : m.autor === 'sistema' ? 'sistema' : 'bot'}"
               style="max-width:88%">${esc(m.texto)}</div>`).join('')}
      </div>
    </div>
    <div class="flex mt-16" style="justify-content:flex-end">${badge(a.status)}</div>
  `, { largo: true });
}
