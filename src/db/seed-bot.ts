import 'dotenv/config';
import { consultarUm, pool } from '../lib/db.js';
import { botsRepository } from '../modules/bots/bots.repository.js';
import { FLUXO_INICIAL } from './fluxo-inicial.js';

/** Cria e publica o chatbot inicial no banco local de desenvolvimento. */
async function semear(): Promise<void> {
  const existente = await consultarUm<{ id: string }>(
    "SELECT id FROM bots WHERE nome = 'Atendimento da Loja'");

  if (existente) {
    console.log('ℹ️  Bot já existe — nada a fazer.');
    return;
  }

  const admin = await consultarUm<{ id: string }>(
    "SELECT id FROM usuarios WHERE papel = 'administrador' LIMIT 1");

  const bot = await botsRepository.criar(
    'Atendimento da Loja',
    'Fluxo principal do assistente virtual: consulta de pedidos, busca no catálogo e transferência para atendente.',
    admin?.id ?? null,
  );

  const rascunho = await botsRepository.criarVersao(bot.id, FLUXO_INICIAL, admin?.id ?? null);
  await botsRepository.publicar(rascunho.id, bot.id);
  await botsRepository.definirAtivoNaLoja(bot.id);

  console.log(`✅ Bot "${bot.nome}" criado e publicado`);
  console.log(`   ${FLUXO_INICIAL.nodes.length} blocos · ${FLUXO_INICIAL.edges.length} conexões`);
}

semear()
  .catch((erro: Error) => { console.error('❌ Falha ao criar o bot:', erro.message); process.exitCode = 1; })
  .finally(() => pool.end());
