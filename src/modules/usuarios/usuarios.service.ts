import { usuariosRepository } from './usuarios.repository';
import { authService } from '@/modules/auth/auth.service';
import { Conflito, NaoEncontrado } from '@/lib/erros';
import type { PapelUsuario } from '@/lib/sessao';
import type { Usuario } from './usuarios.types';
import type { EntradaUsuario } from './usuarios.schema';

export const usuariosService = {
  listar: () => usuariosRepository.listar(),

  async obter(id: string): Promise<Usuario> {
    const usuario = await usuariosRepository.buscarPorId(id);
    if (!usuario) throw NaoEncontrado('Usuário');
    return usuario;
  },

  async criar(dados: EntradaUsuario): Promise<Usuario> {
    if (await usuariosRepository.emailJaUsado(dados.email)) {
      throw Conflito('Já existe um usuário com esse e-mail');
    }

    return usuariosRepository.criar({
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel,
      senhaHash: await authService.gerarHash(dados.senha),
      privilegios: dados.privilegios ?? null,
    });
  },

  /**
   * Duas travas impedem que a plataforma fique sem dono:
   * ninguém rebaixa ou bloqueia o último administrador ativo, e ninguém
   * altera o próprio perfil ou se autobloqueia.
   */
  async atualizar(id: string, dados: {
    nome?: string; email?: string; papel?: PapelUsuario; ativo?: boolean;
    privilegios?: string[] | null;
  }, idDeQuemEdita: string): Promise<Usuario> {
    const alvo = await usuariosService.obter(id);

    if (dados.email && dados.email !== alvo.email) {
      const emUso = await usuariosRepository.emailJaUsado(dados.email);
      if (emUso && emUso.id !== id) throw Conflito('Já existe um usuário com esse e-mail');
    }

    // Editar o próprio nome ou e-mail é permitido; mexer no próprio
    // ACESSO não — é o que evita alguém se trancar para fora.
    const mudaProprioAcesso =
      id === idDeQuemEdita
      && ((dados.papel !== undefined && dados.papel !== alvo.papel)
        || dados.ativo === false
        || dados.privilegios !== undefined);

    if (mudaProprioAcesso) {
      throw Conflito('Você não pode alterar o próprio acesso nem se bloquear.');
    }

    const perderiaAdmin =
      alvo.papel === 'administrador' && alvo.ativo
      && ((dados.papel !== undefined && dados.papel !== 'administrador') || dados.ativo === false);

    if (perderiaAdmin && (await usuariosRepository.administradoresAtivos()) <= 1) {
      throw Conflito(
        'Este é o último administrador ativo. Promova outra pessoa antes de alterar este acesso.');
    }

    const atualizado = await usuariosRepository.atualizar(id, dados);
    if (!atualizado) throw NaoEncontrado('Usuário');
    return atualizado;
  },

  async definirSenha(id: string, senha: string): Promise<void> {
    await usuariosService.obter(id);
    await usuariosRepository.trocarSenha(id, await authService.gerarHash(senha));
  },
};
