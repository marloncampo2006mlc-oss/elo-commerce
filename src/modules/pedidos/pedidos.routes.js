import { Router } from 'express';
import { pedidosController as ctrl } from './pedidos.controller.js';
import { validate } from '../../shared/validate.js';
import { pedidoCreateSchema, statusSchema, listarQuerySchema, idSchema } from './pedidos.schema.js';

export const pedidosRoutes = Router();

pedidosRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
pedidosRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
pedidosRoutes.post('/', validate(pedidoCreateSchema), ctrl.criar);
pedidosRoutes.patch('/:id/status', validate(idSchema, 'params'), validate(statusSchema), ctrl.alterarStatus);
pedidosRoutes.delete('/:id', validate(idSchema, 'params'), ctrl.remover);
