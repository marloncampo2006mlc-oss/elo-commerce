import 'dotenv/config';

/**
 * Configuração centralizada. Nenhum outro módulo lê process.env
 * diretamente — assim o app tem um único ponto de verdade.
 */
export const env = {
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  db: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE ?? 'elo_commerce',
    max: 10,
    idleTimeoutMillis: 30_000,
  },
};
