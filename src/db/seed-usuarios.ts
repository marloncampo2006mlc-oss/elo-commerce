import 'dotenv/config';
import { consultarUm, executar, pool } from '../lib/db.js';
import { authService } from '../modules/auth/auth.service.js';

/**
 * Cria as contas de demonstração da equipe interna.
 *
 * As senhas são geradas aleatoriamente e impressas UMA vez, no terminal
 * de quem roda o script. Nada de senha fixa no repositório — um valor
 * como "admin123" versionado é exatamente o tipo de coisa que vira
 * incidente quando o projeto vai para produção.
 */

interface Semente {
  nome: string;
  email: string;
  papel: 'administrador' | 'gerente' | 'supervisor' | 'atendente';
}

const EQUIPE: Semente[] = [
  { nome: 'Marlon Campos',   email: 'admin@elo.dev',      papel: 'administrador' },
  { nome: 'Gerente Demo',    email: 'gerente@elo.dev',    papel: 'gerente' },
  { nome: 'Supervisor Demo', email: 'supervisor@elo.dev', papel: 'supervisor' },
  { nome: 'Atendente Demo',  email: 'atendente@elo.dev',  papel: 'atendente' },
];

function gerarSenha(): string {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 14 },
    () => alfabeto[Math.floor(Math.random() * alfabeto.length)],
  ).join('');
}

async function semear(): Promise<void> {
  console.log('👤 Criando usuários da gestão...\n');
  const credenciais: Array<{ email: string; senha: string; papel: string }> = [];

  for (const pessoa of EQUIPE) {
    const existente = await consultarUm<{ id: string }>(
      'SELECT id FROM usuarios WHERE email = $1', [pessoa.email],
    );

    const senha = gerarSenha();
    const hash = await authService.gerarHash(senha);

    if (existente) {
      await executar('UPDATE usuarios SET senha_hash = $2, papel = $3, ativo = TRUE WHERE id = $1',
        [existente.id, hash, pessoa.papel]);
    } else {
      await executar(
        'INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4)',
        [pessoa.nome, pessoa.email, hash, pessoa.papel],
      );
    }

    credenciais.push({ email: pessoa.email, senha, papel: pessoa.papel });
  }

  console.log('   Guarde estas credenciais — elas não são exibidas novamente:\n');
  for (const credencial of credenciais) {
    console.log(`   ${credencial.papel.padEnd(14)} ${credencial.email.padEnd(22)} ${credencial.senha}`);
  }
  console.log('\n✅ Usuários prontos.');
}

semear()
  .catch((erro: Error) => {
    console.error('❌ Falha ao criar usuários:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
