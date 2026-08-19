import { api } from '../api.js';
import { esc } from '../ui.js';

const ENDPOINTS = [
  ['Clientes', [
    ['GET', '/api/clientes', 'lista paginada com busca, filtros e ordenação'],
    ['GET', '/api/clientes/:id', 'ficha completa com histórico consolidado'],
    ['POST', '/api/clientes', 'cadastro com validação de CPF (dígitos verificadores)'],
    ['PUT', '/api/clientes/:id', 'atualização parcial dos campos enviados'],
    ['DELETE', '/api/clientes/:id', 'bloqueado se houver pedidos vinculados'],
  ]],
  ['Produtos', [
    ['GET', '/api/produtos', 'catálogo com filtros de categoria, situação e estoque'],
    ['GET', '/api/produtos/categorias', 'agregação de categorias com contagem'],
    ['POST', '/api/produtos', 'cria item com SKU único'],
    ['PUT', '/api/produtos/:id', 'edição do cadastro'],
    ['PATCH', '/api/produtos/:id/estoque', 'ajuste incremental atômico'],
    ['DELETE', '/api/produtos/:id', 'bloqueado se o produto já foi vendido'],
  ]],
  ['Pedidos', [
    ['GET', '/api/pedidos', 'lista com filtros por status, canal e cliente'],
    ['GET', '/api/pedidos/:id', 'pedido com itens e dados do cliente'],
    ['POST', '/api/pedidos', 'venda transacional com baixa de estoque'],
    ['PATCH', '/api/pedidos/:id/status', 'máquina de estados; cancelar devolve estoque'],
    ['DELETE', '/api/pedidos/:id', 'só rascunhos e cancelados'],
  ]],
  ['Atendimento (URA / chatbot)', [
    ['POST', '/api/atendimentos', 'abre sessão e devolve o menu inicial'],
    ['POST', '/api/atendimentos/:id/mensagens', 'processa um turno da conversa'],
    ['GET', '/api/atendimentos/:id', 'transcrição completa em JSONB'],
    ['GET', '/api/atendimentos/estatisticas', 'taxa de resolução automática'],
  ]],
  ['Plataforma', [
    ['GET', '/api/dashboard', 'todos os indicadores em uma chamada'],
    ['GET', '/api/health', 'verificação de conectividade com o banco'],
  ]],
];

export async function apidoc(alvo) {
  const saude = await api.health().catch(() => null);

  alvo.innerHTML = `
    <section class="doc-secao">
      <div class="card card--pad" style="background:linear-gradient(120deg,rgb(124 92 255/.16),transparent);border-color:transparent">
        <h2 style="font-size:20px;margin-bottom:6px">Como este projeto foi construído</h2>
        <p class="dim" style="max-width:70ch">
          API REST em Node.js com arquitetura em camadas e PostgreSQL como fonte única de verdade.
          Sem ORM: SQL parametrizado, transações explícitas e regras de negócio críticas
          (total do pedido, baixa de estoque) garantidas por triggers e funções no próprio banco.
        </p>
      </div>
    </section>

    <section class="doc-secao">
      <h3 style="font-size:15px;margin-bottom:12px">Stack</h3>
      <div class="pilha">
        <div class="pilha__item"><strong>Node.js + Express</strong><span>API REST modular em ESM</span></div>
        <div class="pilha__item"><strong>PostgreSQL 16</strong><span>enums, triggers, views, JSONB, funções PL/pgSQL</span></div>
        <div class="pilha__item"><strong>Zod</strong><span>validação declarativa na borda da API</span></div>
        <div class="pilha__item"><strong>JS puro no front</strong><span>SPA com router próprio, zero dependências</span></div>
      </div>
    </section>

    <section class="doc-secao">
      <h3 style="font-size:15px;margin-bottom:12px">Fluxo de uma requisição</h3>
      <pre class="codigo">requisição
   ↓
routes.js          → define a rota e encadeia middlewares
   ↓
validate(schema)   → Zod valida e converte a entrada (422 se inválida)
   ↓
controller         → só traduz HTTP ⇄ domínio
   ↓
service            → regras de negócio, transações, orquestração
   ↓
repository         → único lugar com SQL, sempre parametrizado
   ↓
PostgreSQL         → constraints, triggers e funções garantem a integridade
   ↓
errorHandler       → traduz erro do banco (23505, 23503…) em mensagem de negócio</pre>
    </section>

    <section class="doc-secao">
      <h3 style="font-size:15px;margin-bottom:12px">Decisões de projeto</h3>
      <div class="pilha">
        <div class="pilha__item"><strong>Transação na venda</strong>
          <span>pedido, itens e baixa de estoque são atômicos: falhou um, nada é gravado</span></div>
        <div class="pilha__item"><strong>SELECT … FOR UPDATE</strong>
          <span>trava a linha do produto e elimina corrida de estoque em vendas simultâneas</span></div>
        <div class="pilha__item"><strong>Máquina de estados</strong>
          <span>o pedido só transita por caminhos válidos; cancelar devolve o estoque</span></div>
        <div class="pilha__item"><strong>Exclusão protegida</strong>
          <span>cliente com pedido e produto vendido não somem: vira inativação</span></div>
        <div class="pilha__item"><strong>Fluxo da URA como dado</strong>
          <span>o atendimento é um objeto declarativo; mudar o menu não mexe no motor</span></div>
        <div class="pilha__item"><strong>Views para analytics</strong>
          <span>o dashboard consome views versionadas em migration, não SQL solto no código</span></div>
      </div>
    </section>

    <section class="doc-secao">
      <h3 style="font-size:15px;margin-bottom:12px">Endpoints disponíveis</h3>
      ${ENDPOINTS.map(([grupo, lista]) => `
        <div class="card mb-14">
          <div class="card__topo"><h3>${esc(grupo)}</h3></div>
          ${lista.map(([metodo, rota, desc]) => `
            <div class="endpoint">
              <span class="metodo metodo--${metodo.toLowerCase()}">${metodo}</span>
              <span class="endpoint__rota">${esc(rota)}</span>
              <span class="endpoint__desc">${esc(desc)}</span>
            </div>`).join('')}
        </div>`).join('')}
    </section>

    <section class="doc-secao">
      <h3 style="font-size:15px;margin-bottom:12px">Modelo de dados</h3>
      <pre class="codigo">clientes ──1:N──> pedidos ──1:N──> pedido_itens ──N:1──> produtos
    │                 │
    │                 └── total recalculado por trigger a cada item
    └──1:N──> atendimentos (transcript JSONB, nó atual do fluxo)

views: vw_pedidos_detalhados · vw_faturamento_diario · vw_top_produtos
       vw_vendas_por_canal   · vw_clientes_resumo
funções: set_updated_at() · recalcular_total_pedido() · baixar_estoque()</pre>
    </section>

    <section class="doc-secao">
      <div class="card card--pad">
        <div class="flex entre">
          <div><strong>Estado do serviço</strong>
            <div class="dim" style="font-size:12.5px">
              ${saude ? `banco <b>${esc(saude.banco)}</b> respondendo em ${esc(new Date(saude.agora).toLocaleTimeString('pt-BR'))}`
                      : 'sem conexão com o banco'}</div></div>
          <span class="badge badge--${saude ? 'verde' : 'vermelho'}">${saude ? 'operacional' : 'indisponível'}</span>
        </div>
      </div>
    </section>`;
}
