# Guia de apresentação — Elo Platform

Como apresentar o projeto e defender o código numa entrevista técnica.

---

## 1. O pitch de 60 segundos

Decore a estrutura, não as palavras.

> "É uma plataforma que junta cinco frentes: **loja**, **gestão**, um **construtor de chatbot no-code**, **atendimento humano** e **BI**.
>
> O que amarra tudo é um fluxo só: eu monto o chatbot arrastando blocos, publico, e **aquele fluxo passa a ser o assistente da loja de verdade** — não é mockup. Se o bot não resolve, ele transfere a conversa para uma fila de atendimento humano, e tudo isso vira indicador no BI.
>
> Fiz em **Next.js com TypeScript e PostgreSQL, sem ORM** — escrevi o SQL na mão porque queria entender transação e índice, não só a abstração.
>
> A parte que eu mais gosto: as regras críticas não estão só no código. O total do pedido é recalculado por *trigger* no banco, e a baixa de estoque é uma função que lança exceção e cancela a transação inteira. Mesmo que outro sistema escreva direto na tabela, o dado não fica inconsistente."

**Por que essa ordem funciona:** abre pelo produto, passa pela stack (a próxima pergunta deles) e fecha com profundidade técnica.

---

## 2. Roteiro de demonstração

Oito passos. Cada um prova algo diferente — não é passeio pelo menu.

| # | O que fazer | O que dizer |
|---|---|---|
| 1 | Abrir a **loja** | "Vitrine com busca e filtros. O front é Next com Server Components — a consulta roda no servidor." |
| 2 | **Comprar** um produto | Compre de verdade. Prova que é sistema, não tela. |
| 3 | **Gestão → Pedidos** | "O pedido caiu aqui e o estoque já baixou. Pedido, itens e baixa acontecem na mesma transação: se faltar estoque no meio, nada é gravado." |
| 4 | **Avançar** o status | "Máquina de estados: pago só vai para enviado. Cancelar devolve o estoque." |
| 5 | **No-Code** → abrir o fluxo | O ponto alto. "O fluxo é dado, não código: um grafo salvo em JSONB. Nove tipos de bloco." |
| 6 | Mudar um texto → **Salvar → Publicar** | Volte à loja e abra o chat: **a mensagem mudou**. É o momento que prova a integração. |
| 7 | No chat, pedir **"falar com um atendente"** | Vá em **Atendimento**: a conversa está na fila. Assuma e responda. |
| 8 | **BI** → trocar o período | "Os números vêm de views SQL. Aqui está a taxa de resolução do bot." |

### O passo bônus que impressiona

Entre como **atendente** (`atendente@elo.dev`) e tente abrir `/gestao/bi` digitando na barra de endereço.

> "Repare que não é só o menu que some. A guarda está na página, no servidor — ele nem recebe o HTML. Se a proteção fosse só esconder o botão, essa URL teria funcionado."

---

## 3. Defesa do código

Onde abrir o editor quando pedirem "me mostra o código".

### `chatbot/motor.ts` — o coração

```
executarTurno() → carrega o nó atual → executa → resolve a aresta
                → encadeia automáticos → para no que espera resposta
```

**O que dizer:**
- "Cada tipo de bloco é um executor isolado. Adicionar um bloco novo é criar um arquivo — o motor não muda."
- "As consultas ao banco chegam **injetadas**, por isso consigo testar o motor sem nenhuma infraestrutura."
- "Tem um **limite de saltos por turno**. Se alguém desenhar um ciclo A→B→A no editor, o servidor não trava."

### `modules/pedidos/pedidos.repository.ts` — a venda

```sql
SELECT id, preco, ativo FROM produtos WHERE id = $1 FOR UPDATE
SELECT baixar_estoque($1, $2)
```

**O que dizer:**
- "`FOR UPDATE` trava a linha do produto até o fim da transação. Sem isso, dois clientes comprando o último item ao mesmo tempo passariam os dois."
- "A baixa é uma função no banco que lança exceção. Se faltar saldo, a transação inteira aborta — não fica pedido sem estoque nem estoque sem pedido."

### `lib/autorizacao.ts` — a segurança

**O que dizer:**
- "Verifico **capacidade**, não cargo. O usuário tem um papel, que é um pacote padrão, mas dá para conceder privilégio a privilégio."
- "Consulto o **banco**, não o cookie. O token carrega o papel do momento do login — se eu revogasse um acesso, só valeria no próximo login. Assim vale na hora."

### `db/sql/001_schema.sql` — o banco

**O que dizer:**
- "O total do pedido é recalculado por trigger. A regra que não pode divergir eu coloco onde o dado mora."
- "Enums em vez de VARCHAR: estado impossível não entra."

---

## 4. Principais dificuldades:

"Qual foi sua maior dificuldade?" é onde a maioria trava ou inventa. Escolha **duas** e conte bem.

### O site funcionava local e quebrava em produção
- **Sintoma:** front carregava, toda chamada de API dava 500 — só na Vercel.
- **Causa:** o log mostrava `ENOTFOUND`. O host do Supabase resolvia só em IPv6, e a Vercel não tem saída IPv6.
- **Solução:** connection string do *pooler regional*, que tem IPv4 e é o caminho para serverless.
- **Aprendi:** "funciona na minha máquina" esconde diferenças de rede — e log é a primeira parada, não a última.

### Minha API estava aberta para a internet
- **Sintoma:** qualquer pessoa com o link podia apagar clientes. Só existia validação, nenhuma autenticação.
- **Causa:** construí pensando que só eu usaria a tela. Mas a API é a porta, não a tela.
- **Solução:** sessão assinada em cookie HttpOnly, protegendo escrita e mantendo público o que o cliente precisa.
- **Aprendi:** esconder botão não é segurança. Se a checagem não está no servidor, ela não existe.

### A proteção não cobria as páginas
- **Sintoma:** um atendente abria o BI e via o faturamento.
- **Causa:** eu protegi as rotas de API, mas as páginas são Server Components que chamam os serviços **direto**, sem passar pela API.
- **Solução:** guarda na própria página + mapa único página→privilégio, consumido pela guarda, pelo menu e pelo redirecionamento.
- **Aprendi:** proteger "a camada" não basta se existe caminho que não passa por ela.

### Mensagens saíam fora de ordem
- **Sintoma:** a conversa aparecia embaralhada dentro do mesmo turno.
- **Causa:** `NOW()` no PostgreSQL devolve o horário de **início da transação**. Como um turno grava várias mensagens juntas, todas ficavam com timestamp idêntico e o desempate caía no UUID, que é aleatório.
- **Solução:** `clock_timestamp()` + coluna sequencial.
- **Aprendi:** função de tempo em banco tem semântica própria; supor que é "agora" dá errado.

### O modal aparecia cortado no topo
- **Causa:** `position: fixed` deixa de referenciar a janela quando um ancestral tem `backdrop-filter` — esse ancestral vira o bloco de contenção.
- **Solução:** renderizar em portal, direto no `body`.
- **Aprendi:** compensar com z-index deixaria a armadilha esperando o próximo modal.

---

## 5. Perguntas prováveis

**Por que não usou ORM?**
Escolha de aprendizado: queria entender índice, transação e plano de execução. Em equipe com prazo, um ORM faz sentido — é decisão de contexto. E paguei o custo: toda query parametrizada, sem concatenação.

**O chatbot usa IA?**
Não, e é proposital. É um motor de fluxo determinístico: um grafo com nós e arestas. Para atendimento isso é vantagem — o caminho é auditável e sempre o mesmo. É a base natural para plugar um modelo de linguagem depois, só na etapa de entender a frase.

**O que acontece se falhar no meio de um pedido?**
Nada é gravado. Pedido, itens e baixa rodam na mesma transação; qualquer exceção dispara `ROLLBACK`. Metade da operação seria pior que nenhuma.

**Como você faria isso escalar?**
O gargalo hoje é conexão de banco — cada função serverless abre a sua, por isso o pooler. Depois: cache nas consultas do BI, índice revisado pelos filtros mais usados, e paginação por cursor no lugar de `OFFSET`, que fica caro em tabela grande.

**Por que polling no atendimento e não WebSocket?**
Funções serverless não mantêm conexão aberta. Um WebSocket funcionaria no meu Mac e quebraria em produção. Polling de 5s é a solução honesta para esse ambiente — se fosse para escala real, usaria um serviço de realtime dedicado.

**O que você faria diferente?**
Duas coisas. **Teria escrito teste desde o começo** — deixei para depois e custou retrabalho. E **teria colocado autenticação antes de publicar**: subi uma API aberta e só percebi revisando.

**Você fez sozinho? Usou IA?**
Responda com naturalidade: **usei IA como ferramenta, e sei explicar cada decisão.** Em 2026 ninguém se impressiona com quem não usa; impressionam-se com quem usa e entende o resultado. O que diferencia é conseguir dizer *por que* existe um `FOR UPDATE` ali e o que aconteceria sem ele. Ser evasivo é o pior caminho — duas perguntas de acompanhamento derrubam.

---

## 6. Números do projeto

| Métrica | Valor |
|---|---|
| Linhas de TypeScript | ~9.300 |
| Arquivos | 135 |
| Migrations versionadas | 8 |
| Testes automatizados | 52 |
| Tipos de bloco no No-Code | 9 |
| Privilégios no controle de acesso | 12 |
| Commits | 28 |

---

## 7. Checklist da véspera

**Os endereços:**

| | |
|---|---|
| Loja | https://elo-commerce-xi.vercel.app |
| Gestão | https://elo-commerce-xi.vercel.app/login |


- [ ] Abrir o site uma vez, para acordar o banco do Supabase
- [ ] Testar login e deixar a aba já autenticada
- [ ] Conferir se há produto com estoque para a demo de compra
- [ ] Abrir o repositório no GitHub numa segunda aba
- [ ] Deixar `chatbot/motor.ts` aberto no editor — é o trecho que vão querer ver
- [ ] Reler as duas dificuldades que você escolheu contar
- [ ] Levar o link escrito num papel, caso o Wi-Fi falhe

**Se a internet cair:** o projeto roda local. `npm run dev` com o PostgreSQL da máquina. Ter esse plano B na ponta da língua já é uma boa resposta sobre ambiente de desenvolvimento.

---

## 8. As três frases que mais valem

Mais do que qualquer detalhe técnico:

> **"Esse dado vem do banco."**
> **"Essa regra está no servidor."**
> **"Aqui eu errei, e foi assim que corrigi."**

Nenhuma delas exige decorar código.
