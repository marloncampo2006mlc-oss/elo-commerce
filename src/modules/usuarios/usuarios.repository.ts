import { consultar, consultarUm, executar } from '@/lib/db';
import type { PapelUsuario } from '@/lib/sessao';
import type { Usuario } from './usuarios.types';

const CAMPOS = 'id, nome, email, papel, ativo, ultimo_acesso, created_at';

export const usuariosRepository = {
  listar(): Promise<Usuario[]> {
    return consultar<Usuario>(
      `SELECT ${CAMPOS} FROM usuarios
        ORDER BY ativo DESC,
                 CASE papel
                      WHEN 'administrador' THEN 1 WHEN 'gerente' THEN 2
                      WHEN 'supervisor' THEN 3 ELSE 4 END,
                 nome`,
    );
  },

  buscarPorId(id: string): Promise<Usuario | null> {
    return consultarUm<Usuario>(`SELECT ${CAMPOS} FROM usuarios WHERE id = $1`, [id]);
  },

  emailJaUsado(email: string): Promise<{ id: string } | null> {
    return consultarUm<{ id: string }>('SELECT id FROM usuarios WHERE email = $1', [email]);
  },

  async criar(dados: {
    nome: string; email: string; papel: PapelUsuario; senhaHash: string;
  }): Promise<Usuario> {
    const criado = await consultarUm<Usuario>(
      `INSERT INTO usuarios (nome, email, papel, senha_hash)
       VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
      [dados.nome, dados.email, dados.papel, dados.senhaHash],
    );
    if (!criado) throw new Error('Falha ao criar usuário');
    return criado;
  },

  atualizar(id: string, dados: {
    nome?: string; papel?: PapelUsuario; ativo?: boolean;
  }): Promise<Usuario | null> {
    // COALESCE deixa o UPDATE parcial sem montar SQL dinâmico.
    return consultarUm<Usuario>(
      `UPDATE usuarios
          SET nome  = COALESCE($2, nome),
              papel = COALESCE($3, papel),
              ativo = COALESCE($4, ativo)
        WHERE id = $1
      RETURNING ${CAMPOS}`,
      [id, dados.nome ?? null, dados.papel ?? null, dados.ativo ?? null],
    );
  },

  async trocarSenha(id: string, senhaHash: string): Promise<boolean> {
    return (await executar('UPDATE usuarios SET senha_hash = $2 WHERE id = $1',
      [id, senhaHash])) > 0;
  },

  /** Quantos administradores ativos existem — usado para não zerar o acesso. */
  async administradoresAtivos(): Promise<number> {
    const linha = await consultarUm<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM usuarios WHERE papel = 'administrador' AND ativo");
    return linha?.total ?? 0;
  },
};
