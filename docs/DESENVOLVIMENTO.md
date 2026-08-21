# Desenvolvimento

Como rodar a Elo Platform na sua máquina.

> Para **usar** a plataforma não é preciso nada disso: ela está publicada e os endereços estão no [README](../README.md). Este documento é para quem vai mexer no código.

---

## Pré-requisitos

- Node.js 20 ou superior
- PostgreSQL 14 ou superior

## Primeira execução

```bash
npm install
cp .env.example .env    # ajuste as credenciais do seu PostgreSQL
createdb elo_commerce
npm run db:reset        # schema + dados fictícios + usuários + chatbot inicial
npm run dev
```

O `db:reset` imprime as senhas dos usuários de demonstração **uma única vez**, no terminal. Elas são geradas aleatoriamente a cada execução — não existe senha fixa versionada no repositório. Se perder, use `npm run db:senha`.

## Variáveis de ambiente

O `.env.example` documenta todas. As que importam para subir o projeto:

| Variável | Para quê |
|---|---|
| `PGHOST` · `PGPORT` · `PGUSER` · `PGPASSWORD` · `PGDATABASE` | conexão com o PostgreSQL local |
| `DATABASE_URL` | conexão única; quando existe, tem prioridade sobre as `PG*` acima — é o formato usado em produção |
| `SESSION_SECRET` | assina o cookie de sessão. Qualquer string longa e aleatória |
| `ADMIN_PASSWORD` | senha do administrador criado no primeiro deploy |
| `ELO_APP` | `loja`, `gestao` ou vazio. Vazio expõe tudo, que é o modo de desenvolvimento |

As credenciais do Pix são **opcionais**: sem elas o checkout gera um código de demonstração, com formato válido e chave de exemplo, sem transferir valor nenhum.

## Login com Google

O botão "Entrar com Google" aparece **desligado**, com o aviso *indisponível nesta instalação*, enquanto o servidor não tiver as credenciais OAuth. Não é falha: sem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, não existe aplicação registrada para o Google autorizar. O login por e-mail e senha funciona normalmente nesse estado.

Para ligar:

1. Em [console.cloud.google.com](https://console.cloud.google.com) → **APIs e Serviços** → **Tela de permissão OAuth**, configure a tela como *Externo* e publique.
2. Em **Credenciais** → **Criar credenciais** → **ID do cliente OAuth** → tipo *Aplicativo da Web*.
3. Em **URIs de redirecionamento autorizados**, cadastre um endereço para cada ambiente onde a loja roda. O caminho é sempre o mesmo, só o domínio muda:

   ```
   http://localhost:3000/api/loja/auth/google/callback
   https://SEU-DOMINIO.vercel.app/api/loja/auth/google/callback
   ```

   O Google recusa o login se o endereço não bater **exatamente** — barra final, `http` contra `https` e porta contam.

4. Copie o ID e a chave secreta para as variáveis de ambiente:

   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

   Na sua máquina, no `.env`. Em produção, em **Settings → Environment Variables** do projeto na Vercel — e refaça o deploy, porque a variável só entra no build seguinte.

O segredo nunca vai para o repositório: quem o guarda é o ambiente. O `state` do fluxo OAuth é assinado com o `SESSION_SECRET`, então esse também precisa estar definido para o login social funcionar.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | sobe a aplicação em desenvolvimento |
| `npm run build` | build de produção |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:reset` | recria tudo do zero (recusa rodar contra banco remoto) |
| `npm run db:seed` | popula o catálogo e os pedidos fictícios |
| `npm run db:usuarios` | recria a equipe interna com senhas novas |
| `npm run db:bot` | cria e publica o chatbot inicial |
| `npm run db:senha -- email senha` | redefine a senha de um usuário |
| `npm test` | roda a suíte de testes |
| `npm run typecheck` | verificação de tipos |

## Publicação

O deploy roda na Vercel. O `vercel-build` aplica as migrations, prepara o ambiente de forma idempotente (cria o administrador e publica o chatbot inicial se ainda não existirem) e só então faz o build do Next.

`ELO_APP` permite subir o **mesmo repositório duas vezes**, cada deploy expondo uma parte:

| Valor | O deploy expõe |
|---|---|
| `loja` | só a vitrine e o checkout; qualquer URL da área interna responde 404 |
| `gestao` | só a área interna; as rotas da loja redirecionam para `/gestao` |
| *(vazio)* | tudo junto — modo de desenvolvimento e o modo do deploy atual |

Os dois deploys conversam pelo banco compartilhado e pelas rotas de `/api/chat`.

## Testes

```bash
npm test
```

A suíte não tenta cobrir tela: cobre o que quebra em silêncio — dígito verificador de CPF, transições da máquina de estados do pedido, integridade do token de sessão, o motor do chatbot (menu, condição, contexto, ciclo infinito) e as regras que impedem publicar um fluxo quebrado.

## Onde encontrar cada coisa

A organização das pastas e o porquê de cada decisão estão em [Arquitetura](ARQUITETURA.md).
