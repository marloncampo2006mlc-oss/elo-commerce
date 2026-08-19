import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Erro de aplicação com status HTTP semântico. */
export class ErroApp extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly detalhes: DetalheErro[] | null = null,
  ) {
    super(message);
    this.name = 'ErroApp';
  }
}

export interface DetalheErro {
  campo: string;
  mensagem: string;
}

export const NaoEncontrado = (recurso: string) => new ErroApp(`${recurso} não encontrado(a)`, 404);
export const Conflito = (mensagem: string) => new ErroApp(mensagem, 409);
export const NaoAutorizado = (mensagem = 'Faça login para continuar') => new ErroApp(mensagem, 401);
export const Proibido = (mensagem = 'Você não tem permissão para esta operação') =>
  new ErroApp(mensagem, 403);
export const NaoProcessavel = (mensagem: string, detalhes?: DetalheErro[]) =>
  new ErroApp(mensagem, 422, detalhes ?? null);

interface ErroPostgres {
  code?: string;
  detail?: string;
  constraint?: string;
  message?: string;
}

/** Traduz códigos do PostgreSQL em mensagens de negócio compreensíveis. */
function traduzirErroPostgres(erro: ErroPostgres): ErroApp | null {
  switch (erro.code) {
    case '23505': {
      // unique_violation — extrai o nome da coluna da mensagem do banco
      const campo = /Key \((.+?)\)=/.exec(erro.detail ?? '')?.[1] ?? 'registro';
      return new ErroApp(`Já existe um registro com esse ${campo}`, 409);
    }
    case '23503': // foreign_key_violation
      return new ErroApp('Operação bloqueada: existem registros vinculados a este item', 409);
    case '23514': // check_violation
      return new ErroApp(`Valor fora das regras da coluna (${erro.constraint ?? '—'})`, 422);
    case '22P02': // invalid_text_representation
      return new ErroApp('Identificador ou valor em formato inválido', 400);
    default:
      if (erro.message?.startsWith('ESTOQUE_INSUFICIENTE')) {
        return new ErroApp('Estoque insuficiente para um dos produtos do pedido', 409);
      }
      return null;
  }
}

/**
 * Converte qualquer erro em resposta HTTP. É o único lugar do projeto que
 * decide status code — nenhum service precisa conhecer HTTP.
 */
export function responderErro(erro: unknown): NextResponse {
  if (erro instanceof ZodError) {
    const detalhes = erro.issues.map((problema) => ({
      campo: problema.path.join('.') || '(raiz)',
      mensagem: problema.message,
    }));
    return NextResponse.json({ erro: 'Dados inválidos', detalhes }, { status: 422 });
  }

  const conhecido =
    erro instanceof ErroApp ? erro : traduzirErroPostgres(erro as ErroPostgres);

  if (conhecido) {
    return NextResponse.json(
      { erro: conhecido.message, detalhes: conhecido.detalhes ?? undefined },
      { status: conhecido.status },
    );
  }

  console.error('[erro não tratado]', erro);
  return NextResponse.json({ erro: 'Erro interno no servidor' }, { status: 500 });
}

/** Envolve um handler de rota, centralizando o tratamento de erro. */
export function comTratamentoDeErro<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (erro) {
      return responderErro(erro);
    }
  };
}
