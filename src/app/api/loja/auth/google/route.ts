import { NextResponse, type NextRequest } from 'next/server';
import { gerarState, googleConfigurado, urlDeAutorizacao } from '@/modules/loja/google';

/** Passo 1: manda a pessoa ao Google com um state assinado. */
export function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;

  if (!googleConfigurado()) {
    const destino = new URL('/carrinho', origem);
    destino.searchParams.set('erro', 'google-indisponivel');
    return NextResponse.redirect(destino);
  }

  const state = gerarState();
  const resposta = NextResponse.redirect(urlDeAutorizacao(origem, state));

  // O state também vai em cookie: comparar os dois na volta é o que
  // impede alguém de completar o login numa conta que não é sua.
  resposta.cookies.set('elo_oauth_state', state, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 600,
  });

  return resposta;
}
