/**
 * Bootstrap da SPA: roteamento por hash, troca de tema, indicador de
 * saúde do banco e montagem do widget de atendimento.
 */
import { api } from './api.js';
import { falha } from './ui.js';
import { montarChat } from './chat.js';
import { montarSessao } from './sessao.js';
import { dashboard } from './pages/dashboard.js';
import { clientes } from './pages/clientes.js';
import { produtos } from './pages/produtos.js';
import { pedidos } from './pages/pedidos.js';
import { loja } from './pages/loja.js';
import { atendimentos } from './pages/atendimentos.js';
import { apidoc } from './pages/apidoc.js';

const ROTAS = {
  '/dashboard':    { titulo: 'Dashboard',     sub: 'Visão geral da operação',                  render: dashboard },
  '/clientes':     { titulo: 'Clientes',      sub: 'Cadastro de pessoas e histórico de compras', render: clientes },
  '/produtos':     { titulo: 'Produtos',      sub: 'Catálogo, preços e controle de estoque',   render: produtos },
  '/pedidos':      { titulo: 'Pedidos',       sub: 'Vendas, itens e fluxo de status',          render: pedidos },
  '/loja':         { titulo: 'Loja',          sub: 'Vitrine para o cliente final',             render: loja },
  '/atendimentos': { titulo: 'Atendimentos',  sub: 'Sessões de chatbot e URA registradas',     render: atendimentos },
  '/api':          { titulo: 'API & Arquitetura', sub: 'Como a plataforma foi construída',     render: apidoc },
};

const pagina = document.getElementById('pagina');

async function navegar() {
  const rota = location.hash.replace('#', '') || '/dashboard';
  const destino = ROTAS[rota] ?? ROTAS['/dashboard'];

  document.getElementById('titulo-pagina').textContent = destino.titulo;
  document.getElementById('subtitulo-pagina').textContent = destino.sub;
  document.querySelectorAll('.nav__item').forEach((a) =>
    a.classList.toggle('nav__item--ativo', a.getAttribute('href') === `#${rota}`));

  document.getElementById('carrinho-chip').hidden = rota !== '/loja';
  document.getElementById('sidebar').classList.remove('sidebar--aberta');
  window.scrollTo({ top: 0 });

  try {
    await destino.render(pagina);
  } catch (err) {
    console.error(err);
    pagina.innerHTML = `<div class="card card--pad">
      <h3>Não foi possível carregar esta página</h3>
      <p class="dim">${err.message}</p>
      <p class="dim">Verifique se o PostgreSQL está rodando e se o seed foi executado
         (<span class="mono">npm run db:reset</span>).</p>
    </div>`;
    falha('Erro ao carregar', err.message);
  }
}

/* ------------------------------ tema ------------------------------ */
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  localStorage.setItem('elo-tema', tema);
  const botao = document.getElementById('btn-tema');
  botao.querySelector('.btn-tema__icone').textContent = tema === 'escuro' ? '☾' : '☀';
  botao.querySelector('span:last-child').textContent = tema === 'escuro' ? 'Tema escuro' : 'Tema claro';
}

/* --------------------------- saúde do banco ----------------------- */
async function verificarSaude() {
  const el = document.getElementById('status-db');
  try {
    const info = await api.health();
    el.className = 'status-db status-db--ok';
    el.innerHTML = `<i></i> ${info.banco} conectado`;
  } catch {
    el.className = 'status-db status-db--erro';
    el.innerHTML = '<i></i> banco indisponível';
  }
}

/* ------------------------------ boot ------------------------------ */
aplicarTema(localStorage.getItem('elo-tema') ?? 'escuro');

document.getElementById('btn-tema').onclick = () =>
  aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro');

document.getElementById('btn-atualizar').onclick = () => navegar();

document.getElementById('menu-mobile').onclick = () =>
  document.getElementById('sidebar').classList.toggle('sidebar--aberta');

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-fechar')) {
    document.getElementById('modal').hidden = true;
    document.body.style.overflow = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('modal').hidden) {
    document.getElementById('modal').hidden = true;
    document.body.style.overflow = '';
  }
});

window.addEventListener('hashchange', navegar);

montarChat();
montarSessao();
verificarSaude();
navegar();
