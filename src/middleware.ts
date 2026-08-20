import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO } from '@/lib/constantes';

/**
 * Middleware da borda. Faz duas coisas:
 *
 * 1. SEPARA AS PLATAFORMAS
 *    A variável ELO_APP define o que aquele deploy expõe:
 *      loja   → só a vitrine e o checkout
 *      gestao → só a área interna
 *      (vazio) → tudo junto, que é o modo de desenvolvimento
 *
 *    Assim o mesmo repositório sobe duas vezes na Vercel, cada uma com
 *    seu domínio, sem duplicar código — e sem que uma URL da gestão
 *    exista sequer no deploy da loja. As duas conversam pelo banco
 *    compartilhado e pelas rotas de /api/chat.
 *
 * 2. GUARDA A ÁREA INTERNA
 *    Só verifica a PRESENÇA do cookie. Validar a assinatura exige
 *    node:crypto, que não existe no Edge Runtime onde isto roda; a
 *    validação real acontece no layout e em cada handler de API.
 */

type Modo = 'loja' | 'gestao' | 'completo';

const modo: Modo = (() => {
  const valor = process.env.ELO_APP?.trim().toLowerCase();
  return valor === 'loja' || valor === 'gestao' ? valor : 'completo';
})();

/** Caminhos que pertencem exclusivamente à área interna. */
const daGestao = (caminho: string): boolean =>
  caminho.startsWith('/gestao') || caminho.startsWith('/api/gestao')
  || caminho.startsWith('/login') || caminho.startsWith('/api/auth');

/** Caminhos exclusivos da loja. O chat é compartilhado e fica de fora. */
const daLoja = (caminho: string): boolean =>
  caminho === '/' || caminho.startsWith('/carrinho') || caminho.startsWith('/api/loja');

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // ---- separação de plataformas ----
  if (modo === 'loja' && daGestao(pathname)) {
    // 404 em vez de redirecionar: no deploy da loja, a área interna
    // simplesmente não existe — e revelar que existe em outro endereço
    // seria informação desnecessária para o cliente final.
    return new NextResponse(null, { status: 404 });
  }

  if (modo === 'gestao' && daLoja(pathname)) {
    return NextResponse.redirect(new URL('/gestao', origin));
  }

  // ---- guarda da área interna ----
  if (pathname.startsWith('/gestao') && !request.cookies.has(COOKIE_SESSAO)) {
    const destino = new URL('/login', origin);
    destino.searchParams.set('proximo', pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  // Exclui estáticos e imagens: passar por eles só gastaria invocação.
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico).*)'],
};
