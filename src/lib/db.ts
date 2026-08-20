import pg from 'pg';

/**
 * Pool de conexão único por processo.
 *
 * Em desenvolvimento o Next recarrega módulos a cada alteração; sem o
 * cache no globalThis, cada recarga abriria um pool novo e o Postgres
 * esgotaria as conexões em poucos minutos.
 */

// NUMERIC e INT8 chegam como string (precisão arbitrária). Para uma API
// JSON queremos número — convertemos explicitamente.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)));

const isServerless = Boolean(process.env.VERCEL);

function criarPool(): pg.Pool {
  if (process.env.DATABASE_URL) {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: 30_000,
    });
  }

  return new pg.Pool({
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE ?? 'elo_commerce',
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

const globalParaPool = globalThis as unknown as { __eloPool?: pg.Pool };

export const pool: pg.Pool = globalParaPool.__eloPool ?? criarPool();
if (process.env.NODE_ENV !== 'production') globalParaPool.__eloPool = pool;

pool.on('error', (erro) => {
  console.error('[db] erro inesperado no pool:', erro.message);
});

/** Executa uma query parametrizada e devolve as linhas tipadas. */
export async function consultar<T extends pg.QueryResultRow>(
  sql: string,
  parametros: readonly unknown[] = [],
): Promise<T[]> {
  const resultado = await pool.query<T>(sql, parametros as unknown[]);
  return resultado.rows;
}

/** Igual a `consultar`, mas devolve a primeira linha (ou null). */
export async function consultarUm<T extends pg.QueryResultRow>(
  sql: string,
  parametros: readonly unknown[] = [],
): Promise<T | null> {
  const linhas = await consultar<T>(sql, parametros);
  return linhas[0] ?? null;
}

/** Executa um comando e devolve quantas linhas foram afetadas. */
export async function executar(sql: string, parametros: readonly unknown[] = []): Promise<number> {
  const resultado = await pool.query(sql, parametros as unknown[]);
  return resultado.rowCount ?? 0;
}

/**
 * Roda um bloco dentro de uma transação, com COMMIT/ROLLBACK automáticos.
 * O client é passado adiante para que todas as queries do bloco usem a
 * mesma conexão — requisito para que a transação funcione de fato.
 */
export async function emTransacao<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

export async function verificarConexao(): Promise<{ agora: Date; banco: string }> {
  const linha = await consultarUm<{ agora: Date; banco: string }>(
    'SELECT NOW() AS agora, current_database() AS banco',
  );
  if (!linha) throw new Error('Banco não respondeu ao healthcheck');
  return linha;
}
