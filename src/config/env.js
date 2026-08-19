import 'dotenv/config';

const isServerless = Boolean(process.env.VERCEL);

/**
 * Configuração centralizada. Nenhum outro módulo lê process.env
 * diretamente — assim o app tem um único ponto de verdade.
 *
 * Dois formatos de conexão são aceitos:
 *  - DATABASE_URL: usado em produção (Supabase/Neon/etc.), já traz SSL
 *    e aponta para o pooler — essencial em ambiente serverless, onde
 *    cada invocação pode abrir sua própria conexão.
 *  - PGHOST/PGPORT/...: usado em desenvolvimento local, contra um
 *    PostgreSQL sem SSL.
 */
const db = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: 30_000,
    }
  : {
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE ?? 'elo_commerce',
      max: 10,
      idleTimeoutMillis: 30_000,
    };

export const env = {
  port: Number(process.env.PORT ?? 3333),
  session: {
    secret: process.env.SESSION_SECRET ?? '',
    adminPassword: process.env.ADMIN_PASSWORD ?? '',
    // Sem os dois definidos, a escrita administrativa fica bloqueada.
    configurado: Boolean(process.env.SESSION_SECRET && process.env.ADMIN_PASSWORD),
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  isServerless,
  db,
};
