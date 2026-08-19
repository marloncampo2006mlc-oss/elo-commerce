import { criarApp } from './app.js';
import { env } from './config/env.js';
import { pool, healthcheck } from './db/pool.js';

const app = criarApp();

try {
  const info = await healthcheck();
  console.log(`\n  \x1b[35m◆ ELO COMMERCE\x1b[0m — plataforma de vendas + atendimento omnichannel`);
  console.log(`  \x1b[90mbanco:\x1b[0m ${info.banco} @ ${env.db.host}:${env.db.port}`);
} catch (err) {
  console.error(`\n❌ Não consegui conectar ao PostgreSQL (${env.db.database}): ${err.message}`);
  console.error('   Verifique o .env e rode: npm run db:reset\n');
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`  \x1b[90mapp:\x1b[0m   \x1b[36mhttp://localhost:${env.port}\x1b[0m`);
  console.log(`  \x1b[90mapi:\x1b[0m   http://localhost:${env.port}/api/health\n`);
});

// Encerramento gracioso: fecha o pool antes de sair.
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    console.log('\n  encerrando...');
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
