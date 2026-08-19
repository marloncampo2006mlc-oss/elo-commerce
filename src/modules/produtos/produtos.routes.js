import { Router } from 'express';
import { produtosController as ctrl } from './produtos.controller.js';
import { validate } from '../../shared/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { produtoCreateSchema, produtoUpdateSchema, listarQuerySchema, estoqueSchema, idSchema } from './produtos.schema.js';

export const produtosRoutes = Router();

produtosRoutes.get('/categorias', ctrl.categorias);
produtosRoutes.get('/imagens', ctrl.imagens);
produtosRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
produtosRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
produtosRoutes.post('/', requireAuth, validate(produtoCreateSchema), ctrl.criar);
produtosRoutes.put('/:id', requireAuth, validate(idSchema, 'params'), validate(produtoUpdateSchema), ctrl.atualizar);
produtosRoutes.patch('/:id/estoque', requireAuth, validate(idSchema, 'params'), validate(estoqueSchema), ctrl.ajustarEstoque);
produtosRoutes.delete('/:id', requireAuth, validate(idSchema, 'params'), ctrl.remover);
