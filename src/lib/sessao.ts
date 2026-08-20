import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { COOKIE_SESSAO } from './constantes';

/**
 * Sessão assinada, guardada em cookie HttpOnly.
 *
 * Não há estado no servidor: o cookie carrega os dados e uma assinatura
 * HMAC. Isso é requisito em serverless, onde cada requisição pode cair
 * em um processo diferente, sem memória compartilhada.
 *
 * O cookie guarda apenas identificação e papel — nunca senha ou hash.
 */

export { COOKIE_SESSAO };
/**
 * Duas durações de sessão. "Lembrar de mim" não é enfeite: quando
 * marcado, o cookie e o próprio token passam a valer 30 dias em vez de
 * 8 horas. A validade vai assinada dentro do token, então esticar o
 * cookie no navegador não estende o acesso.
 */
const DURACAO_PADRAO_MS = 8 * 60 * 60 * 1000;        // 8 horas
const DURACAO_LEMBRAR_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export type PapelUsuario = 'administrador' | 'gerente' | 'supervisor' | 'atendente';

export interface SessaoUsuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
}

interface ConteudoToken extends SessaoUsuario {
  exp: number;
}

function segredo(): string {
  const valor = process.env.SESSION_SECRET;
  if (!valor) {
    // Falha fechada: sem segredo, nenhuma sessão é emitida ou aceita.
    throw new Error('SESSION_SECRET não configurado');
  }
  return valor;
}

const assinar = (payload: string): string =>
  createHmac('sha256', segredo()).update(payload).digest('base64url');

function assinaturasIguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // timingSafeEqual exige mesmo tamanho; comparar em tempo constante
  // evita vazar informação pelo tempo de resposta.
  if (bufferA.length === 0 || bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function gerarToken(usuario: SessaoUsuario, duracaoMs = DURACAO_PADRAO_MS): string {
  const conteudo: ConteudoToken = { ...usuario, exp: Date.now() + duracaoMs };
  const payload = Buffer.from(JSON.stringify(conteudo)).toString('base64url');
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string | undefined): SessaoUsuario | null {
  if (!token) return null;

  const separador = token.lastIndexOf('.');
  if (separador <= 0) return null;

  const payload = token.slice(0, separador);
  const assinatura = token.slice(separador + 1);

  try {
    if (!assinaturasIguais(assinatura, assinar(payload))) return null;

    const conteudo = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as ConteudoToken;

    if (typeof conteudo.exp !== 'number' || conteudo.exp <= Date.now()) return null;

    const { exp: _exp, ...usuario } = conteudo;
    return usuario;
  } catch {
    return null;   // token corrompido é tratado como ausência de sessão
  }
}

/** Lê a sessão da requisição atual. Devolve null se ausente ou inválida. */
export async function lerSessao(): Promise<SessaoUsuario | null> {
  const armazem = await cookies();
  return lerToken(armazem.get(COOKIE_SESSAO)?.value);
}

export async function criarSessao(usuario: SessaoUsuario, lembrar = false): Promise<void> {
  const duracao = lembrar ? DURACAO_LEMBRAR_MS : DURACAO_PADRAO_MS;
  const armazem = await cookies();

  armazem.set(COOKIE_SESSAO, gerarToken(usuario, duracao), {
    httpOnly: true,                                   // inacessível a JavaScript
    sameSite: 'lax',                                  // mitiga CSRF
    secure: process.env.NODE_ENV === 'production',    // só trafega em HTTPS
    path: '/',
    maxAge: Math.floor(duracao / 1000),
  });
}

export async function encerrarSessao(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(COOKIE_SESSAO);
}
