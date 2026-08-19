import { api } from '../api.js';
import {
  brl, data, badge, esc, avatar, cpfFormatado, carregando, vazio, paginacao,
  abrirModal, fecharModal, confirmar, sucesso, falha, lerFormulario, marcarErros, debounce,
} from '../ui.js';

const estado = { busca: '', status: '', uf: '', ordem: 'recentes', page: 1, limit: 8 };
let alvoAtual = null;

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export async function clientes(alvo) {
  alvoAtual = alvo;
  alvo.innerHTML = `
    <div class="barra-ferramentas">
      <div class="busca"><input id="f-busca" placeholder="Buscar por nome, e-mail ou CPF…" value="${esc(estado.busca)}" /></div>
      <select class="filtro" id="f-status">
        <option value="">Todos os status</option>
        <option value="ativo">Ativos</option>
        <option value="prospect">Prospects</option>
        <option value="inativo">Inativos</option>
      </select>
      <select class="filtro" id="f-ordem">
        <option value="recentes">Mais recentes</option>
        <option value="nome">Nome (A-Z)</option>
        <option value="gasto">Maior valor comprado</option>
      </select>
      <button class="btn btn--primario" id="btn-novo" style="margin-left:auto">＋ Novo cliente</button>
    </div>
    <div id="lista">${carregando()}</div>`;

  alvo.querySelector('#f-status').value = estado.status;
  alvo.querySelector('#f-ordem').value = estado.ordem;

  alvo.querySelector('#f-busca').oninput = debounce((e) => {
    estado.busca = e.target.value; estado.page = 1; renderizarLista();
  });
  alvo.querySelector('#f-status').onchange = (e) => { estado.status = e.target.value; estado.page = 1; renderizarLista(); };
  alvo.querySelector('#f-ordem').onchange = (e) => { estado.ordem = e.target.value; renderizarLista(); };
  alvo.querySelector('#btn-novo').onclick = () => abrirFormulario();

  await renderizarLista();
}

async function renderizarLista() {
  const container = alvoAtual.querySelector('#lista');
  const { data: itens, meta } = await api.clientes.listar(estado);

  if (!itens.length) {
    container.innerHTML = `<div class="card">${vazio('◍', 'Nenhum cliente encontrado',
      'Ajuste os filtros ou cadastre o primeiro cliente.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="tabela-wrap">
        <table>
          <thead><tr>
            <th>Cliente</th><th>Documento</th><th>Localização</th>
            <th class="num">Pedidos</th><th class="num">Total gasto</th>
            <th>Status</th><th>Cadastro</th><th></th>
          </tr></thead>
          <tbody>
            ${itens.map((c) => `
              <tr>
                <td>
                  <div class="pessoa">${avatar(c.nome)}
                    <div><div class="pessoa__nome">${esc(c.nome)}</div>
                         <div class="pessoa__sub">${esc(c.email)}</div></div>
                  </div>
                </td>
                <td class="mono">${cpfFormatado(c.cpf)}</td>
                <td>${c.cidade ? `${esc(c.cidade)}/${esc(c.uf ?? '')}` : '<span class="dim">—</span>'}</td>
                <td class="num">${c.total_pedidos}</td>
                <td class="num"><b>${brl(c.total_gasto)}</b></td>
                <td>${badge(c.status)}</td>
                <td class="dim">${data(c.created_at)}</td>
                <td class="acoes">
                  <button class="btn btn--sm btn--icone" data-ver="${c.id}" title="Ver ficha completa">◎</button>
                  <button class="btn btn--sm btn--icone" data-editar="${c.id}" title="Editar cadastro">✎</button>
                  <button class="btn btn--sm btn--icone btn--perigo" data-excluir="${c.id}" title="Excluir cliente">✕</button>
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
  container.querySelectorAll('[data-editar]').forEach((b) => b.onclick = () => abrirFormulario(b.dataset.editar));
  container.querySelectorAll('[data-excluir]').forEach((b) => b.onclick = () => excluir(b.dataset.excluir));
}

async function abrirFormulario(id) {
  const cliente = id ? await api.clientes.obter(id) : null;
  const v = (campo) => esc(cliente?.[campo] ?? '');

  const corpo = abrirModal(cliente ? 'Editar cliente' : 'Novo cliente', `
    <form id="form-cliente" novalidate>
      <div class="grid-form">
        <div class="campo col-2"><label>Nome completo *</label>
          <input name="nome" value="${v('nome')}" placeholder="Ex.: Ana Beatriz Machado" required /></div>
        <div class="campo"><label>E-mail *</label>
          <input name="email" type="email" value="${v('email')}" placeholder="nome@email.com" required /></div>
        <div class="campo"><label>CPF *</label>
          <input name="cpf" value="${v('cpf')}" placeholder="000.000.000-00" maxlength="14" required /></div>
        <div class="campo"><label>Telefone</label>
          <input name="telefone" value="${v('telefone')}" placeholder="(48) 99999-0000" /></div>
        <div class="campo"><label>Data de nascimento</label>
          <input name="data_nascimento" type="date" value="${(cliente?.data_nascimento ?? '').slice(0, 10)}" /></div>
        <div class="campo"><label>Cidade</label>
          <input name="cidade" value="${v('cidade')}" placeholder="Florianópolis" /></div>
        <div class="campo"><label>UF</label>
          <select name="uf"><option value="">—</option>
            ${UFS.map((u) => `<option ${cliente?.uf === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select></div>
        <div class="campo col-2"><label>Status</label>
          <select name="status">
            ${['ativo', 'prospect', 'inativo'].map((s) =>
              `<option value="${s}" ${cliente?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></div>
        <div class="campo col-2"><label>Observações</label>
          <textarea name="observacoes" placeholder="Preferências, histórico de contato…">${v('observacoes')}</textarea></div>
      </div>
      <div class="modal__rodape">
        <button type="button" class="btn" id="cancelar">Cancelar</button>
        <button type="submit" class="btn btn--primario">${cliente ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
      </div>
    </form>`);

  const form = corpo.querySelector('#form-cliente');
  corpo.querySelector('#cancelar').onclick = fecharModal;

  // Máscara de CPF conforme digita.
  form.cpf.oninput = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const botao = form.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      const dados = lerFormulario(form);
      if (cliente) await api.clientes.atualizar(cliente.id, dados);
      else await api.clientes.criar(dados);
      fecharModal();
      sucesso(cliente ? 'Cliente atualizado' : 'Cliente cadastrado', dados.nome);
      renderizarLista();
    } catch (err) {
      marcarErros(form, err.detalhes);
      falha('Não foi possível salvar', err.message);
    } finally {
      botao.disabled = false;
    }
  };
}

async function verDetalhes(id) {
  const [cliente, pedidos] = await Promise.all([
    api.clientes.obter(id),
    api.pedidos.listar({ cliente_id: id, limit: 5 }),
  ]);

  abrirModal('Ficha do cliente', `
    <div class="flex" style="gap:14px;margin-bottom:20px">
      ${avatar(cliente.nome)}
      <div><h3 style="font-size:17px">${esc(cliente.nome)}</h3>
        <span class="dim">${esc(cliente.email)}</span></div>
      <span style="margin-left:auto">${badge(cliente.status)}</span>
    </div>
    <div class="pilha mb-14">
      <div class="pilha__item"><strong>${cliente.total_pedidos}</strong><span>pedidos realizados</span></div>
      <div class="pilha__item"><strong>${brl(cliente.total_gasto)}</strong><span>total comprado</span></div>
      <div class="pilha__item"><strong>${data(cliente.ultimo_pedido)}</strong><span>último pedido</span></div>
    </div>
    <div class="pilha mb-14">
      <div class="pilha__item"><strong class="mono">${cpfFormatado(cliente.cpf)}</strong><span>CPF</span></div>
      <div class="pilha__item"><strong>${esc(cliente.telefone ?? '—')}</strong><span>telefone</span></div>
      <div class="pilha__item"><strong>${esc(cliente.cidade ?? '—')}${cliente.uf ? '/' + esc(cliente.uf) : ''}</strong><span>localização</span></div>
      <div class="pilha__item"><strong>${data(cliente.data_nascimento)}</strong><span>nascimento</span></div>
    </div>
    ${cliente.observacoes ? `<p class="dim mb-14">“${esc(cliente.observacoes)}”</p>` : ''}
    <h4 style="font-size:13px;margin:18px 0 8px">Pedidos recentes</h4>
    ${pedidos.data.length ? `<div class="card"><div class="lista-simples">
      ${pedidos.data.map((p) => `
        <div class="lista-simples__item">
          <div class="lista-simples__icone">#${p.numero}</div>
          <div class="lista-simples__txt"><strong>${brl(p.total)}</strong>
            <span>${data(p.created_at)} · ${esc(p.canal)}</span></div>
          ${badge(p.status)}
        </div>`).join('')}
    </div></div>` : '<p class="dim">Nenhum pedido registrado ainda.</p>'}
  `, { largo: true });
}

async function excluir(id) {
  const cliente = await api.clientes.obter(id);
  const confirmado = await confirmar({
    titulo: 'Excluir cliente',
    mensagem: `Remover "${cliente.nome}" da base? Esta ação não pode ser desfeita.`,
    rotulo: 'Excluir',
  });
  if (!confirmado) return;

  try {
    await api.clientes.remover(id);
    sucesso('Cliente removido');
    renderizarLista();
  } catch (err) {
    falha('Exclusão bloqueada', err.message);
  }
}
