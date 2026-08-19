import { Router } from 'express';
import { pedidosController as ctrl } from './pedidos.controller.js';
import { validate } from '../../shared/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { pedidoCreateSchema, statusSchema, listarQuerySchema, idSchema } from './pedidos.schema.js';

export const pedidosRoutes = Router();

// POST / permanece público: é o checkout do cliente na loja.
// PATCH de status e DELETE são operações de gestão e exigem sessão.

pedidosRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
pedidosRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
pedidosRoutes.post('/', validate(pedidoCreateSchema), ctrl.criar);
pedidosRoutes.patch('/:id/status', requireAuth, validate(idSchema, 'params'), validate(statusSchema), ctrl.alterarStatus);
pedidosRoutes.delete('/:id', requireAuth, validate(idSchema, 'params'), ctrl.remover);
