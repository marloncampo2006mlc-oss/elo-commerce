import { atendimentosService } from './atendimentos.service.js';
import { asyncHandler, ok, paginated } from '../../shared/http.js';

export const atendimentosController = {
  listar: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { items, total } = await atendimentosService.listar(req.query);
    paginated(res, { items, total, page, limit });
  }),
  obter: asyncHandler(async (req, res) => ok(res, await atendimentosService.obter(req.params.id))),
  iniciar: asyncHandler(async (req, res) => ok(res, await atendimentosService.iniciar(req.body), 201)),
  responder: asyncHandler(async (req, res) =>
    ok(res, await atendimentosService.responder(req.params.id, req.body.entrada))),
  encerrar: asyncHandler(async (req, res) => ok(res, await atendimentosService.encerrar(req.params.id))),
  estatisticas: asyncHandler(async (_req, res) => ok(res, await atendimentosService.estatisticas())),
};
