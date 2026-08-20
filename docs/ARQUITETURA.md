# Arquitetura da Elo Platform

Documento técnico do projeto: como está organizado, por que cada decisão foi tomada e onde encontrar cada coisa.

---

## Visão geral

A plataforma reúne cinco frentes que normalmente seriam sistemas separados, ligadas por um fluxo único: **o chatbot montado no No-Code é o mesmo que atende o cliente na loja, e a conversa que ele não resolve vira um atendimento humano que alimenta o BI.**

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                            │
├───────────────────────────┬─────────────────────────────────┤
│   LOJA  (público)         │   GESTÃO  (exige sessão)        │
│   vitrine · carrinho      │   painel · produtos · pedidos   │
│   checkout · chatbot      │   clientes · no-code            │
│                           │   atendimento · BI · usuários   │
└───────────────────────────┴─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  /api/loja/*         /api/chat/*         /api/gestao/*
  público             público             privilégio obrigatório
        └───────────────────┼───────────────────┘
                            ▼
              CAMADA DE DOMÍNIO (server-only)
   modules/ catalogo · pedidos · clientes · bots
            atendimento · usuarios · indicadores
        cada um: schema (Zod) → service → repository
                            │
                            ▼
                   MOTOR DO CHATBOT
        chatbot/motor.ts + executores/ (um por bloco)
                            │
                            ▼
                       PostgreSQL
     constraints · triggers · funções · views · JSONB
```

**Duas regras estruturais mantêm isso saudável:**

- `app/` nunca contém SQL nem regra de negócio — só orquestra e renderiza.
- `modules/` e `chatbot/` nunca importam React — são testáveis sem navegador.

---

## Estrutura de diretórios

```
src/
  app/
    (loja)/            vitrine, carrinho          → público
    gestao/            8 páginas administrativas  → guarda por privilégio
    login/
    api/
      loja/            catálogo e checkout        → público
      chat/            widget do assistente       → público
      gestao/          tudo o mais                → privilégio obrigatório
  modules/             domínio por contexto
    <contexto>/
      *.schema.ts      validação Zod na borda
      *.service.ts     regras de negócio e transações
      *.repository.ts  único lugar com SQL
      *.types.ts       contratos compartilhados
  chatbot/
    motor.ts           percorre o grafo do fluxo
    executores/        um arquivo por tipo de bloco
    tipos.ts           contrato nodes/edges
  lib/                 db · sessão · autorização · erros · formato · páginas
  components/          interface compartilhada
  db/sql/              8 migrations versionadas
  test/                suíte Vitest
```

---

## Banco de dados

### Modelo

```
clientes ──┬──< pedidos ──< pedido_itens >── produtos
           │        (trigger recalcula o total)
           │
           └──< atendimentos ──┬──< atendimento_mensagens
                    │          └──< atendimento_eventos
                    │
                    └── bot_versao_id ──> bot_versoes >── bots
                                          (fluxo JSONB)

usuarios (equipe interna, separada de clientes)
  papel + privilegios[]  →  acesso efetivo
```

### O que o banco garante sozinho

Regras críticas não vivem só no código da aplicação. Se outro sistema — ou um script — escrever direto na tabela, os dados continuam consistentes:

| Mecanismo | O que garante |
|---|---|
| `trigger recalcular_total_pedido` | o total do pedido nunca diverge da soma dos itens |
| `função baixar_estoque()` | lança exceção se faltar saldo, abortando a transação inteira |
| coluna gerada `subtotal` | quantidade × preço sempre em sincronia |
| `CHECK` em preço, estoque, CPF, e-mail, UF | valores inválidos são recusados na origem |
| enums (`status_pedido`, `papel_usuario`…) | estado impossível não entra |
| índice único parcial em `bot_versoes` | no máximo uma versão publicada por bot |
| `ON DELETE RESTRICT` | apagar cliente com pedido é bloqueado pelo banco |

### Migrations

Numeradas e idempotentes, registradas em `schema_migrations`:

| Arquivo | O que faz |
|---|---|
| `001_schema` | tabelas base, enums, triggers, funções |
| `002_views` | views analíticas do dashboard |
| `003_imagens` | coluna de imagem passa a aceitar caminho |
| `004_usuarios` | equipe interna com hash bcrypt |
| `005_status_atendimento` | novos valores do enum — isolado por exigência do PostgreSQL |
| `006_bots_atendimento` | bots, versões, mensagens e eventos normalizados |
| `007_ordem_mensagens` | corrige ordenação com `clock_timestamp()` |
| `008_privilegios_usuario` | privilégios individuais por pessoa |

O comando de reset **recusa executar** contra banco remoto ou `NODE_ENV=production`, exigindo `--forcar` consciente.

---

## Segurança

### Autenticação

Sessão assinada por HMAC em cookie `HttpOnly`, sem estado no servidor — requisito em ambiente serverless, onde cada requisição pode cair em um processo diferente.

- Senha com **bcrypt**; a senha em texto nunca é persistida.
- O serviço compara o hash **mesmo quando o e-mail não existe**, para que o tempo de resposta não revele quais e-mails estão cadastrados.
- Mensagem de erro genérica: não diz se falhou o e-mail ou a senha.
- `SameSite=Lax` + `Secure` em produção.
- "Lembrar de mim" estende a sessão de 8 h para 30 dias, com a validade **assinada dentro do token** — esticar o cookie no navegador não estende o acesso.
- O redirecionamento pós-login só aceita destinos internos, fechando *open redirect*.

### Autorização

Modelo de **capacidades**, não de cargos:

```
usuário → papel (pacote padrão)
        → privilegios[] (opcional: substitui o pacote por inteiro)
        → privilégios efetivos
```

A verificação acontece **em duas camadas independentes**:

1. **Páginas** — `exigirAcesso('bi.ver')` antes de qualquer consulta. Quem não tem o privilégio nem recebe o HTML.
2. **Rotas de API** — `exigirPrivilegio('catalogo.editar')` junto do acesso ao dado.

Ambas **consultam o banco**, não o cookie: o token carrega o papel do momento do login, então revogar um acesso só valeria no login seguinte. Assim vale na hora.

O menu lateral é filtrado pelos mesmos privilégios — mas isso é conveniência. Quem digita a URL continua sendo barrado pela guarda da página.

> **Bug real que originou esse desenho:** a proteção existia só nas rotas de API. Como as páginas são Server Components que chamam os serviços diretamente, sem passar pela API, a verificação era contornada — um atendente abria `/gestao/bi` e via o faturamento inteiro.

### Dados

- Todo SQL é **parametrizado** (`$1`, `$2`); nenhuma concatenação de entrada do usuário.
- Ordenação e filtros vêm de **mapas fechados**, nunca de texto livre.
- Validação Zod na borda de toda rota; o service nunca vê entrada crua.
- Segredos só em variáveis de ambiente — `.env` fora do Git.

---

## Motor do chatbot

O fluxo conversacional é **dado, não código**: um grafo `{ nodes, edges }` em JSONB.

```
Conversa chega  →  carrega o fluxo da versão vinculada
                →  executor do bloco atual processa a entrada
                →  resolve a aresta de saída
                →  encadeia blocos automáticos
                →  para no primeiro que exige resposta
                →  persiste mensagens + nó atual + contexto
```

### Nove blocos, um executor cada

`inicio` · `mensagem` · `pergunta` · `menu` · `condicao` · `buscar_produtos` · `consultar_pedido` · `transferir` · `finalizar`

Adicionar um bloco novo é criar um arquivo em `chatbot/executores/` e registrá-lo. **O motor não muda.**

### Decisões que sustentam o módulo

**A conversa guarda a versão do bot.** `atendimentos.bot_versao_id` congela qual versão atendeu. Publicar uma v2 não altera conversas em andamento nem reescreve o histórico.

**Validação antes de publicar.** Bloco sem saída, menu com opção desconectada, condição sem os dois caminhos, bloco inalcançável: a publicação é recusada com a lista de problemas. É melhor recusar na gestão do que quebrar com um cliente na linha.

**Limite de saltos por turno.** Um ciclo `A → B → A` desenhado no fluxo é interrompido em vez de travar o servidor.

**Dependências injetadas.** As consultas ao banco chegam por parâmetro, o que torna o motor testável sem nenhuma infraestrutura — os 12 testes do motor rodam em milissegundos.

**Motor 100% no servidor.** O widget nunca recebe o fluxo: envia a entrada e recebe as falas. A lógica que consulta pedidos e produtos não vai para o navegador.

---

## Decisões de projeto

| Decisão | Motivo |
|---|---|
| **Sem ORM** | SQL escrito à mão para entender índice, transação e plano de execução — e custo assumido: toda query parametrizada |
| **Separação por prefixo de API** | `/api/gestao/*` tem a autorização no grupo; rota nova nasce protegida em vez de depender de lembrar |
| **`SELECT … FOR UPDATE` na venda** | trava a linha do produto e elimina corrida de estoque em compras simultâneas |
| **Máquina de estados do pedido** | fonte única em `pedidos.types.ts`, importada pelo servidor (que valida) e pela interface (que só exibe o possível) |
| **Fluxo como JSONB, não tabelas** | o editor lê e grava o grafo inteiro; normalizar criaria JOINs sem ganho |
| **Atendimento por polling** | funções serverless não mantêm WebSocket aberto; fingir o contrário quebraria em produção |
| **Exclusão protegida** | cliente com pedido e produto vendido são inativados, nunca apagados |
| **Modais em portal** | `position: fixed` deixa de referenciar a janela sob `backdrop-filter`; o portal ataca a causa |
| **Ícones em SVG** | cada sistema desenha emoji com peso próprio — uma fileira deles nunca alinha |

---

## Testes

```bash
npm test
```

52 testes cobrindo o que quebra silenciosamente:

| Arquivo | O que protege |
|---|---|
| `cpf.test.ts` | dígitos verificadores, sequências repetidas, tamanhos inválidos |
| `pedidos-transicoes.test.ts` | não voltar, não pular etapa, estados finais |
| `sessao.test.ts` | adulteração de payload, assinatura ausente, expiração |
| `motor-chatbot.test.ts` | encadeamento, contexto, aresta do menu, condição, ciclo infinito |
| `validacao-publicacao.test.ts` | as cinco regras que impedem publicar fluxo quebrado |
| `privilegios.test.ts` | matriz de capacidades e substituição por lista individual |
| `paginas.test.ts` | quem enxerga cada página — trava o bug de acesso descrito acima |

---

## Como rodar

```bash
npm install
cp .env.example .env       # ajuste as credenciais do PostgreSQL
createdb elo_commerce
npm run db:reset           # schema + dados fictícios + usuários + chatbot
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | aplicação em desenvolvimento |
| `npm run build` | build de produção |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:reset` | recria tudo (recusa banco remoto sem `--forcar`) |
| `npm run db:senha -- email senha` | redefine a senha de um usuário |
| `npm test` | suíte de testes |
| `npm run typecheck` | verificação de tipos |
