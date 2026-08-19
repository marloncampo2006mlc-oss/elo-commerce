import { Router } from 'express';
import { produtosController as ctrl } from './produtos.controller.js';
import { validate } from '../../shared/validate.js';
import { produtoCreateSchema, produtoUpdateSchema, listarQuerySchema, estoqueSchema, idSchema } from './produtos.schema.js';

export const produtosRoutes = Router();

produtosRoutes.get('/categorias', ctrl.categorias);
produtosRoutes.get('/imagens', ctrl.imagens);
produtosRoutes.get('/', validate(listarQuerySchema, 'query'), ctrl.listar);
produtosRoutes.get('/:id', validate(idSchema, 'params'), ctrl.obter);
produtosRoutes.post('/', validate(produtoCreateSchema), ctrl.criar);
produtosRoutes.put('/:id', validate(idSchema, 'params'), validate(produtoUpdateSchema), ctrl.atualizar);
produtosRoutes.patch('/:id/estoque', validate(idSchema, 'params'), validate(estoqueSchema), ctrl.ajustarEstoque);
produtosRoutes.delete('/:id', validate(idSchema, 'params'), ctrl.remover);
