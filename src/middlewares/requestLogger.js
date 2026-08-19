const COR = { GET: '\x1b[36m', POST: '\x1b[32m', PUT: '\x1b[33m', PATCH: '\x1b[33m', DELETE: '\x1b[31m' };
const RESET = '\x1b[0m';

/** Log enxuto de requisições da API (ignora arquivos estáticos). */
export function requestLogger(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  const inicio = Date.now();
  res.on('finish', () => {
    const cor = COR[req.method] ?? '';
    const st = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[90m';
    console.log(`${cor}${req.method}${RESET} ${req.originalUrl} ${st}${res.statusCode}${RESET} ${Date.now() - inicio}ms`);
  });
  next();
}
