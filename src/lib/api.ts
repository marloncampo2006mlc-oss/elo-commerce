import { NextResponse } from 'next/server';

/** Resposta padronizada de sucesso: todo payload vem sob `data`. */
export const ok = <T>(data: T, status = 200): NextResponse =>
  NextResponse.json({ data }, { status });

/** 204 No Content: resposta sem corpo, usada após exclusões. */
export const semConteudo = (): NextResponse => new NextResponse(null, { status: 204 });

/** Converte os query params da URL em objeto simples para o Zod validar. */
export const parametrosDaUrl = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams);
