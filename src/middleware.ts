import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO } from '@/lib/constantes';

/**
 * Guarda de borda para a área de gestão.
 *
 * Aqui só verificamos a PRESENÇA do cookie. Validar a assinatura exige
 * node:crypto, que NÃO existe no Edge Runtime onde o middleware roda —
 * importar lib/sessao aqui quebra a aplicação inteira.
 *
 * A validação real acontece no layout do servidor e em cada handler de
 * API. Esta camada só evita carregar páginas internas à toa.
 */
export function middleware(request: NextRequest) {
  const temCookie = request.cookies.has(COOKIE_SESSAO);

  if (!temCookie) {
    const destino = new URL('/login', request.url);
    destino.searchParams.set('proximo', request.nextUrl.pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/gestao/:path*'] };
