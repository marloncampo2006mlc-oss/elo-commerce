import { produtosService } from './produtos.service.js';
import { asyncHandler, ok, paginated } from '../../shared/http.js';

export const produtosController = {
  listar: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { items, total } = await produtosService.listar(req.query);
    paginated(res, { items, total, page, limit });
  }),
  obter: asyncHandler(async (req, res) => ok(res, await produtosService.obter(req.params.id))),
  criar: asyncHandler(async (req, res) => ok(res, await produtosService.criar(req.body), 201)),
  atualizar: asyncHandler(async (req, res) =>
    ok(res, await produtosService.atualizar(req.params.id, req.body))),
  remover: asyncHandler(async (req, res) => {
    await produtosService.remover(req.params.id);
    res.status(204).end();
  }),
  ajustarEstoque: asyncHandler(async (req, res) =>
    ok(res, await produtosService.ajustarEstoque(req.params.id, req.body.ajuste))),
  categorias: asyncHandler(async (_req, res) => ok(res, await produtosService.categorias())),
  imagens: asyncHandler(async (_req, res) => ok(res, await produtosService.imagensDisponiveis())),
};
