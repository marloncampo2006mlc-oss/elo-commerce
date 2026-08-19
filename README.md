# ◆ Elo Commerce

Plataforma de vendas com atendimento omnichannel — CRUD completo em **Node.js + Express + PostgreSQL**, sem ORM, com front-end em JavaScript puro (zero frameworks, zero build step).

Projeto construído como estudo aplicado para a vaga de estágio em **Conhecimento, Serviços e Integrações (CSI)** — cobre exatamente o que a área trabalha: desenvolvimento frontend/backend, integrações e soluções de comunicação (chatbot e URA).

## O que tem aqui

- **Clientes** — cadastro com validação real de CPF (dígitos verificadores), busca, filtros e histórico de compras.
- **Produtos** — catálogo com imagens, categorias, controle de estoque e ajuste atômico de saldo.
- **Pedidos** — venda transacional: pedido, itens e baixa de estoque são gravados atomicamente (tudo ou nada), com máquina de estados (`rascunho → aguardando pagamento → pago → enviado → entregue`, com cancelamento devolvendo estoque).
- **Loja** — vitrine pública com carrinho e checkout, consumindo a mesma API do backoffice.
- **Atendimento (chatbot / URA)** — motor conversacional próprio: o fluxo de diálogo é *dado* (não código), a mesma "árvore" atende tanto teclas de URA quanto linguagem natural no chat, e toda sessão fica registrada em `JSONB` no PostgreSQL.
- **Dashboard** — indicadores, gráficos (SVG puro, sem libs) e alertas de estoque, tudo servido por views SQL versionadas em migration.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js (ESM) + Express |
| Banco | PostgreSQL 16 — enums, triggers, funções PL/pgSQL, views, JSONB |
| Validação | Zod |
| Frontend | JavaScript puro, SPA com router próprio via hash, CSS com design tokens (tema claro/escuro) |
| Testes | `node --test` |

Sem ORM: todo SQL é escrito à mão e parametrizado. Regras de negócio críticas (recalcular total do pedido, baixar estoque) vivem como triggers e funções no próprio banco — não dependem do código da aplicação para se manterem íntegras.

## Arquitetura

```
requisição
   │
   ▼
routes.js          → define a rota e encadeia middlewares
   │
   ▼
validate(schema)    → Zod valida e converte a entrada (422 se inválida)
   │
   ▼
controller          → só traduz HTTP ⇄ domínio
   │
   ▼
service              → regras de negócio, transações, orquestração
   │
   ▼
repository            → único lugar com SQL, sempre parametrizado
   │
   ▼
PostgreSQL             → constraints, triggers e funções garantem a integridade
   │
   ▼
errorHandler          → traduz erro do banco (23505, 23503…) em mensagem de negócio
```

Cada módulo de domínio (`clientes`, `produtos`, `pedidos`, `atendimentos`) segue essa mesma divisão em `src/modules/<nome>/`.

### Decisões de projeto

- **Transação na venda** — pedido, itens e baixa de estoque são atômicos: se um item falhar, nada é gravado.
- **`SELECT … FOR UPDATE`** — trava a linha do produto durante a venda, eliminando corrida de estoque em compras simultâneas.
- **Máquina de estados nos pedidos** — o pedido só transita por caminhos válidos; cancelar devolve o estoque automaticamente.
- **Exclusão protegida** — cliente com pedido ou produto já vendido não pode ser apagado; a saída é inativar.
- **Fluxo da URA como dado** — o atendimento inteiro é um objeto declarativo (`src/modules/atendimentos/fluxo.js`); mudar o menu não mexe no motor.
- **Views para analytics** — o dashboard consome views versionadas em migration (`src/db/sql/002_views.sql`), não SQL solto espalhado pelo código.

## Rodando localmente

Pré-requisitos: Node.js 20+ e PostgreSQL 14+ rodando localmente.

```bash
npm install
cp .env.example .env    # ajuste usuário/senha do seu PostgreSQL
npm run db:reset        # cria o schema e popula dados de demonstração
npm start
```

Acesse **http://localhost:3333**.

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | sobe o servidor |
| `npm run dev` | sobe com `--watch` (recarrega ao salvar) |
| `npm run db:migrate` | aplica as migrations pendentes |
| `npm run db:seed` | popula o banco com dados de demonstração |
| `npm run db:reset` | reseta o schema e roda tudo de novo |
| `npm test` | roda a suíte de testes |

## Estrutura

```
src/
  config/        variáveis de ambiente centralizadas
  db/            pool de conexão, migrations, seed, SQL (schema + views)
  middlewares/   tratamento de erro, log de requisições
  modules/       um diretório por domínio (schema · repository · service · controller · routes)
  shared/        helpers de HTTP, erros e validação
public/
  css/           design system (tokens, temas claro/escuro)
  js/            SPA: router, cliente de API, páginas, widget de chat
  assets/        renders SVG do catálogo de produtos
```

## Endpoints principais

```
GET    /api/dashboard                    indicadores completos em uma chamada
GET    /api/clientes                     lista com busca, filtros e paginação
POST   /api/pedidos                      venda transacional com baixa de estoque
PATCH  /api/pedidos/:id/status           avança o pedido na máquina de estados
POST   /api/atendimentos                 abre uma sessão de chatbot/URA
POST   /api/atendimentos/:id/mensagens   processa um turno da conversa
```

A lista completa, com exemplos, está disponível na própria aplicação em **API & Arquitetura** (`/#/api`).
