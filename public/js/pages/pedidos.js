import { api } from '../api.js';
import {
  brl, esc, badge, dataHora, avatar, carregando, vazio, paginacao,
  abrirModal, fecharModal, confirmar, sucesso, falha, debounce, ROTULOS,
  miniProduto,
} from '../ui.js';
import { tratarErro } from '../sessao.js';

const estado = { busca: '', status: '', canal: '', page: 1, limit: 10 };
let alvoAtual = null;

/** Espelha o mapa de transições do backend para habilitar só o que é válido. */
const TRANSICOES = {
  rascunho: ['aguardando_pagamento', 'cancelado'],
  aguardando_pagamento: ['pago', 'cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

export async function pedidos(alvo) {
  alvoAtual = alvo;
  alvo.innerHTML = `
    <div class="barra-ferramentas">
      <div class="busca"><input id="f-busca" placeholder="Buscar por cliente ou número…" value="${esc(estado.busca)}" /></div>
      <select class="filtro" id="f-status">
        <option value="">Todos os status</option>
        ${['rascunho','aguardando_pagamento','pago','enviado','entregue','cancelado']
          .map((s) => `<option value="${s}">${ROTULOS[s] ?? s}</option>`).join('')}
      </select>
      <select class="filtro" id="f-canal">
        <option value="">Todos os canais</option>
        ${['site','chatbot','ura','whatsapp','telefone']
          .map((c) => `<option value="${c}">${ROTULOS[c] ?? c}</option>`).join('')}
      </select>
      <button class="btn btn--primario" id="btn-novo" style="margin-left:auto">＋ Novo pedido</button>
    </div>
    <div id="lista">${carregando()}</div>`;

  for (const [id, chave] of [['#f-status', 'status'], ['#f-canal', 'canal']]) {
    const el = alvo.querySelector(id);
    el.value = estado[chave];
    el.onchange = (e) => { estado[chave] = e.target.value; estado.page = 1; renderizarLista(); };
  }
  alvo.querySelector('#f-busca').oninput = debounce((e) => {
    estado.busca = e.target.value; estado.page = 1; renderizarLista();
  });
  alvo.querySelector('#btn-novo').onclick = () => abrirFormulario();

  await renderizarLista();
}

async function renderizarLista() {
  const container = alvoAtual.querySelector('#lista');
  const { data: itens, meta } = await api.pedidos.listar(estado);

  if (!itens.length) {
    container.innerHTML = `<div class="card">${vazio('▦', 'Nenhum pedido encontrado',
      'Crie um pedido ou finalize uma compra na Loja.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="tabela-wrap">
        <table>
          <thead><tr>
            <th>Nº</th><th>Cliente</th><th>Canal</th><th class="num">Itens</th>
            <th class="num">Total</th><th>Status</th><th>Data</th><th></th>
          </tr></thead>
          <tbody>
            ${itens.map((p) => `
              <tr>
                <td class="mono"><b>#${p.numero}</b></td>
                <td><div class="pessoa">${avatar(p.cliente_nome)}
                  <div><div class="pessoa__nome">${esc(p.cliente_nome)}</div>
                       <div class="pessoa__sub">${esc(p.cliente_cidade ?? '')}${p.cliente_uf ? '/' + esc(p.cliente_uf) : ''}</div></div>
                </div></td>
                <td><span class="badge badge--ciano">${esc(ROTULOS[p.canal] ?? p.canal)}</span></td>
                <td class="num">${p.qtd_pecas}</td>
                <td class="num"><b>${brl(p.total)}</b></td>
                <td>${badge(p.status)}</td>
                <td class="dim">${dataHora(p.created_at)}</td>
                <td class="acoes">
                  <button class="btn btn--sm" data-ver="${p.id}">Detalhes</button>
                  ${TRANSICOES[p.status]?.length
                    ? `<button class="btn btn--sm btn--primario" data-status="${p.id}">Avançar</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${paginacao(meta)}
    </div>`;

  container.querySelectorAll('[data-pagina]').forEach((b) =>
    b.onclick = () => { estado.page = Number(b.dataset.pagina); renderizarLista(); });
  container.querySelectorAll('[data-ver]').forEach((b) => b.onclick = () => verDetalhes(b.dataset.ver));
  container.querySelectorAll('[data-status]').forEach((b) => b.onclick = () => mudarStatus(b.dataset.status));
}

async function verDetalhes(id) {
  const p = await api.pedidos.obter(id);

  const corpo = abrirModal(`Pedido #${p.numero}`, `
    <div class="flex entre mb-14">
      <div class="pessoa">${avatar(p.cliente_nome)}
        <div><div class="pessoa__nome">${esc(p.cliente_nome)}</div>
             <div class="pessoa__sub">${esc(p.cliente_email)}</div></div></div>
      <div style="text-align:right">${badge(p.status)}
        <div class="dim" style="font-size:12px;margin-top:4px">${dataHora(p.created_at)}</div></div>
    </div>

    <div class="pilha mb-14">
      <div class="pilha__item"><strong>${esc(ROTULOS[p.canal] ?? p.canal)}</strong><span>canal de origem</span></div>
      <div class="pilha__item"><strong>${p.qtd_itens}</strong><span>produtos distintos</span></div>
      <div class="pilha__item"><strong>${p.qtd_pecas}</strong><span>peças no total</span></div>
    </div>

    <div class="card">
      <div class="tabela-wrap"><table>
        <thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Unitário</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${p.itens.map((i) => `
          <tr><td><div class="flex" style="gap:9px">
              ${miniProduto(i.imagem, i.produto_nome, 36)}
              <div><div class="pessoa__nome">${esc(i.produto_nome)}</div>
                   <div class="pessoa__sub mono">${esc(i.sku)}</div></div>
            </div></td>
            <td class="num">${i.quantidade}</td>
            <td class="num">${brl(i.preco_unitario)}</td>
            <td class="num"><b>${brl(i.subtotal)}</b></td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="total-linha total-linha--destaque"><span>Total do pedido</span><span>${brl(p.total)}</span></div>
    ${p.observacao ? `<p class="dim mt-16">Observação: ${esc(p.observacao)}</p>` : ''}

    <div class="modal__rodape">
      ${['cancelado', 'rascunho'].includes(p.status)
        ? '<button class="btn btn--perigo" id="excluir">Excluir pedido</button>' : ''}
      ${TRANSICOES[p.status]?.length
        ? `<button class="btn btn--primario" id="avancar">Alterar status</button>` : ''}
      <button class="btn" id="fechar">Fechar</button>
    </div>`, { largo: true });

  corpo.querySelector('#fechar').onclick = fecharModal;
  corpo.querySelector('#avancar')?.addEventListener('click', () => mudarStatus(id));
  corpo.querySelector('#excluir')?.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: 'Excluir pedido', mensagem: `Excluir o pedido #${p.numero}?`, rotulo: 'Excluir' });
    if (!ok) return;
    try { await api.pedidos.remover(id); sucesso('Pedido excluído'); renderizarLista(); }
    catch (err) { tratarErro(err, 'Não foi possível excluir'); }
  });
}

async function mudarStatus(id) {
  const pedido = await api.pedidos.obter(id);
  const opcoes = TRANSICOES[pedido.status] ?? [];
  if (!opcoes.length) return falha('Pedido finalizado', 'Não há próximas etapas para este status.');

  const corpo = abrirModal(`Pedido #${pedido.numero} · fluxo`, `
    <p class="dim mb-14">Status atual: ${badge(pedido.status)} — escolha a próxima etapa.
       O cancelamento devolve as unidades ao estoque automaticamente.</p>
    <div class="flex" style="gap:8px;flex-wrap:wrap">
      ${opcoes.map((s) => `<button class="btn ${s === 'cancelado' ? 'btn--perigo' : 'btn--primario'}"
        data-novo="${s}">${ROTULOS[s] ?? s}</button>`).join('')}
    </div>
    <div class="modal__rodape"><button class="btn" id="cancelar">Fechar</button></div>`);

  corpo.querySelector('#cancelar').onclick = fecharModal;
  corpo.querySelectorAll('[data-novo]').forEach((b) => b.onclick = async () => {
    try {
      await api.pedidos.alterarStatus(id, b.dataset.novo);
      fecharModal();
      sucesso('Status atualizado', `Pedido #${pedido.numero} → ${ROTULOS[b.dataset.novo] ?? b.dataset.novo}`);
      renderizarLista();
    } catch (err) { tratarErro(err, 'Transição recusada'); }
  });
}

/** Formulário de pedido manual: cliente + itens com carrinho embutido. */
async function abrirFormulario() {
  const [clientes, produtosDisp] = await Promise.all([
    api.clientes.listar({ limit: 100, status: 'ativo' }),
    api.produtos.listar({ limit: 100, ativo: 'true' }),
  ]);

  const carrinho = new Map();

  const corpo = abrirModal('Novo pedido', `
    <div class="grid-form mb-14">
      <div class="campo"><label>Cliente *</label>
        <select id="sel-cliente">
          ${clientes.data.map((c) => `<option value="${c.id}">${esc(c.nome)} · ${esc(c.cidade ?? '')}</option>`).join('')}
        </select></div>
      <div class="campo"><label>Canal de origem</label>
        <select id="sel-canal">
          ${['site','telefone','whatsapp','chatbot','ura'].map((c) =>
            `<option value="${c}">${ROTULOS[c] ?? c}</option>`).join('')}
        </select></div>
    </div>

    <div class="campo mb-14"><label>Adicionar produto</label>
      <select id="sel-produto">
        <option value="">Selecione um produto…</option>
        ${produtosDisp.data.filter((p) => p.estoque > 0).map((p) =>
          `<option value="${p.id}" data-preco="${p.preco}" data-nome="${esc(p.nome)}"
             data-estoque="${p.estoque}" data-img="${esc(p.imagem ?? '')}">
             ${esc(p.imagem ?? '')} ${esc(p.nome)} — ${brl(p.preco)} (${p.estoque} un.)
           </option>`).join('')}
      </select></div>

    <div id="carrinho"></div>

    <div class="modal__rodape">
      <button class="btn" id="cancelar">Cancelar</button>
      <button class="btn btn--primario" id="confirmar" disabled>Registrar pedido</button>
    </div>`, { largo: true });

  const desenharCarrinho = () => {
    const box = corpo.querySelector('#carrinho');
    const botao = corpo.querySelector('#confirmar');
    botao.disabled = carrinho.size === 0;

    if (!carrinho.size) {
      box.innerHTML = '<p class="dim texto-centro" style="padding:22px 0">Nenhum item adicionado ainda.</p>';
      return;
    }

    const total = [...carrinho.values()].reduce((acc, i) => acc + i.preco * i.qtd, 0);
    box.innerHTML = `
      ${[...carrinho.entries()].map(([id, i]) => `
        <div class="carrinho-linha">
          ${miniProduto(i.img, i.nome, 38)}
          <div style="flex:1"><div class="pessoa__nome">${esc(i.nome)}</div>
            <div class="pessoa__sub">${brl(i.preco)} · máx ${i.estoque}</div></div>
          <div class="qtd">
            <button type="button" data-menos="${id}">−</button>
            <span>${i.qtd}</span>
            <button type="button" data-mais="${id}">+</button>
          </div>
          <b style="min-width:96px;text-align:right">${brl(i.preco * i.qtd)}</b>
          <button class="btn btn--sm btn--perigo" data-tira="${id}">✕</button>
        </div>`).join('')}
      <div class="total-linha total-linha--destaque"><span>Total</span><span>${brl(total)}</span></div>`;

    box.querySelectorAll('[data-mais]').forEach((b) => b.onclick = () => {
      const item = carrinho.get(b.dataset.mais);
      if (item.qtd < item.estoque) { item.qtd += 1; desenharCarrinho(); }
      else falha('Estoque insuficiente', `Só há ${item.estoque} unidades de ${item.nome}.`);
    });
    box.querySelectorAll('[data-menos]').forEach((b) => b.onclick = () => {
      const item = carrinho.get(b.dataset.menos);
      item.qtd > 1 ? (item.qtd -= 1) : carrinho.delete(b.dataset.menos);
      desenharCarrinho();
    });
    box.querySelectorAll('[data-tira]').forEach((b) => b.onclick = () => {
      carrinho.delete(b.dataset.tira); desenharCarrinho();
    });
  };

  corpo.querySelector('#sel-produto').onchange = (e) => {
    const opcao = e.target.selectedOptions[0];
    if (!opcao.value) return;
    const atual = carrinho.get(opcao.value);
    if (atual) atual.qtd += 1;
    else carrinho.set(opcao.value, {
      nome: opcao.dataset.nome, preco: Number(opcao.dataset.preco),
      estoque: Number(opcao.dataset.estoque), img: opcao.dataset.img, qtd: 1,
    });
    e.target.value = '';
    desenharCarrinho();
  };

  corpo.querySelector('#cancelar').onclick = fecharModal;
  corpo.querySelector('#confirmar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const pedido = await api.pedidos.criar({
        cliente_id: corpo.querySelector('#sel-cliente').value,
        canal: corpo.querySelector('#sel-canal').value,
        itens: [...carrinho.entries()].map(([produto_id, i]) => ({ produto_id, quantidade: i.qtd })),
      });
      fecharModal();
      sucesso('Pedido registrado', `#${pedido.numero} · ${brl(pedido.total)}`);
      renderizarLista();
    } catch (err) {
      falha('Não foi possível registrar', err.message);
      e.target.disabled = false;
    }
  };

  desenharCarrinho();
}
