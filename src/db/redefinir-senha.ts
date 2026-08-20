import 'dotenv/config';
import { consultarUm, pool } from '../lib/db.js';
import { authService } from '../modules/auth/auth.service.js';

/**
 * Redefine a senha de um usuário pelo e-mail.
 *
 * Existe porque senha não é recuperável: o banco guarda apenas o hash
 * bcrypt, e isso é proposital — nem quem tem acesso ao banco consegue
 * ler a senha de alguém. O caminho correto é sempre definir uma nova.
 *
 * Uso: npm run db:senha -- email@exemplo.com [nova-senha]
 */
async function redefinir(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Informe o e-mail: npm run db:senha -- email@exemplo.com');

  const usuario = await consultarUm<{ id: string; nome: string }>(
    'SELECT id, nome FROM usuarios WHERE email = $1', [email]);
  if (!usuario) throw new Error(`Nenhum usuário com o e-mail ${email}`);

  const senha = process.argv[3] ?? gerarSenha();
  await pool.query('UPDATE usuarios SET senha_hash = $2, ativo = TRUE WHERE id = $1',
    [usuario.id, await authService.gerarHash(senha)]);

  console.log(`\n✅ Senha redefinida para ${usuario.nome}`);
  console.log(`   e-mail: ${email}`);
  console.log(`   senha:  ${senha}\n`);
}

function gerarSenha(): string {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 14 },
    () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');
}

redefinir()
  .catch((erro: Error) => { console.error('❌', erro.message); process.exitCode = 1; })
  .finally(() => pool.end());
