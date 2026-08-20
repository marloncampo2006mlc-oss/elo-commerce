import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository';
import { NaoAutorizado } from '@/lib/erros';
import type { SessaoUsuario } from '@/lib/sessao';
import type { EntradaLogin } from './auth.schema';

/**
 * Hash "descartável" usado quando o e-mail não existe. Sem ele, um
 * e-mail inexistente responderia bem mais rápido que um existente,
 * permitindo descobrir quais e-mails estão cadastrados pelo tempo de
 * resposta (user enumeration).
 */
const HASH_FALSO = '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789';

export const authService = {
  async autenticar({ email, senha }: EntradaLogin): Promise<SessaoUsuario> {
    const usuario = await authRepository.buscarPorEmail(email);

    // Comparamos sempre, mesmo sem usuário, para manter o tempo constante.
    const confere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FALSO);

    // Mensagem genérica: não revela se o erro foi e-mail ou senha.
    if (!usuario || !confere) throw NaoAutorizado('E-mail ou senha incorretos');

    await authRepository.registrarAcesso(usuario.id);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    };
  },

  gerarHash: (senha: string): Promise<string> => bcrypt.hash(senha, 10),
};
