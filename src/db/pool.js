import pg from 'pg';
import { env } from '../config/env.js';

// NUMERIC volta como string por padrão (precisão). Para uma API JSON
// queremos número — convertemos os OIDs monetários explicitamente.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool(env.db);

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err.message);
});

/** Executa uma query simples e devolve as linhas. */
export async function query(text, params = []) {
  const started = Date.now();
  const result = await pool.query(text, params);
  if (env.isDev) {
    const ms = Date.now() - started;
    if (ms > 120) console.warn(`[db] query lenta (${ms}ms): ${text.slice(0, 70)}...`);
  }
  return result;
}

/**
 * Executa um bloco dentro de uma transação, com COMMIT/ROLLBACK
 * automáticos. Uso: await transaction(async (client) => { ... })
 */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function healthcheck() {
  const { rows } = await query('SELECT NOW() AS agora, current_database() AS banco');
  return rows[0];
}
