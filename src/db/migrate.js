import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from './pool.js';

const SQL_DIR = join(dirname(fileURLToPath(import.meta.url)), 'sql');

/**
 * Migrador simples: aplica os arquivos .sql em ordem alfabética e
 * registra o que já rodou em schema_migrations (idempotente).
 * `--reset` derruba o schema public antes de aplicar tudo de novo.
 */
async function migrar({ reset = false } = {}) {
  if (reset) {
    console.log('⚠️  Resetando o schema public...');
    await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      arquivo    VARCHAR(120) PRIMARY KEY,
      aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const { rows } = await query('SELECT arquivo FROM schema_migrations');
  const aplicados = new Set(rows.map((r) => r.arquivo));
  const arquivos = (await readdir(SQL_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const arquivo of arquivos) {
    if (aplicados.has(arquivo)) {
      console.log(`   ↷ ${arquivo} (já aplicado)`);
      continue;
    }
    const sql = await readFile(join(SQL_DIR, arquivo), 'utf8');
    await query(sql);
    await query('INSERT INTO schema_migrations (arquivo) VALUES ($1)', [arquivo]);
    console.log(`   ✓ ${arquivo}`);
  }
  console.log('✅ Migrations concluídas.');
}

migrar({ reset: process.argv.includes('--reset') })
  .catch((err) => {
    console.error('❌ Falha na migration:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
