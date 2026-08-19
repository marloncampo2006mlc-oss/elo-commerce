import { lerSessao, type PapelUsuario, type SessaoUsuario } from './sessao';
import { NaoAutorizado, Proibido } from './erros';

/**
 * Guardas de autorização usados pelos handlers de `/api/gestao/*`.
 *
 * A verificação acontece no servidor, junto do acesso ao dado. Esconder
 * um botão no front é experiência de uso, não segurança — se alguém
 * chamar a API direto, é aqui que a requisição para.
 */

/** Exige qualquer sessão válida da equipe interna. */
export async function exigirSessao(): Promise<SessaoUsuario> {
  const sessao = await lerSessao();
  if (!sessao) throw NaoAutorizado();
  return sessao;
}

/**
 * Exige que o usuário tenha um dos papéis informados.
 *
 * Modelo intencionalmente simples nesta fase: papéis fixos. A estrutura
 * de permissões granulares (perfis customizáveis) entra numa fase
 * posterior sem alterar as chamadas — só a implementação deste arquivo.
 */
export async function exigirPapel(...papeis: PapelUsuario[]): Promise<SessaoUsuario> {
  const sessao = await exigirSessao();
  if (!papeis.includes(sessao.papel)) {
    throw Proibido(`Esta operação exige perfil: ${papeis.join(' ou ')}`);
  }
  return sessao;
}

/** Papéis que podem administrar o catálogo e os cadastros. */
export const PAPEIS_GESTAO: PapelUsuario[] = ['administrador', 'gerente'];
