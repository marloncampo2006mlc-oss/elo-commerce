import { lerSessao, type PapelUsuario, type SessaoUsuario } from './sessao';
import { NaoAutorizado, Proibido } from './erros';
import { consultarUm } from './db';
import { privilegiosEfetivos, PRIVILEGIOS } from '@/modules/usuarios/usuarios.types';

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
 * Exige um privilégio específico.
 *
 * Consulta o banco em vez de confiar no cookie: o token carrega o papel
 * do momento do login, então revogar um acesso só teria efeito no login
 * seguinte. Uma leitura por chave primária é barata perto do risco de
 * manter alguém com permissão que já foi retirada.
 */
export async function exigirPrivilegio(chave: string): Promise<SessaoUsuario> {
  const sessao = await exigirSessao();

  const usuario = await consultarUm<{
    papel: PapelUsuario; privilegios: string[] | null; ativo: boolean;
  }>('SELECT papel, privilegios, ativo FROM usuarios WHERE id = $1', [sessao.id]);

  if (!usuario || !usuario.ativo) {
    throw NaoAutorizado('Sua conta foi desativada. Fale com um administrador.');
  }

  if (!privilegiosEfetivos(usuario).includes(chave)) {
    const rotulo = PRIVILEGIOS.find((privilegio) => privilegio.chave === chave)?.rotulo ?? chave;
    throw Proibido(`Seu perfil não permite: ${rotulo}`);
  }

  // A sessão devolvida reflete o papel atual do banco, não o do cookie.
  return { ...sessao, papel: usuario.papel };
}

/**
 * Mantido para os pontos que dependem do papel em si, e não de uma
 * capacidade — como impedir que alguém altere o próprio acesso.
 */
export async function exigirPapel(...papeis: PapelUsuario[]): Promise<SessaoUsuario> {
  const sessao = await exigirSessao();

  const usuario = await consultarUm<{ papel: PapelUsuario; ativo: boolean }>(
    'SELECT papel, ativo FROM usuarios WHERE id = $1', [sessao.id]);

  if (!usuario || !usuario.ativo) {
    throw NaoAutorizado('Sua conta foi desativada. Fale com um administrador.');
  }
  if (!papeis.includes(usuario.papel)) {
    throw Proibido(`Esta operação exige perfil: ${papeis.join(' ou ')}`);
  }

  return { ...sessao, papel: usuario.papel };
}

export const PAPEIS_GESTAO: PapelUsuario[] = ['administrador', 'gerente'];
