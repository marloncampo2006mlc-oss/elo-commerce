/**
 * Sessão administrativa no front.
 *
 * Importante: esconder botão NÃO é segurança. Quem garante o bloqueio é o
 * `requireAuth` no servidor — aqui só ajustamos a experiência para o
 * usuário não tentar uma ação que vai receber 401.
 */
import { api } from './api.js';
import { abrirModal, fecharModal, sucesso, falha } from './ui.js';

const estado = { autenticado: false, configurado: false };

export const estaAutenticado = () => estado.autenticado;

function pintarBotao() {
  const icone = document.getElementById('sessao-icone');
  const rotulo = document.getElementById('sessao-rotulo');
  if (!icone || !rotulo) return;

  icone.textContent = estado.autenticado ? '🔓' : '🔒';
  rotulo.textContent = estado.autenticado ? 'Sair da gestão' : 'Entrar na gestão';
}

export async function carregarSessao() {
  try {
    const dados = await api.auth.sessao();
    estado.autenticado = dados.autenticado;
    estado.configurado = dados.configurado;
  } catch {
    estado.autenticado = false;
  }
  pintarBotao();
  return estado.autenticado;
}

export function abrirLogin() {
  const corpo = abrirModal('Acesso à gestão', `
    <p class="dim mb-14">
      Navegar, comprar e conversar com o assistente é livre. Criar, editar e
      excluir cadastros exige uma sessão administrativa.
    </p>
    <form id="form-login" novalidate>
      <div class="campo">
        <label for="campo-senha">Senha de acesso</label>
        <input id="campo-senha" name="senha" type="password" autocomplete="current-password"
               placeholder="••••••••" required />
      </div>
      <div class="modal__rodape">
        <button type="button" class="btn" id="cancelar">Cancelar</button>
        <button type="submit" class="btn btn--primario">Entrar</button>
      </div>
    </form>`);

  const form = corpo.querySelector('#form-login');
  corpo.querySelector('#cancelar').onclick = fecharModal;
  corpo.querySelector('#campo-senha').focus();

  form.onsubmit = async (evento) => {
    evento.preventDefault();
    const botao = form.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      await api.auth.login(form.senha.value);
      estado.autenticado = true;
      pintarBotao();
      fecharModal();
      sucesso('Sessão iniciada', 'Operações de gestão liberadas');
    } catch (err) {
      falha('Não foi possível entrar', err.message);
      botao.disabled = false;
    }
  };
}

async function sair() {
  await api.auth.logout().catch(() => {});
  estado.autenticado = false;
  pintarBotao();
  sucesso('Sessão encerrada');
}

/** Mensagem padrão quando o servidor recusa por falta de sessão. */
export function tratarErro(err, tituloPadrao) {
  if (err?.precisaLogin) {
    falha('Acesso restrito', 'Entre na gestão para executar esta operação.');
    abrirLogin();
    return;
  }
  falha(tituloPadrao, err?.message ?? 'Erro inesperado');
}

export function montarSessao() {
  const botao = document.getElementById('btn-sessao');
  if (!botao) return;
  botao.onclick = () => (estado.autenticado ? sair() : abrirLogin());
  carregarSessao();
}
