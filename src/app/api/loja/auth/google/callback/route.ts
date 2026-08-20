import { NextResponse, type NextRequest } from 'next/server';
import { entrarComGoogle, stateValido } from '@/modules/loja/google';
import { gerarTokenCliente } from '@/lib/sessaoCliente';
import { COOKIE_CLIENTE } from '@/lib/constantes';

/** Passo 2: valida o state, troca o código e abre a sessão. */
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const codigo = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get('elo_oauth_state')?.value;

  const falhar = (motivo: string) => {
    const destino = new URL('/carrinho', origem);
    destino.searchParams.set('erro', motivo);
    return NextResponse.redirect(destino);
  };

  // Os dois precisam existir E coincidir: só a assinatura não basta,
  // porque um state válido roubado de outra sessão passaria.
  if (!state || !stateCookie || state !== stateCookie || !stateValido(state)) {
    return falhar('state-invalido');
  }
  if (!codigo) return falhar('login-cancelado');

  try {
    const cliente = await entrarComGoogle(codigo, origem);
    const resposta = NextResponse.redirect(new URL('/carrinho', origem));

    resposta.cookies.set(COOKIE_CLIENTE, gerarTokenCliente(cliente), {
      httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/', maxAge: 30 * 24 * 60 * 60,
    });
    resposta.cookies.delete('elo_oauth_state');

    return resposta;
  } catch {
    return falhar('google-falhou');
  }
}
