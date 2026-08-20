import { Router } from 'express';
import { atendimentosController as ctrl } from './atendimentos.controller.js';
import { validate } from '../../shared/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { iniciarSchema, mensagemSchema, listarQuerySchema, idSchema } from './atendimentos.schema.js';

export const atendimentosRoutes = Router();

atendimentosRoutes.get('/estatisticas', ctrl.estatisticas);
atendimentosRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
atendimentosRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
atendimentosRoutes.post('/', validate(iniciarSchema), ctrl.iniciar);
atendimentosRoutes.post('/:id/mensagens', validate(idSchema, 'params'), validate(mensagemSchema), ctrl.responder);
atendimentosRoutes.post('/:id/encerrar', requireAuth, validate(idSchema, 'params'), ctrl.encerrar);
