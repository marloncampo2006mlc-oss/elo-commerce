import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consultar, executar, pool } from '../lib/db.js';

const PASTA_SQL = join(dirname(fileURLToPath(import.meta.url)), 'sql');

/**
 * Migrador simples: aplica os arquivos .sql em ordem alfabética e
 * registra o que já rodou em `schema_migrations`, tornando a execução
 * idempotente.
 *
 * `--reset` derruba o schema antes de reaplicar tudo. É destrutivo, por
 * isso recusa rodar quando NODE_ENV=production ou quando a conexão
 * aponta para um banco remoto sem confirmação explícita.
 */
async function migrar(reset: boolean): Promise<void> {
  if (reset) {
    protegerContraResetEmProducao();
    console.log('⚠️  Resetando o schema public...');
    await executar('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  await executar(`CREATE TABLE IF NOT EXISTS schema_migrations (
      arquivo     VARCHAR(120) PRIMARY KEY,
      aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const aplicados = new Set(
    (await consultar<{ arquivo: string }>('SELECT arquivo FROM schema_migrations'))
      .map((linha) => linha.arquivo),
  );

  const arquivos = (await readdir(PASTA_SQL)).filter((a) => a.endsWith('.sql')).sort();

  for (const arquivo of arquivos) {
    if (aplicados.has(arquivo)) {
      console.log(`   ↷ ${arquivo} (já aplicado)`);
      continue;
    }
    const sql = await readFile(join(PASTA_SQL, arquivo), 'utf8');
    await executar(sql);
    await executar('INSERT INTO schema_migrations (arquivo) VALUES ($1)', [arquivo]);
    console.log(`   ✓ ${arquivo}`);
  }

  console.log('✅ Migrations concluídas.');
}

/**
 * Trava de segurança. Um `--reset` apontando para a produção apagaria
 * tudo; a única forma de fazer isso é passar --forcar conscientemente.
 */
function protegerContraResetEmProducao(): void {
  const forcado = process.argv.includes('--forcar');
  if (forcado) return;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Reset bloqueado: NODE_ENV=production. Use --forcar se for realmente intencional.');
  }

  const url = process.env.DATABASE_URL;
  if (url && !/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(
      'Reset bloqueado: DATABASE_URL aponta para um banco remoto. ' +
      'Use --forcar se for realmente intencional.',
    );
  }
}

migrar(process.argv.includes('--reset'))
  .catch((erro: Error) => {
    console.error('❌ Falha na migration:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
