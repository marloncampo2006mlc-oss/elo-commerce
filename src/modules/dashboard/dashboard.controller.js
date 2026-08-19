import { dashboardRepository as repo } from './dashboard.repository.js';
import { asyncHandler, ok } from '../../shared/http.js';

export const dashboardController = {
  /** Uma única chamada monta a tela inteira: menos round-trips no front. */
  resumo: asyncHandler(async (_req, res) => {
    const [indicadores, faturamentoDiario, topProdutos, vendasPorCanal,
           pedidosPorStatus, ultimosPedidos, alertaEstoque] = await Promise.all([
      repo.indicadores(),
      repo.faturamentoDiario(),
      repo.topProdutos(),
      repo.vendasPorCanal(),
      repo.pedidosPorStatus(),
      repo.ultimosPedidos(),
      repo.alertaEstoque(),
    ]);

    ok(res, { indicadores, faturamentoDiario, topProdutos, vendasPorCanal,
              pedidosPorStatus, ultimosPedidos, alertaEstoque });
  }),
};
