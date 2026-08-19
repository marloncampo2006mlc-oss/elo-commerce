/**
 * Widget de atendimento: fala com a mesma API de atendimentos usada
 * pelo backoffice. Em modo URA mostra o teclado numérico; em modo chat,
 * campo de texto livre (o backend resolve a intenção).
 */
import { api } from './api.js';
import { esc, falha } from './ui.js';

let sessao = null;
let canal = 'chatbot';
let ocupado = false;

const el = {
  painel: () => document.getElementById('chat'),
  mensagens: () => document.getElementById('chat-mensagens'),
  teclado: () => document.getElementById('chat-teclado'),
  protocolo: () => document.getElementById('chat-protocolo'),
  input: () => document.getElementById('chat-input'),
};

/** Renderiza a transcrição inteira vinda do servidor. */
function desenharTranscript(atendimento, { animarUltimas = 0 } = {}) {
  const caixa = el.mensagens();
  const total = atendimento.transcript.length;

  caixa.innerHTML = atendimento.transcript.map((m, i) => {
    const tipo = m.autor === 'cliente' ? 'cliente' : m.autor === 'sistema' ? 'sistema' : 'bot';
    const novo = i >= total - animarUltimas;
    return `<div class="msg msg--${tipo}" ${novo ? '' : 'style="animation:none"'}>${esc(m.texto)}</div>`;
  }).join('');

  if (atendimento.status !== 'em_andamento') {
    caixa.insertAdjacentHTML('beforeend',
      `<div class="msg msg--sistema">Sessão ${esc(atendimento.status)} · protocolo ${esc(atendimento.protocolo)}</div>`);
  }
  caixa.scrollTop = caixa.scrollHeight;
}

/** Teclado DTMF: só aparece no canal URA. */
function desenharTeclado() {
  const teclado = el.teclado();
  teclado.hidden = canal !== 'ura';
  if (canal !== 'ura') return;

  teclado.innerHTML = ['1','2','3','4','5','6','7','8','9','*','0','#']
    .map((t) => `<button class="tecla" data-tecla="${t}">${t}</button>`).join('');

  teclado.querySelectorAll('[data-tecla]').forEach((b) =>
    b.onclick = () => enviar(b.dataset.tecla));
}

function indicadorDigitando(ligar) {
  const caixa = el.mensagens();
  document.getElementById('digitando')?.remove();
  if (!ligar) return;
  caixa.insertAdjacentHTML('beforeend',
    '<div class="msg msg--bot msg--digitando" id="digitando"><i></i><i></i><i></i></div>');
  caixa.scrollTop = caixa.scrollHeight;
}

export async function iniciarSessao() {
  el.mensagens().innerHTML = '';
  el.protocolo().textContent = 'abrindo sessão…';
  try {
    sessao = await api.atendimentos.iniciar(canal);
    el.protocolo().textContent = `${sessao.protocolo} · ${canal === 'ura' ? 'URA' : 'chat'}`;
    desenharTranscript(sessao, { animarUltimas: 2 });
    desenharTeclado();
  } catch (err) {
    falha('Não consegui abrir o atendimento', err.message);
  }
}

async function enviar(texto) {
  const entrada = String(texto ?? '').trim();
  if (!entrada || !sessao || ocupado) return;

  if (sessao.status !== 'em_andamento') {
    await iniciarSessao();
    return;
  }

  ocupado = true;
  el.input().value = '';

  // Eco otimista da fala do usuário + indicador de digitação.
  el.mensagens().insertAdjacentHTML('beforeend', `<div class="msg msg--cliente">${esc(entrada)}</div>`);
  indicadorDigitando(true);

  try {
    const atualizado = await api.atendimentos.responder(sessao.id, entrada);
    const novas = atualizado.transcript.length - sessao.transcript.length;
    sessao = atualizado;
    indicadorDigitando(false);
    desenharTranscript(sessao, { animarUltimas: Math.max(1, novas - 1) });
  } catch (err) {
    indicadorDigitando(false);
    falha('Falha no atendimento', err.message);
  } finally {
    ocupado = false;
  }
}

/** Liga o widget aos controles da página. */
export function montarChat() {
  const painel = el.painel();

  document.getElementById('fab-chat').onclick = async () => {
    painel.hidden = false;
    document.getElementById('fab-chat').hidden = true;
    if (!sessao) await iniciarSessao();
    el.input().focus();
  };

  document.getElementById('chat-fechar').onclick = () => {
    painel.hidden = true;
    document.getElementById('fab-chat').hidden = false;
  };

  document.getElementById('chat-form').onsubmit = (e) => {
    e.preventDefault();
    enviar(el.input().value);
  };

  painel.querySelectorAll('[data-canal]').forEach((b) => b.onclick = async () => {
    painel.querySelectorAll('[data-canal]').forEach((x) => x.classList.remove('chip--ativo'));
    b.classList.add('chip--ativo');
    canal = b.dataset.canal;
    el.input().placeholder = canal === 'ura'
      ? 'Disque uma opção ou digite aqui…'
      : 'Digite sua mensagem…';
    await iniciarSessao();
  });
}
