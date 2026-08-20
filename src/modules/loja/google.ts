import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { consultarUm, executar } from '@/lib/db';
import { ErroApp } from '@/lib/erros';
import type { SessaoCliente } from '@/lib/sessaoCliente';

/**
 * Login com Google (OAuth 2.0, fluxo de código de autorização).
 *
 * O fluxo tem três passos:
 *   1. mandamos a pessoa ao Google com um `state` assinado por nós
 *   2. o Google devolve um `code` para o nosso callback
 *   3. trocamos o `code` por um token e lemos os dados do perfil
 *
 * O `state` existe para impedir CSRF: sem ele, alguém poderia induzir a
 * vítima a completar um login numa conta que não é dela. Assinamos com
 * o mesmo segredo da sessão em vez de guardar em banco — não precisa de
 * estado no servidor, o que importa em ambiente serverless.
 */

const AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const PERFIL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const googleConfigurado = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function segredoState(): string {
  const base = process.env.SESSION_SECRET;
  if (!base) throw new Error('SESSION_SECRET não configurado');
  return `${base}::oauth`;
}

export function gerarState(): string {
  const valor = randomBytes(16).toString('base64url');
  const assinatura = createHmac('sha256', segredoState()).update(valor).digest('base64url');
  return `${valor}.${assinatura}`;
}

export function stateValido(state: string | null): boolean {
  if (!state) return false;
  const separador = state.lastIndexOf('.');
  if (separador <= 0) return false;

  const esperada = createHmac('sha256', segredoState())
    .update(state.slice(0, separador)).digest('base64url');

  const recebida = Buffer.from(state.slice(separador + 1));
  const calculada = Buffer.from(esperada);

  return recebida.length === calculada.length && timingSafeEqual(recebida, calculada);
}

export function urlDeAutorizacao(origem: string, state: string): string {
  const parametros = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: `${origem}/api/loja/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Sempre pedir a escolha da conta: em máquina compartilhada, entrar
    // silenciosamente na conta de outra pessoa é um problema real.
    prompt: 'select_account',
  });
  return `${AUTORIZACAO}?${parametros.toString()}`;
}

interface PerfilGoogle {
  id: string;
  email: string;
  name?: string;
  verified_email?: boolean;
}

async function buscarPerfil(codigo: string, origem: string): Promise<PerfilGoogle> {
  const resposta = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${origem}/api/loja/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!resposta.ok) throw new ErroApp('O Google recusou a autenticação', 401);

  const { access_token: token } = await resposta.json() as { access_token?: string };
  if (!token) throw new ErroApp('O Google não devolveu um token válido', 401);

  const perfilResposta = await fetch(PERFIL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!perfilResposta.ok) throw new ErroApp('Não foi possível ler seu perfil do Google', 401);

  return perfilResposta.json() as Promise<PerfilGoogle>;
}

interface ClienteExistente {
  id: string; nome: string; email: string; google_id: string | null; status: string;
}

/**
 * Entra ou cadastra a partir do perfil do Google.
 *
 * Se já existe conta com aquele e-mail, vinculamos em vez de criar uma
 * segunda — do contrário a pessoa teria dois cadastros e o histórico de
 * compras ficaria partido entre eles.
 */
export async function entrarComGoogle(codigo: string, origem: string): Promise<SessaoCliente> {
  const perfil = await buscarPerfil(codigo, origem);

  // E-mail não verificado permitiria assumir a conta de outra pessoa
  // apenas cadastrando o endereço dela num provedor qualquer.
  if (perfil.verified_email === false) {
    throw new ErroApp('Seu e-mail do Google não está verificado', 401);
  }

  const email = perfil.email.trim().toLowerCase();
  const nome = perfil.name?.trim() || email.split('@')[0]!;

  const existente = await consultarUm<ClienteExistente>(
    'SELECT id, nome, email, google_id, status FROM clientes WHERE google_id = $1 OR email = $2',
    [perfil.id, email]);

  if (existente) {
    if (existente.status === 'inativo') {
      throw new ErroApp('Esta conta está inativa. Fale com o suporte.', 401);
    }
    await executar(
      `UPDATE clientes
          SET google_id = $2,
              metodo_login = COALESCE(metodo_login, 'google'),
              ultimo_acesso = NOW()
        WHERE id = $1`,
      [existente.id, perfil.id]);

    return { id: existente.id, nome: existente.nome, email: existente.email };
  }

  // Cadastro novo: o CPF fica pendente e é pedido no primeiro checkout,
  // porque o Google não fornece esse dado.
  const criado = await consultarUm<{ id: string }>(
    `INSERT INTO clientes (nome, email, cpf, google_id, metodo_login, status, ultimo_acesso)
     VALUES ($1, $2, $3, $4, 'google', 'ativo', NOW())
     RETURNING id`,
    [nome, email, null, perfil.id]);

  if (!criado) throw new ErroApp('Não foi possível criar sua conta', 500);
  return { id: criado.id, nome, email };
}
