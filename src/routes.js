import { Router } from 'express';
import { clientesRoutes } from './modules/clientes/clientes.routes.js';
import { produtosRoutes } from './modules/produtos/produtos.routes.js';
import { pedidosRoutes } from './modules/pedidos/pedidos.routes.js';
import { atendimentosRoutes } from './modules/atendimentos/atendimentos.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthcheck } from './db/pool.js';
import { asyncHandler, ok } from './shared/http.js';

export const routes = Router();

routes.get('/health', asyncHandler(async (_req, res) =>
  ok(res, { status: 'ok', ...(await healthcheck()) })));

routes.use('/auth', authRoutes);
routes.use('/clientes', clientesRoutes);
routes.use('/produtos', produtosRoutes);
routes.use('/pedidos', pedidosRoutes);
routes.use('/atendimentos', atendimentosRoutes);
routes.use('/dashboard', dashboardRoutes);
