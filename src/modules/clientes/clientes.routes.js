import { Router } from 'express';
import { clientesController as ctrl } from './clientes.controller.js';
import { validate } from '../../shared/validate.js';
import { clienteCreateSchema, clienteUpdateSchema, listarQuerySchema, idSchema } from './clientes.schema.js';

export const clientesRoutes = Router();

clientesRoutes.get('/ufs', ctrl.ufs);
clientesRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
clientesRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
clientesRoutes.post('/', validate(clienteCreateSchema), ctrl.criar);
clientesRoutes.put('/:id', validate(idSchema, 'params'), validate(clienteUpdateSchema), ctrl.atualizar);
clientesRoutes.delete('/:id', validate(idSchema, 'params'), ctrl.remover);
