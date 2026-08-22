import 'dotenv/config';
import bcrypt from 'bcryptjs';
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

/**
 * Garante que a conta de demonstração ABRE com a senha do ambiente.
 *
 * Antes esta função só criava o usuário quando ele ainda não existia, e
 * saía de fininho quando existia. O efeito era invisível e ruim: uma vez
 * criada a conta, trocar ADMIN_PASSWORD não mudava mais nada, e a senha
 * publicada na documentação deixava de abrir a plataforma sem que
 * nenhum log acusasse o problema. Para uma conta cujas credenciais são
 * divulgadas de propósito, quem manda tem que ser o ambiente.
 *
 * Por isso agora o deploy reafirma a senha a cada build. É a mesma ideia
 * do resto deste arquivo — repetir não causa efeito colateral — só que
 * aplicada também ao caso em que a linha já existe. Se alguém trocar a
 * senha pela tela, o próximo deploy devolve a documentada.
 *
 * A comparação usa o verificador do bcrypt, e não o hash: dois hashes da
 * mesma senha são diferentes por causa do sal, então comparar strings
 * reescreveria a linha em todo build sem necessidade.
 */
async function garantirAdministrador(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@elo.dev').trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;

  if (!senha) {
    console.log('   ↷ ADMIN_PASSWORD não definido — nenhum usuário criado');
    return;
  }

  const existente = await consultarUm<{ id: string; senha_hash: string; ativo: boolean }>(
    'SELECT id, senha_hash, ativo FROM usuarios WHERE email = $1', [email]);

  if (!existente) {
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'administrador')`,
      ['Administrador', email, await authService.gerarHash(senha)],
    );
    console.log(`   ✓ administrador criado: ${email}`);
    return;
  }

  const jaAbre = await bcrypt.compare(senha, existente.senha_hash);

  if (jaAbre && existente.ativo) {
    console.log(`   ↷ ${email} já abre com a senha do ambiente`);
    return;
  }

  // Reativa junto: conta de demonstração bloqueada por engano deixaria
  // a documentação mentindo do mesmo jeito que a senha errada.
  await pool.query(
    `UPDATE usuarios
        SET senha_hash = $2, ativo = TRUE, papel = 'administrador'
      WHERE id = $1`,
    [existente.id, await authService.gerarHash(senha)],
  );
  console.log(`   ✓ acesso de ${email} realinhado com ADMIN_PASSWORD`);
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

/**
 * Encerra conversas que ficaram penduradas.
 *
 * Uma conversa só sai da fila quando alguém a encerra — mas o cliente
 * que simplesmente fecha o navegador não encerra nada, e aquela linha
 * fica "aguardando atendente" para sempre. Com o tempo a fila enche de
 * "Visitante · chatbot" idênticos, dos quais nenhum tem gente do outro
 * lado, e o atendente passa a escolher no escuro.
 *
 * Seis horas é folgado de propósito: ninguém espera atendimento por seis
 * horas com a janela aberta, então o corte não alcança quem ainda está
 * lá. E marcar como `abandonado`, em vez de apagar, preserva no BI a
 * diferença entre quem foi atendido e quem desistiu.
 */
async function encerrarConversasAbandonadas(): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE atendimentos
        SET status = 'abandonado', finalizado_em = NOW()
      WHERE status IN ('em_andamento', 'aguardando_atendente', 'em_atendimento')
        AND created_at < NOW() - INTERVAL '6 hours'`,
  );

  console.log(rowCount
    ? `   ✓ ${rowCount} conversa(s) parada(s) marcada(s) como abandonada(s)`
    : '   ↷ nenhuma conversa parada na fila');
}

async function preparar(): Promise<void> {
  console.log('🚀 Preparando o ambiente...');
  await garantirAdministrador();
  await publicarBotInicial();
  await encerrarConversasAbandonadas();
  console.log('✅ Ambiente pronto.');
}

preparar()
  .catch((erro: Error) => {
    console.error('❌ Falha no bootstrap:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
