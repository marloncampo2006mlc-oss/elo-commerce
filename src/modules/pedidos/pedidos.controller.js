import { pedidosService } from './pedidos.service.js';
import { asyncHandler, ok, paginated } from '../../shared/http.js';

export const pedidosController = {
  listar: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { items, total } = await pedidosService.listar(req.query);
    paginated(res, { items, total, page, limit });
  }),
  obter: asyncHandler(async (req, res) => ok(res, await pedidosService.obter(req.params.id))),
  criar: asyncHandler(async (req, res) => ok(res, await pedidosService.criar(req.body), 201)),
  alterarStatus: asyncHandler(async (req, res) =>
    ok(res, await pedidosService.alterarStatus(req.params.id, req.body.status))),
  remover: asyncHandler(async (req, res) => {
    await pedidosService.remover(req.params.id);
    res.status(204).end();
  }),
};
