import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from './routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { env } from './config/env.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export function criarApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // API
  app.use('/api', routes);
  app.use('/api', notFound);

  // Front-end (SPA servida pelo mesmo processo).
  // Em desenvolvimento não cacheamos: recarregar o navegador já traz o código novo.
  app.use(express.static(join(RAIZ, 'public'), {
    etag: !env.isDev,
    maxAge: env.isDev ? 0 : '1h',
    setHeaders: (res) => { if (env.isDev) res.setHeader('Cache-Control', 'no-store'); },
  }));
  app.get('*', (_req, res) => res.sendFile(join(RAIZ, 'public', 'index.html')));

  app.use(errorHandler);
  return app;
}
