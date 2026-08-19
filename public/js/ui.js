/** Utilitários de formatação e componentes visuais reutilizáveis. */

export const brl = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const numero = (v) => Number(v ?? 0).toLocaleString('pt-BR');

export const data = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export const dataHora = (v) =>
  v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const cpfFormatado = (v) =>
  String(v ?? '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

/** Escapa texto antes de injetar no HTML (evita XSS em dados do banco). */
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Cor determinística por nome — mesmo cliente, mesmo avatar sempre. */
export function corDoNome(nome) {
  const paletas = [
    'linear-gradient(135deg,#7c5cff,#a78bfa)', 'linear-gradient(135deg,#22d3ee,#0ea5e9)',
    'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#fbbf24,#f59e0b)',
    'linear-gradient(135deg,#f472b6,#ec4899)', 'linear-gradient(135deg,#818cf8,#6366f1)',
  ];
  const soma = [...String(nome ?? '?')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return paletas[soma % paletas.length];
}

export const iniciais = (nome) =>
  String(nome ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const avatar = (nome) =>
  `<div class="avatar" style="background:${corDoNome(nome)}">${esc(iniciais(nome))}</div>`;

const CORES_STATUS = {
  ativo: 'verde', inativo: 'cinza', prospect: 'ciano',
  rascunho: 'cinza', aguardando_pagamento: 'ambar', pago: 'violeta',
  enviado: 'ciano', entregue: 'verde', cancelado: 'vermelho',
  em_andamento: 'ambar', resolvido: 'verde', transferido: 'violeta', abandonado: 'cinza',
};

export const ROTULOS = {
  aguardando_pagamento: 'aguardando pgto', em_andamento: 'em andamento',
  ura: 'URA', chatbot: 'chatbot', whatsapp: 'WhatsApp', site: 'site', telefone: 'telefone',
};

export const badge = (valor) =>
  `<span class="badge badge--${CORES_STATUS[valor] ?? 'cinza'}">${esc(ROTULOS[valor] ?? valor ?? '—')}</span>`;

/* ----------------------------- Toasts ----------------------------- */
export function toast(titulo, mensagem = '', tipo = 'info') {
  const caixa = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.innerHTML = `<div class="toast__txt"><strong>${esc(titulo)}</strong>${
    mensagem ? `<span>${esc(mensagem)}</span>` : ''}</div>`;
  caixa.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast--saindo');
    el.addEventListener('animationend', () => el.remove());
  }, 3600);
}

export const sucesso = (t, m) => toast(t, m, 'sucesso');
export const falha = (t, m) => toast(t, m, 'erro');

/* ------------------------------ Modal ----------------------------- */
const modal = () => document.getElementById('modal');

export function abrirModal(titulo, html, { largo = false } = {}) {
  const m = modal();
  m.querySelector('#modal-titulo').textContent = titulo;
  m.querySelector('#modal-corpo').innerHTML = html;
  m.querySelector('.modal__caixa').classList.toggle('modal__caixa--largo', largo);
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  return m.querySelector('#modal-corpo');
}

export function fecharModal() {
  modal().hidden = true;
  document.body.style.overflow = '';
}

/** Confirmação em modal (substitui o confirm() nativo). */
export function confirmar({ titulo, mensagem, rotulo = 'Confirmar', perigo = true }) {
  return new Promise((resolve) => {
    const corpo = abrirModal(titulo, `
      <p style="color:var(--texto-2)">${esc(mensagem)}</p>
      <div class="modal__rodape">
        <button class="btn" data-nao>Cancelar</button>
        <button class="btn ${perigo ? 'btn--perigo' : 'btn--primario'}" data-sim>${esc(rotulo)}</button>
      </div>`);
    corpo.querySelector('[data-sim]').onclick = () => { fecharModal(); resolve(true); };
    corpo.querySelector('[data-nao]').onclick = () => { fecharModal(); resolve(false); };
  });
}

/* ---------------------- Estados de carregamento ------------------- */
export const carregando = (linhas = 5) =>
  `<div class="card" style="padding:20px;display:flex;flex-direction:column;gap:12px">${
    Array.from({ length: linhas }, (_, i) =>
      `<div class="skeleton" style="height:${i === 0 ? 34 : 22}px;width:${100 - i * 7}%"></div>`).join('')
  }</div>`;

export const vazio = (icone, titulo, sub = '') =>
  `<div class="vazio"><div class="vazio__icone">${icone}</div>
     <strong>${esc(titulo)}</strong>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;

/** Paginação reutilizável; devolve HTML e delega o clique via data-pagina. */
export function paginacao({ page, paginas, total }) {
  if (paginas <= 1) return `<div class="paginacao">${total} registro(s)</div>`;
  const botao = (p, rotulo, ativo = false) =>
    `<button class="btn btn--sm ${ativo ? 'btn--primario' : ''}" data-pagina="${p}">${rotulo}</button>`;

  const paginasVisiveis = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(paginas, page + 2); p += 1) paginasVisiveis.push(p);

  return `<div class="paginacao">
    <span>${total} registro(s) · página ${page} de ${paginas}</span>
    ${page > 1 ? botao(page - 1, '‹') : ''}
    ${paginasVisiveis.map((p) => botao(p, p, p === page)).join('')}
    ${page < paginas ? botao(page + 1, '›') : ''}
  </div>`;
}

/** Lê um <form> como objeto simples. */
export const lerFormulario = (form) => Object.fromEntries(new FormData(form).entries());

/** Marca campos inválidos a partir dos detalhes retornados pela API. */
export function marcarErros(form, detalhes = []) {
  form.querySelectorAll('.campo--erro').forEach((c) => {
    c.classList.remove('campo--erro');
    c.querySelector('.campo__erro')?.remove();
  });
  for (const { campo, mensagem } of detalhes) {
    const input = form.querySelector(`[name="${campo}"]`);
    const wrapper = input?.closest('.campo');
    if (!wrapper) continue;
    wrapper.classList.add('campo--erro');
    wrapper.insertAdjacentHTML('beforeend', `<span class="campo__erro">${esc(mensagem)}</span>`);
  }
}

/** Debounce para campos de busca. */
export function debounce(fn, ms = 320) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* --------------------------- Imagens de produto -------------------- */
/**
 * O campo `imagem` do produto aceita duas formas: um caminho/URL
 * (/assets/produtos/x.svg) ou um emoji. Estas funções decidem como
 * renderizar cada caso, para que nenhuma tela precise saber disso.
 */
export const ehCaminhoDeImagem = (v) =>
  typeof v === 'string' && (v.startsWith('/') || v.startsWith('http'));

/** Capa grande, usada nos cards da vitrine e do catálogo. */
export const capaProduto = (imagem, nome) =>
  ehCaminhoDeImagem(imagem)
    ? `<img class="produto__img" src="${esc(imagem)}" alt="${esc(nome)}" loading="lazy" />`
    : `<span class="produto__emoji">${esc(imagem ?? '📦')}</span>`;

/** Miniatura quadrada, usada em listas, tabelas e carrinho. */
export const miniProduto = (imagem, nome, tamanho = 40) =>
  ehCaminhoDeImagem(imagem)
    ? `<span class="mini-produto" style="width:${tamanho}px;height:${tamanho}px">
         <img src="${esc(imagem)}" alt="${esc(nome)}" loading="lazy" /></span>`
    : `<span class="mini-produto mini-produto--emoji" style="width:${tamanho}px;height:${tamanho}px">${esc(imagem ?? '📦')}</span>`;
