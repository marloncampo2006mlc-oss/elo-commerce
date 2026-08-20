import { redirect } from 'next/navigation';
import { consultarUm } from './db';
import { lerSessao, type PapelUsuario, type SessaoUsuario } from './sessao';
import { privilegiosEfetivos } from '@/modules/usuarios/usuarios.types';

export interface Acesso {
  sessao: SessaoUsuario;
  privilegios: string[];
  pode: (chave: string) => boolean;
}

/**
 * Carrega o acesso efetivo de quem está navegando.
 *
 * Lê do banco em vez de confiar no cookie: o token guarda o papel do
 * momento do login, então um privilégio revogado continuaria valendo até
 * a pessoa sair e entrar de novo.
 */
export async function carregarAcesso(): Promise<Acesso> {
  const sessao = await lerSessao();
  if (!sessao) redirect('/login');

  const usuario = await consultarUm<{
    papel: PapelUsuario; privilegios: string[] | null; ativo: boolean;
  }>('SELECT papel, privilegios, ativo FROM usuarios WHERE id = $1', [sessao.id]);

  // Conta apagada ou bloqueada durante a sessão: derruba na hora.
  if (!usuario || !usuario.ativo) redirect('/login');

  const privilegios = privilegiosEfetivos(usuario);

  return {
    sessao: { ...sessao, papel: usuario.papel },
    privilegios,
    pode: (chave) => privilegios.includes(chave),
  };
}

/**
 * Guarda de página: exige um privilégio antes de qualquer renderização.
 *
 * Quem não tem acesso nem chega a receber o HTML — diferente de esconder
 * com CSS, que ainda enviaria os dados para o navegador.
 */
export async function exigirAcesso(privilegio: string): Promise<Acesso> {
  const acesso = await carregarAcesso();
  if (!acesso.pode(privilegio)) redirect('/gestao/sem-acesso');
  return acesso;
}
