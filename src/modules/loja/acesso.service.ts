import bcrypt from 'bcryptjs';
import { consultarUm, executar } from '@/lib/db';
import { Conflito, NaoAutorizado } from '@/lib/erros';
import type { SessaoCliente } from '@/lib/sessaoCliente';
import type { EntradaCadastro } from './acesso.schema';

/** Mesmo motivo do login da equipe: manter o tempo de resposta constante. */
const HASH_FALSO = '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789';

interface ClienteAcesso {
  id: string; nome: string; email: string;
  senha_hash: string | null; status: string;
}

export const acessoService = {
  /**
   * Cadastro na loja.
   *
   * Se já existe um cliente com aquele e-mail mas sem senha — caso dos
   * cadastros criados pela gestão —, o acesso é ativado nele em vez de
   * criar um duplicado. Assim o histórico de compras da pessoa não se
   * parte em dois cadastros.
   */
  async cadastrar(dados: EntradaCadastro): Promise<SessaoCliente> {
    const existente = await consultarUm<ClienteAcesso>(
      'SELECT id, nome, email, senha_hash, status FROM clientes WHERE email = $1 OR cpf = $2',
      [dados.email, dados.cpf]);

    const hash = await bcrypt.hash(dados.senha, 10);

    if (existente) {
      if (existente.senha_hash) {
        throw Conflito('Já existe uma conta com esse e-mail ou CPF. Faça login.');
      }
      await executar(
        `UPDATE clientes
            SET senha_hash = $2, metodo_login = 'senha', nome = $3, status = 'ativo'
          WHERE id = $1`,
        [existente.id, hash, dados.nome]);

      return { id: existente.id, nome: dados.nome, email: existente.email };
    }

    const criado = await consultarUm<{ id: string }>(
      `INSERT INTO clientes (nome, email, cpf, telefone, senha_hash, metodo_login, status)
       VALUES ($1, $2, $3, $4, $5, 'senha', 'ativo') RETURNING id`,
      [dados.nome, dados.email, dados.cpf, dados.telefone ?? null, hash]);

    if (!criado) throw new Error('Falha ao criar conta');
    return { id: criado.id, nome: dados.nome, email: dados.email };
  },

  async autenticar(email: string, senha: string): Promise<SessaoCliente> {
    const cliente = await consultarUm<ClienteAcesso>(
      'SELECT id, nome, email, senha_hash, status FROM clientes WHERE email = $1', [email]);

    const confere = await bcrypt.compare(senha, cliente?.senha_hash ?? HASH_FALSO);

    if (!cliente || !cliente.senha_hash || !confere) {
      throw NaoAutorizado('E-mail ou senha incorretos');
    }
    if (cliente.status === 'inativo') {
      throw NaoAutorizado('Esta conta está inativa. Fale com o suporte.');
    }

    await executar('UPDATE clientes SET ultimo_acesso = NOW() WHERE id = $1', [cliente.id]);
    return { id: cliente.id, nome: cliente.nome, email: cliente.email };
  },
};
