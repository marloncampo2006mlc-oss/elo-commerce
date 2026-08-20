import { consultarUm, executar } from '@/lib/db';
import type { PapelUsuario } from '@/lib/sessao';

export interface UsuarioCompleto {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  papel: PapelUsuario;
  ativo: boolean;
}

export const authRepository = {
  /** Busca por e-mail apenas entre usuários ativos. */
  buscarPorEmail(email: string): Promise<UsuarioCompleto | null> {
    return consultarUm<UsuarioCompleto>(
      `SELECT id, nome, email, senha_hash, papel, ativo
         FROM usuarios
        WHERE email = $1 AND ativo`,
      [email],
    );
  },

  registrarAcesso(id: string): Promise<number> {
    return executar('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [id]);
  },
};
