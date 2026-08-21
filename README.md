# ◆ Elo Platform

Plataforma que reúne **loja**, **gestão**, **construtor de chatbot no-code**, **atendimento humano** e **BI** — com o fluxo criado no no-code alimentando de verdade o assistente da loja.

Construída sobre Next.js, TypeScript e PostgreSQL, sem ORM: todo SQL é escrito à mão e as regras críticas de integridade vivem no próprio banco.

---

## ▶ Acesse a plataforma no ar

Tudo abaixo está publicado e funcionando. Não é protótipo nem vídeo — é o sistema rodando com banco de verdade.

| Ambiente | Endereço | Quem entra |
|---|---|---|
| **Loja** | **https://elo-commerce-xi.vercel.app** | aberta, não precisa de conta |
| **Gestão** | **https://elo-commerce-xi.vercel.app/login** | use as credenciais abaixo |

### Credenciais da área de gestão

| Campo | Valor |
|---|---|
| E-mail | `admin@elo.dev` |
| Senha | `elo-Kd8E6qm0KXh8JY` |

> Conta de demonstração, com acesso de administrador, criada para quem está avaliando o projeto.
> O banco tem dados fictícios e pode ser reiniciado a qualquer momento — fique à vontade para criar, alterar e testar.

**Se a primeira visita demorar alguns segundos:** o PostgreSQL hiberna quando fica ocioso. Recarregue uma vez e ele responde normal.

---

## ▶ Roteiro de 5 minutos

O caminho que mostra o que o projeto realmente faz — cada passo prova uma coisa diferente.

| # | Onde | O que fazer | O que isso prova |
|---|---|---|---|
| 1 | Loja | busque um produto e **finalize uma compra** | é venda de verdade: pedido, itens e baixa de estoque na mesma transação |
| 2 | Gestão → **Pedidos** | encontre o pedido que você acabou de fazer | o estoque já baixou; nada foi simulado |
| 3 | Gestão → **Pedidos** | avance o status do pedido | máquina de estados: só as transições válidas aparecem, e cancelar devolve o estoque |
| 4 | Gestão → **No-Code** | abra o fluxo e mude o texto de uma mensagem → **Salvar** → **Publicar** | o fluxo é dado (JSONB), não código |
| 5 | Loja | abra o chat no canto da tela | **a mensagem que você escreveu está lá** — o no-code alimenta o bot real |
| 6 | Chat da loja | peça *"falar com um atendente"* | a conversa sai do bot e entra na fila humana |
| 7 | Gestão → **Atendimento** | assuma a conversa e responda | transferência bot → humano, com o histórico junto |
| 8 | Gestão → **BI** | troque o período do filtro | os números saem de views SQL, incluindo a taxa de resolução do bot |

### O detalhe que vale olhar

Na tela de **Usuários**, crie alguém com o perfil *atendente* e entre com essa conta. Depois digite `/gestao/bi` direto na barra de endereço.

O acesso é negado no **servidor** — a página nem chega a ser montada. Não é o menu que some: a guarda está junto do dado, porque esconder botão não é proteção.

---

## Documentação

| Documento | Para quê |
|---|---|
| [Arquitetura](docs/ARQUITETURA.md) | como o projeto está organizado e por que cada decisão foi tomada |
| [Guia de apresentação](docs/APRESENTACAO.md) | roteiro de demo, defesa do código e perguntas prováveis |
| [Desenvolvimento](docs/DESENVOLVIMENTO.md) | como rodar o projeto na sua máquina e o que cada script faz |

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

## A área de gestão, tela por tela

É a parte que não aparece para o cliente final — e onde está a maior parte das regras.

| Tela | O que você encontra | O que sustenta a tela |
|---|---|---|
| **Painel** | resumo do dia: vendas, pedidos abertos, fila de atendimento | consultas agregadas direto no banco, sem cálculo no navegador |
| **Produtos** | cadastro, preço, estoque e imagem | produto já vendido é **inativado**, nunca apagado — o histórico do pedido não pode perder a referência |
| **Pedidos** | lista, detalhe com itens e avanço de status | máquina de estados com fonte única: o servidor valida e a interface só oferece o que é possível |
| **Clientes** | base de clientes e histórico de compras | cliente com pedido também é inativado, não excluído |
| **No-Code** | editor visual: arrasta blocos, conecta, versiona, testa e publica | o fluxo é um grafo `{ nodes, edges }` em JSONB; a publicação é **recusada** se houver bloco sem saída ou opção desconectada |
| **Atendimento** | fila de conversas, assumir, responder, finalizar | a conversa guarda a versão do bot em que começou — publicar uma v2 não reescreve o que já estava em andamento |
| **BI** | vendas, pedidos, clientes e atendimento com filtro de período | views SQL; a taxa de resolução do bot sai da própria base de conversas |
| **Usuários** | cadastrar pessoas, definir perfil e conceder privilégios avulsos | quatro perfis, 12 privilégios; dá para fugir do pacote e liberar privilégio a privilégio |

**Quem enxerga o quê:** cada página declara o privilégio que exige, num mapa único que o menu, a guarda da página e o redirecionamento pós-login consultam. Perfil sem `bi.ver` não abre o BI nem digitando a URL.

| Perfil | Alcance |
|---|---|
| `administrador` | tudo, incluindo gestão de pessoas |
| `gerente` | opera loja e chatbots, não gerencia pessoas |
| `supervisor` | acompanha indicadores e atende, sem alterar o catálogo |
| `atendente` | atende a fila e monta fluxos; não vê faturamento nem cadastros |

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
| Publicação | Vercel (serverless) + PostgreSQL gerenciado |

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

## Segurança

- Autorização verificada **no servidor**, junto do acesso ao dado — esconder botão não é proteção.
- `401` para quem não tem sessão, `403` para quem tem sessão mas não tem o papel.
- Senhas com bcrypt; o hash é comparado mesmo quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados.
- Cookie `HttpOnly` + `SameSite` + `Secure` em produção, assinado por HMAC.
- Todo SQL parametrizado; nenhuma concatenação de entrada do usuário.
- O comando de reset do banco recusa executar contra banco remoto ou `NODE_ENV=production`.
- Nenhum segredo no repositório: senhas de demonstração são geradas na hora e as chaves de produção vivem só nas variáveis de ambiente.

## Testes

Cobrem o que quebra silenciosamente: validação de CPF por dígito verificador, transições válidas do pedido, integridade do token de sessão (adulteração e expiração), execução do motor do chatbot (menu, condição, contexto, ciclo infinito) e as regras que impedem publicar um fluxo quebrado.

Como rodar a suíte está em [Desenvolvimento](docs/DESENVOLVIMENTO.md).

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
