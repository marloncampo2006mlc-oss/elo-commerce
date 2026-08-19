/**
 * Entry point da função serverless na Vercel.
 * O mesmo `criarApp()` usado pelo servidor local (src/server.js) é
 * reaproveitado aqui — só muda quem chama app.listen(): em produção,
 * é a própria Vercel quem administra o ciclo de vida da função.
 */
import { criarApp } from '../src/app.js';

export default criarApp();
