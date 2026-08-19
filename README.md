# ◆ Elo Platform

Plataforma que reúne **loja**, **gestão**, **construtor de chatbot no-code**, **atendimento humano** e **BI** — com o fluxo criado no no-code alimentando de verdade o assistente da loja.

Construída sobre Next.js, TypeScript e PostgreSQL, sem ORM: todo SQL é escrito à mão e as regras críticas de integridade vivem no próprio banco.

> Esta é a branch `elo-platform`. A branch `main` mantém a versão anterior (Express + JavaScript puro), publicada e funcionando.

## O ciclo que o projeto demonstra

```
Gerente monta o fluxo no No-Code  ─┐
   arrasta blocos, conecta         │
   Salvar → Testar → Publicar      │
                                   ▼
Cliente abre o chat na loja  ── usa a versão publicada
   pergunta sobre um pedido        │
   o bot consulta o banco de verdade
   pede atendente                  │
                                   ▼
Conversa entra na fila do Atendimento
   atendente assume e responde     │
                                   ▼
Tudo vira indicador no BI
```

## Módulos

| Área | O que faz |
|---|---|
| **Loja** (`/`) | vitrine com busca e filtros, carrinho, checkout e widget de atendimento |
| **Gestão** (`/gestao`) | painel, catálogo, pedidos com máquina de estados, clientes |
| **No-Code** (`/gestao/no-code`) | editor visual de fluxos com 9 tipos de bloco, versionamento e publicação |
| **Atendimento** (`/gestao/atendimento`) | fila, transferência do bot para humano, histórico e contexto do cliente |
| **BI** (`/gestao/bi`) | indicadores com filtro de período, gráficos de vendas, pedidos, clientes e atendimento |

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js (App Router) + React + TypeScript strict |
| Banco | PostgreSQL — enums, triggers, funções PL/pgSQL, views, JSONB |
| Validação | Zod, na borda de toda rota |
| Editor visual | React Flow (`@xyflow/react`) |
| Gráficos | Recharts |
| Testes | Vitest |
| Autenticação | própria — bcrypt + cookie HttpOnly assinado por HMAC |

## Arquitetura

```
app/(loja)      público          app/gestao      exige sessão
     │                                │
     └────────────┬───────────────────┘
                  ▼
     app/api/loja · app/api/chat · app/api/gestao
                  │
                  ▼
     modules/  catalogo · pedidos · clientes · bots · atendimento · indicadores
               schema (Zod) → service (regras) → repository (SQL)
                  │
                  ▼
     chatbot/  motor + executores (um arquivo por tipo de bloco)
                  │
                  ▼
     PostgreSQL — constraints, triggers e funções garantem a integridade
```

**Duas regras mantêm isso saudável:** `app/` nunca contém SQL nem regra de negócio; `modules/` e `chatbot/` nunca importam React.

### Decisões que valem explicar

- **Separação por prefixo de rota** — `/api/gestao/*` tem a autorização no grupo, então uma rota nova já nasce protegida, em vez de depender de lembrar de aplicar um middleware.
- **Venda transacional** — pedido, itens e baixa de estoque são atômicos. `SELECT … FOR UPDATE` trava a linha do produto, eliminando corrida de estoque em compras simultâneas.
- **Máquina de estados do pedido** — fonte única em `pedidos.types.ts`, importada tanto pelo servidor (que valida) quanto pela interface (que só exibe o que é possível).
- **Fluxo do chatbot é dado, não código** — `{ nodes, edges }` em JSONB. Trocar o atendimento inteiro não toca no motor.
- **Conversa guarda a versão do bot** — publicar uma v2 não altera conversas em andamento nem reescreve o histórico.
- **Validação antes de publicar** — bloco sem saída, menu com opção desconectada, condição sem os dois caminhos: a publicação é recusada com a lista de problemas.
- **Limite de saltos por turno** — um ciclo desenhado no fluxo é interrompido em vez de travar o servidor.
- **Motor no servidor** — o widget nunca recebe o fluxo. Ele envia a entrada e recebe as falas; a lógica que consulta o banco não vai para o navegador.
- **Atendimento por polling** — funções serverless não mantêm WebSocket aberto; consultar a cada 5s é a solução honesta para esse ambiente.
- **Exclusão protegida** — cliente com pedido e produto vendido são inativados, nunca apagados.

## Rodando localmente

Pré-requisitos: Node.js 20+ e PostgreSQL 14+.

```bash
npm install
cp .env.example .env    # ajuste as credenciais do seu PostgreSQL
createdb elo_commerce
npm run db:reset        # schema + dados fictícios + usuários + chatbot inicial
npm run dev
```

Acesse **http://localhost:3000**. O comando `db:usuarios` imprime as senhas geradas — elas não são exibidas de novo.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | sobe a aplicação em desenvolvimento |
| `npm run build` | build de produção |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:reset` | recria tudo do zero (recusa rodar contra banco remoto) |
| `npm run db:bot` | cria e publica o chatbot inicial |
| `npm test` | roda a suíte de testes |
| `npm run typecheck` | verificação de tipos |

## Segurança

- Autorização verificada **no servidor**, junto do acesso ao dado — esconder botão não é proteção.
- `401` para quem não tem sessão, `403` para quem tem sessão mas não tem o papel.
- Senhas com bcrypt; o hash é comparado mesmo quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados.
- Cookie `HttpOnly` + `SameSite` + `Secure` em produção, assinado por HMAC.
- Todo SQL parametrizado; nenhuma concatenação de entrada do usuário.
- `db:reset` recusa executar contra banco remoto ou `NODE_ENV=production`.

## Testes

```bash
npm test
```

Cobrem o que quebra silenciosamente: validação de CPF por dígito verificador, transições válidas do pedido, integridade do token de sessão (adulteração e expiração), execução do motor do chatbot (menu, condição, contexto, ciclo infinito) e as regras que impedem publicar um fluxo quebrado.

## Estrutura

```
src/
  app/
    (loja)/       vitrine, carrinho          — público
    gestao/       painel, produtos, pedidos, clientes, no-code, atendimento, bi
    api/          loja · chat · gestao
  modules/        domínio por contexto (schema · service · repository)
  chatbot/        motor + executores por tipo de bloco
  components/     interface compartilhada
  lib/            db · sessão · autorização · erros · formato
  db/sql/         migrations versionadas
  test/           suíte Vitest
```
