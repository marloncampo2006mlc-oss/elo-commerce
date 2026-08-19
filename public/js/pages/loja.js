import { api } from '../api.js';
import { brl, esc, carregando, vazio, abrirModal, fecharModal, sucesso, falha, debounce,
         capaProduto, miniProduto } from '../ui.js';

/** Carrinho vive em memória e é espelhado no chip da topbar. */
const carrinho = new Map();
const estado = { busca: '', categoria: '', ordem: 'nome' };
let alvoAtual = null;

export function totalItens() {
  return [...carrinho.values()].reduce((acc, i) => acc + i.qtd, 0);
}

function atualizarChip() {
  const chip = document.getElementById('carrinho-chip');
  const qtd = totalItens();
  chip.hidden = qtd === 0;
  document.getElementById('carrinho-qtd').textContent = qtd;
  chip.onclick = abrirCarrinho;
}

export async function loja(alvo) {
  alvoAtual = alvo;
  const categorias = await api.produtos.categorias();

  alvo.innerHTML = `
    <div class="card card--pad mb-14" style="background:linear-gradient(120deg,rgb(124 92 255/.18),rgb(34 211 238/.1));border-color:transparent">
      <div class="flex entre" style="flex-wrap:wrap;gap:14px">
        <div>
          <h2 style="font-size:22px;margin-bottom:5px">Equipe sua operação de ponta a ponta</h2>
          <p class="dim">Headsets, telefonia IP, redes e videoconferência com pronta entrega.
             Compre aqui ou peça pelo assistente virtual — o pedido cai na mesma base.</p>
        </div>
        <button class="btn btn--primario" id="btn-carrinho">🛒 Ver carrinho (<span id="qtd-hero">0</span>)</button>
      </div>
    </div>

    <div class="barra-ferramentas">
      <div class="busca"><input id="f-busca" placeholder="O que você procura?" value="${esc(estado.busca)}" /></div>
      <select class="filtro" id="f-categoria">
        <option value="">Todas as categorias</option>
        ${categorias.map((c) => `<option value="${esc(c.categoria)}">${esc(c.categoria)}</option>`).join('')}
      </select>
      <select class="filtro" id="f-ordem">
        <option value="nome">Ordenar por nome</option>
        <option value="preco_asc">Menor preço</option>
        <option value="preco_desc">Maior preço</option>
      </select>
    </div>
    <div id="vitrine">${carregando()}</div>`;

  alvo.querySelector('#f-busca').oninput = debounce((e) => { estado.busca = e.target.value; desenhar(); });
  alvo.querySelector('#f-categoria').onchange = (e) => { estado.categoria = e.target.value; desenhar(); };
  alvo.querySelector('#f-ordem').onchange = (e) => { estado.ordem = e.target.value; desenhar(); };
  alvo.querySelector('#btn-carrinho').onclick = abrirCarrinho;

  await desenhar();
  atualizarChip();
}

async function desenhar() {
  const container = alvoAtual.querySelector('#vitrine');
  const { data: itens } = await api.produtos.listar({ ...estado, ativo: 'true', limit: 100 });
  const disponiveis = itens.filter((p) => p.estoque > 0);

  document.getElementById('qtd-hero').textContent = totalItens();

  if (!disponiveis.length) {
    container.innerHTML = `<div class="card">${vazio('🔎', 'Nada encontrado',
      'Tente outra busca ou categoria.')}</div>`;
    return;
  }

  container.innerHTML = `<div class="vitrine">
    ${disponiveis.map((p) => `
      <article class="produto">
        <div class="produto__capa">${capaProduto(p.imagem, p.nome)}
          ${p.estoque <= 5 ? '<span class="produto__tag"><span class="badge badge--ambar">últimas unidades</span></span>' : ''}
        </div>
        <div class="produto__corpo">
          <span class="badge badge--violeta" style="align-self:flex-start">${esc(p.categoria)}</span>
          <div class="produto__nome">${esc(p.nome)}</div>
          <div class="produto__desc">${esc(p.descricao ?? '')}</div>
          <div class="produto__rodape">
            <div class="produto__preco">${brl(p.preco)}<small>em até 10x sem juros</small></div>
            <button class="btn btn--primario btn--sm" style="margin-left:auto"
              data-add="${p.id}" data-nome="${esc(p.nome)}" data-preco="${p.preco}"
              data-estoque="${p.estoque}" data-img="${esc(p.imagem ?? '')}">Adicionar</button>
          </div>
        </div>
      </article>`).join('')}
  </div>`;

  container.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    const id = b.dataset.add;
    const item = carrinho.get(id);
    const estoque = Number(b.dataset.estoque);

    if (item && item.qtd >= estoque) return falha('Estoque insuficiente', `Só temos ${estoque} unidades.`);
    if (item) item.qtd += 1;
    else carrinho.set(id, { nome: b.dataset.nome, preco: Number(b.dataset.preco), img: b.dataset.img, estoque, qtd: 1 });

    atualizarChip();
    document.getElementById('qtd-hero').textContent = totalItens();
    sucesso('Adicionado ao carrinho', b.dataset.nome);
  });
}

async function abrirCarrinho() {
  if (!carrinho.size) {
    abrirModal('Seu carrinho', vazio('🛒', 'Carrinho vazio', 'Adicione produtos da vitrine para continuar.'));
    return;
  }

  const clientes = await api.clientes.listar({ limit: 100, status: 'ativo' });

  const corpo = abrirModal('Finalizar compra', `
    <div id="itens"></div>
    <div class="grid-form mt-16">
      <div class="campo col-2"><label>Comprando como *</label>
        <select id="sel-cliente">
          ${clientes.data.map((c) => `<option value="${c.id}">${esc(c.nome)} · ${esc(c.email)}</option>`).join('')}
        </select></div>
      <div class="campo col-2"><label>Observação do pedido</label>
        <input id="obs" placeholder="Ex.: entregar no período da tarde" maxlength="500" /></div>
    </div>
    <div class="modal__rodape">
      <button class="btn" id="continuar">Continuar comprando</button>
      <button class="btn btn--primario" id="finalizar">Finalizar compra</button>
    </div>`, { largo: true });

  const desenharItens = () => {
    const box = corpo.querySelector('#itens');
    if (!carrinho.size) { fecharModal(); atualizarChip(); return; }

    const total = [...carrinho.values()].reduce((acc, i) => acc + i.preco * i.qtd, 0);
    box.innerHTML = `
      ${[...carrinho.entries()].map(([id, i]) => `
        <div class="carrinho-linha">
          ${miniProduto(i.img, i.nome, 42)}
          <div style="flex:1"><div class="pessoa__nome">${esc(i.nome)}</div>
            <div class="pessoa__sub">${brl(i.preco)} cada</div></div>
          <div class="qtd">
            <button type="button" data-menos="${id}">−</button><span>${i.qtd}</span>
            <button type="button" data-mais="${id}">+</button>
          </div>
          <b style="min-width:100px;text-align:right">${brl(i.preco * i.qtd)}</b>
          <button class="btn btn--sm btn--perigo" data-tira="${id}">✕</button>
        </div>`).join('')}
      <div class="total-linha"><span>Subtotal</span><span>${brl(total)}</span></div>
      <div class="total-linha"><span>Frete</span><span style="color:var(--verde)">grátis</span></div>
      <div class="total-linha total-linha--destaque"><span>Total</span><span>${brl(total)}</span></div>`;

    box.querySelectorAll('[data-mais]').forEach((b) => b.onclick = () => {
      const item = carrinho.get(b.dataset.mais);
      if (item.qtd >= item.estoque) return falha('Estoque insuficiente', `Só temos ${item.estoque} unidades.`);
      item.qtd += 1; desenharItens(); atualizarChip();
    });
    box.querySelectorAll('[data-menos]').forEach((b) => b.onclick = () => {
      const item = carrinho.get(b.dataset.menos);
      item.qtd > 1 ? (item.qtd -= 1) : carrinho.delete(b.dataset.menos);
      desenharItens(); atualizarChip();
    });
    box.querySelectorAll('[data-tira]').forEach((b) => b.onclick = () => {
      carrinho.delete(b.dataset.tira); desenharItens(); atualizarChip();
    });
  };

  corpo.querySelector('#continuar').onclick = fecharModal;
  corpo.querySelector('#finalizar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const pedido = await api.pedidos.criar({
        cliente_id: corpo.querySelector('#sel-cliente').value,
        canal: 'site',
        observacao: corpo.querySelector('#obs').value || null,
        itens: [...carrinho.entries()].map(([produto_id, i]) => ({ produto_id, quantidade: i.qtd })),
      });
      carrinho.clear();
      atualizarChip();
      fecharModal();
      sucesso('Compra realizada! 🎉', `Pedido #${pedido.numero} · ${brl(pedido.total)}`);
      desenhar();
    } catch (err) {
      falha('Não foi possível finalizar', err.message);
      e.target.disabled = false;
    }
  };

  desenharItens();
}
