import { clientesService } from './clientes.service.js';
import { asyncHandler, ok, paginated } from '../../shared/http.js';

export const clientesController = {
  listar: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { items, total } = await clientesService.listar(req.query);
    paginated(res, { items, total, page, limit });
  }),

  obter: asyncHandler(async (req, res) => ok(res, await clientesService.obter(req.params.id))),

  criar: asyncHandler(async (req, res) => ok(res, await clientesService.criar(req.body), 201)),

  atualizar: asyncHandler(async (req, res) =>
    ok(res, await clientesService.atualizar(req.params.id, req.body))),

  remover: asyncHandler(async (req, res) => {
    await clientesService.remover(req.params.id);
    res.status(204).end();
  }),

  ufs: asyncHandler(async (_req, res) => ok(res, await clientesService.ufs())),
};
