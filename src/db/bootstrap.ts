import 'dotenv/config';
import { consultarUm, pool } from '../lib/db.js';
import { authService } from '../modules/auth/auth.service.js';
import { botsRepository } from '../modules/bots/bots.repository.js';
import { FLUXO_INICIAL } from './fluxo-inicial.js';

/**
 * Prepara o banco para servir a aplicação, de forma idempotente.
 *
 * Roda no deploy porque a senha do PostgreSQL não é recuperável — só o
 * ambiente de execução a conhece, via DATABASE_URL. Rodar aqui evita
 * precisar do segredo em máquina de desenvolvimento para publicar.
 *
 * Tudo é condicional: se o usuário já existe, não recria; se o bot já
 * existe, não republica. Repetir o comando não causa efeito colateral,
 * o que é o requisito para algo que roda a cada build.
 *
 * As migrations em si ficam fora daqui — são aplicadas por migrate.ts,
 * que já mantém o próprio registro do que rodou.
 */

async function criarAdministrador(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@elo.dev').trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;

  if (!senha) {
    console.log('   ↷ ADMIN_PASSWORD não definido — nenhum usuário criado');
    return;
  }

  const existente = await consultarUm<{ id: string }>(
    'SELECT id FROM usuarios WHERE email = $1', [email]);

  if (existente) {
    console.log(`   ↷ ${email} já existe`);
    return;
  }

  await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, papel)
     VALUES ($1, $2, $3, 'administrador')`,
    ['Administrador', email, await authService.gerarHash(senha)],
  );
  console.log(`   ✓ administrador criado: ${email}`);
}

async function publicarBotInicial(): Promise<void> {
  const existente = await consultarUm<{ id: string }>('SELECT id FROM bots LIMIT 1');
  if (existente) {
    console.log('   ↷ já existe chatbot cadastrado');
    return;
  }

  const admin = await consultarUm<{ id: string }>(
    "SELECT id FROM usuarios WHERE papel = 'administrador' LIMIT 1");

  const bot = await botsRepository.criar(
    'Atendimento da Loja',
    'Fluxo principal do assistente virtual: consulta de pedidos, busca no catálogo e transferência para atendente.',
    admin?.id ?? null,
  );

  const versao = await botsRepository.criarVersao(bot.id, FLUXO_INICIAL, admin?.id ?? null);
  await botsRepository.publicar(versao.id, bot.id);
  await botsRepository.definirAtivoNaLoja(bot.id);

  console.log(`   ✓ chatbot "${bot.nome}" publicado`);
}

async function preparar(): Promise<void> {
  console.log('🚀 Preparando o ambiente...');
  await criarAdministrador();
  await publicarBotInicial();
  console.log('✅ Ambiente pronto.');
}

preparar()
  .catch((erro: Error) => {
    console.error('❌ Falha no bootstrap:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
