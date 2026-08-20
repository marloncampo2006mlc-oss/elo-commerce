import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { COOKIE_CLIENTE } from './constantes';

/**
 * Sessão do cliente da loja.
 *
 * Cookie SEPARADO do da equipe interna, e não um campo `tipo` dentro do
 * mesmo token. A separação é proposital: se fosse um cookie só, um erro
 * de leitura poderia fazer uma sessão de cliente ser interpretada como
 * de equipe. Com dois cookies distintos, isso é impossível por
 * construção — a área de gestão simplesmente não lê este.
 */

const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export interface SessaoCliente {
  id: string;
  nome: string;
  email: string;
}

interface ConteudoToken extends SessaoCliente {
  exp: number;
}

function segredo(): string {
  const valor = process.env.SESSION_SECRET;
  if (!valor) throw new Error('SESSION_SECRET não configurado');
  // Deriva um segredo próprio: assim um token de cliente nunca valida
  // como token de equipe, mesmo que os formatos coincidissem.
  return `${valor}::cliente`;
}

const assinar = (payload: string): string =>
  createHmac('sha256', segredo()).update(payload).digest('base64url');

function assinaturasIguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length === 0 || bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function gerarTokenCliente(cliente: SessaoCliente): string {
  const conteudo: ConteudoToken = { ...cliente, exp: Date.now() + DURACAO_MS };
  const payload = Buffer.from(JSON.stringify(conteudo)).toString('base64url');
  return `${payload}.${assinar(payload)}`;
}

export function lerTokenCliente(token: string | undefined): SessaoCliente | null {
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

    const { exp: _exp, ...cliente } = conteudo;
    return cliente;
  } catch {
    return null;
  }
}

export async function lerSessaoCliente(): Promise<SessaoCliente | null> {
  const armazem = await cookies();
  return lerTokenCliente(armazem.get(COOKIE_CLIENTE)?.value);
}

export async function criarSessaoCliente(cliente: SessaoCliente): Promise<void> {
  const armazem = await cookies();
  armazem.set(COOKIE_CLIENTE, gerarTokenCliente(cliente), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(DURACAO_MS / 1000),
  });
}

export async function encerrarSessaoCliente(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(COOKIE_CLIENTE);
}
