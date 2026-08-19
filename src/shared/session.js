import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Sessão administrativa mínima, sem dependências externas.
 *
 * ATENÇÃO — isto é uma medida de contenção, não o modelo final.
 * Existe um único operador (senha em variável de ambiente) apenas para
 * fechar o risco imediato da API pública. Na Fase 1 da Elo Platform isto
 * é substituído por Supabase Auth + RBAC por permissão.
 *
 * O token é assinado por HMAC e carrega a própria expiração:
 *   admin.<timestamp>.<assinatura>
 * Sem estado no servidor — requisito para funcionar em serverless, onde
 * cada invocação é um processo diferente e memória não é compartilhada.
 */

export const COOKIE_SESSAO = 'elo_sessao';

const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

const assinar = (payload) =>
  createHmac('sha256', env.session.secret).update(payload).digest('base64url');

/** Comparação em tempo constante: não vaza informação pelo tempo de resposta. */
function iguaisEmTempoConstante(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function criarToken() {
  const payload = `admin.${Date.now() + DURACAO_MS}`;
  return `${payload}.${assinar(payload)}`;
}

export function tokenValido(token) {
  // Sem segredo configurado, nada é válido: falha fechada, nunca aberta.
  if (!env.session.configurado || typeof token !== 'string') return false;

  const partes = token.split('.');
  if (partes.length !== 3) return false;

  const [papel, expiraEm, assinatura] = partes;
  if (!iguaisEmTempoConstante(assinatura, assinar(`${papel}.${expiraEm}`))) return false;

  return Number(expiraEm) > Date.now();
}

export const senhaConfere = (informada) =>
  env.session.configurado && iguaisEmTempoConstante(informada, env.session.adminPassword);

/** Lê um cookie do cabeçalho bruto (evita dependência de cookie-parser). */
export function lerCookie(req, nome) {
  const cabecalho = req.headers?.cookie;
  if (!cabecalho) return null;

  for (const parte of cabecalho.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;
    if (parte.slice(0, separador).trim() === nome) {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    }
  }
  return null;
}

export function montarCookieSessao(token) {
  const atributos = [
    `${COOKIE_SESSAO}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',                       // inacessível a JavaScript: barra roubo por XSS
    'SameSite=Lax',                   // mitiga CSRF em navegação cross-site
    `Max-Age=${Math.floor(DURACAO_MS / 1000)}`,
  ];
  if (!env.isDev) atributos.push('Secure');   // só trafega em HTTPS
  return atributos.join('; ');
}

export function montarCookieExpirado() {
  const atributos = [`${COOKIE_SESSAO}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (!env.isDev) atributos.push('Secure');
  return atributos.join('; ');
}
