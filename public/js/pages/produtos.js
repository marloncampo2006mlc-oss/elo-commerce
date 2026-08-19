import { api } from '../api.js';
import {
  brl, esc, badge, carregando, vazio, paginacao, abrirModal, fecharModal,
  confirmar, sucesso, falha, lerFormulario, marcarErros, debounce,
  capaProduto, miniProduto, ehCaminhoDeImagem,
} from '../ui.js';

const estado = { busca: '', categoria: '', ativo: '', ordem: 'recentes', page: 1, limit: 12 };
let alvoAtual = null;

export async function produtos(alvo) {
  alvoAtual = alvo;
  const categorias = await api.produtos.categorias();

  alvo.innerHTML = `
    <div class="barra-ferramentas">
      <div class="busca"><input id="f-busca" placeholder="Buscar por nome ou SKU…" value="${esc(estado.busca)}" /></div>
      <select class="filtro" id="f-categoria">
        <option value="">Todas as categorias</option>
        ${categorias.map((c) => `<option value="${esc(c.categoria)}">${esc(c.categoria)} (${c.total})</option>`).join('')}
      </select>
      <select class="filtro" id="f-ativo">
        <option value="">Ativos e inativos</option>
        <option value="true">Somente ativos</option>
        <option value="false">Somente inativos</option>
      </select>
      <select class="filtro" id="f-ordem">
        <option value="recentes">Mais recentes</option>
        <option value="nome">Nome (A-Z)</option>
        <option value="preco_asc">Menor preço</option>
        <option value="preco_desc">Maior preço</option>
        <option value="estoque">Menor estoque</option>
      </select>
      <button class="btn btn--primario" id="btn-novo" style="margin-left:auto">＋ Novo produto</button>
    </div>
    <div id="lista">${carregando()}</div>`;

  for (const [id, chave] of [['#f-categoria', 'categoria'], ['#f-ativo', 'ativo'], ['#f-ordem', 'ordem']]) {
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
  const { data: itens, meta } = await api.produtos.listar(estado);

  if (!itens.length) {
    container.innerHTML = `<div class="card">${vazio('▤', 'Nenhum produto encontrado',
      'Cadastre um produto para começar a vender.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="vitrine">
      ${itens.map((p) => `
        <article class="produto">
          <div class="produto__capa">
            ${capaProduto(p.imagem, p.nome)}
            <span class="produto__tag">${p.ativo
              ? (p.estoque === 0 ? '<span class="badge badge--vermelho">sem estoque</span>'
                                 : `<span class="badge badge--verde">${p.estoque} un.</span>`)
              : '<span class="badge badge--cinza">inativo</span>'}</span>
          </div>
          <div class="produto__corpo">
            <span class="badge badge--violeta" style="align-self:flex-start">${esc(p.categoria)}</span>
            <div class="produto__nome">${esc(p.nome)}</div>
            <div class="produto__desc">${esc(p.descricao ?? '')}</div>
            <div class="mono dim">${esc(p.sku)}</div>
            <div class="produto__rodape">
              <div class="produto__preco">${brl(p.preco)}<small>estoque: ${p.estoque}</small></div>
              <div class="flex" style="gap:5px;margin-left:auto">
                <button class="btn btn--sm" data-estoque="${p.id}" title="Ajustar estoque">±</button>
                <button class="btn btn--sm" data-editar="${p.id}">Editar</button>
                <button class="btn btn--sm btn--perigo" data-excluir="${p.id}">✕</button>
              </div>
            </div>
          </div>
        </article>`).join('')}
    </div>
    <div class="card mt-16">${paginacao(meta)}</div>`;

  container.querySelectorAll('[data-pagina]').forEach((b) =>
    b.onclick = () => { estado.page = Number(b.dataset.pagina); renderizarLista(); });
  container.querySelectorAll('[data-editar]').forEach((b) => b.onclick = () => abrirFormulario(b.dataset.editar));
  container.querySelectorAll('[data-excluir]').forEach((b) => b.onclick = () => excluir(b.dataset.excluir));
  container.querySelectorAll('[data-estoque]').forEach((b) => b.onclick = () => ajustarEstoque(b.dataset.estoque));
}

async function abrirFormulario(id) {
  const produto = id ? await api.produtos.obter(id) : null;
  const v = (campo) => esc(produto?.[campo] ?? '');
  const [categorias, imagens] = await Promise.all([
    api.produtos.categorias(),
    api.produtos.imagens(),
  ]);

  /** "headset.svg" -> "Headset" (rótulo legível no seletor) */
  const rotuloArquivo = (arquivo) =>
    arquivo.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ')
           .replace(/^./, (c) => c.toUpperCase());

  const corpo = abrirModal(produto ? 'Editar produto' : 'Novo produto', `
    <form id="form-produto" novalidate>
      <div class="grid-form">
        <div class="campo"><label>SKU *</label>
          <input name="sku" value="${v('sku')}" placeholder="HDS-4200" ${produto ? 'readonly' : ''} required /></div>
        <div class="campo col-2"><label>Imagem do produto</label>
          <div class="flex" style="gap:14px;align-items:stretch">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <select id="sel-imagem">
                <option value="">— sem imagem (usar emoji) —</option>
                ${imagens.map((img) => `<option value="${esc(img.caminho)}"
                  ${produto?.imagem === img.caminho ? 'selected' : ''}>${esc(rotuloArquivo(img.arquivo))}</option>`).join('')}
              </select>
              <input name="imagem" id="inp-imagem" value="${v('imagem')}"
                     placeholder="/assets/produtos/arquivo.svg ou 🎧" maxlength="255" />
              <span class="dim" style="font-size:11.5px">
                Escolha um render do catálogo ou informe o caminho de uma foto colocada
                em <span class="mono">public/assets/produtos</span>.
              </span>
            </div>
            <div class="previa-imagem" id="previa-imagem" style="width:172px"></div>
          </div>
        </div>
        <div class="campo col-2"><label>Nome *</label>
          <input name="nome" value="${v('nome')}" placeholder="Headset Profissional HD 4200" required /></div>
        <div class="campo"><label>Categoria *</label>
          <input name="categoria" value="${v('categoria')}" list="lista-categorias" placeholder="Áudio" required />
          <datalist id="lista-categorias">
            ${categorias.map((c) => `<option value="${esc(c.categoria)}">`).join('')}
          </datalist></div>
        <div class="campo"><label>Preço (R$) *</label>
          <input name="preco" type="number" step="0.01" min="0.01" value="${produto?.preco ?? ''}" required /></div>
        <div class="campo"><label>Estoque</label>
          <input name="estoque" type="number" min="0" value="${produto?.estoque ?? 0}" /></div>
        <div class="campo"><label>Situação</label>
          <select name="ativo">
            <option value="true" ${produto?.ativo !== false ? 'selected' : ''}>Ativo na vitrine</option>
            <option value="false" ${produto?.ativo === false ? 'selected' : ''}>Inativo</option>
          </select></div>
        <div class="campo col-2"><label>Descrição</label>
          <textarea name="descricao" placeholder="Detalhes técnicos, diferenciais…">${v('descricao')}</textarea></div>
      </div>
      <div class="modal__rodape">
        <button type="button" class="btn" id="cancelar">Cancelar</button>
        <button type="submit" class="btn btn--primario">${produto ? 'Salvar alterações' : 'Cadastrar produto'}</button>
      </div>
    </form>`);

  const form = corpo.querySelector('#form-produto');
  corpo.querySelector('#cancelar').onclick = fecharModal;

  // Seletor, campo de texto e prévia sempre em sincronia.
  const previa = corpo.querySelector('#previa-imagem');
  const campoImagem = corpo.querySelector('#inp-imagem');
  const seletor = corpo.querySelector('#sel-imagem');

  const atualizarPrevia = () => {
    const valor = campoImagem.value.trim();
    previa.innerHTML = valor
      ? (ehCaminhoDeImagem(valor)
          ? `<img src="${esc(valor)}" alt="Prévia do produto" />`
          : esc(valor))
      : '<span class="dim" style="font-size:12px">sem imagem</span>';
  };

  seletor.onchange = () => { campoImagem.value = seletor.value; atualizarPrevia(); };
  campoImagem.oninput = () => {
    if (seletor.value !== campoImagem.value) seletor.value = '';
    atualizarPrevia();
  };
  atualizarPrevia();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const botao = form.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      const dados = lerFormulario(form);
      dados.ativo = dados.ativo === 'true';
      if (produto) { delete dados.sku; await api.produtos.atualizar(produto.id, dados); }
      else await api.produtos.criar(dados);
      fecharModal();
      sucesso(produto ? 'Produto atualizado' : 'Produto cadastrado', dados.nome);
      renderizarLista();
    } catch (err) {
      marcarErros(form, err.detalhes);
      falha('Não foi possível salvar', err.message);
    } finally { botao.disabled = false; }
  };
}

async function ajustarEstoque(id) {
  const produto = await api.produtos.obter(id);
  const corpo = abrirModal('Ajuste de estoque', `
    <div class="flex mb-14" style="gap:12px">
      ${miniProduto(produto.imagem, produto.nome, 40)}
      <div><strong>${esc(produto.nome)}</strong><div class="dim mono">${esc(produto.sku)}</div></div>
      <span class="badge badge--violeta" style="margin-left:auto">saldo: ${produto.estoque}</span>
    </div>
    <form id="form-estoque">
      <div class="campo"><label>Ajuste (positivo entra, negativo sai)</label>
        <input name="ajuste" type="number" value="10" required /></div>
      <div class="flex mt-16" style="gap:6px;flex-wrap:wrap">
        ${[-10, -5, -1, 1, 5, 10, 50].map((n) =>
          `<button type="button" class="btn btn--sm" data-rapido="${n}">${n > 0 ? '+' : ''}${n}</button>`).join('')}
      </div>
      <div class="modal__rodape">
        <button type="button" class="btn" id="cancelar">Cancelar</button>
        <button type="submit" class="btn btn--primario">Aplicar ajuste</button>
      </div>
    </form>`);

  const form = corpo.querySelector('#form-estoque');
  corpo.querySelector('#cancelar').onclick = fecharModal;
  corpo.querySelectorAll('[data-rapido]').forEach((b) =>
    b.onclick = () => { form.ajuste.value = b.dataset.rapido; });

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const atualizado = await api.produtos.ajustarEstoque(id, Number(form.ajuste.value));
      fecharModal();
      sucesso('Estoque atualizado', `${produto.nome}: ${atualizado.estoque} unidades`);
      renderizarLista();
    } catch (err) { falha('Ajuste recusado', err.message); }
  };
}

async function excluir(id) {
  const produto = await api.produtos.obter(id);
  const confirmado = await confirmar({
    titulo: 'Excluir produto',
    mensagem: `Remover "${produto.nome}" do catálogo?`,
    rotulo: 'Excluir',
  });
  if (!confirmado) return;
  try {
    await api.produtos.remover(id);
    sucesso('Produto removido');
    renderizarLista();
  } catch (err) { falha('Exclusão bloqueada', err.message); }
}
