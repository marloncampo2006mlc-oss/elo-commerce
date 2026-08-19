import { indicadoresRepository } from './indicadores.repository';
import type { Periodo } from './indicadores.schema';

export const indicadoresService = {
  /** Uma chamada monta o BI inteiro — menos idas ao banco, menos espera. */
  async completo(periodo: Periodo) {
    const [
      resumo, serie, canais, status, produtos, clientes, atendimentoCanais, estoque,
    ] = await Promise.all([
      indicadoresRepository.resumo(periodo),
      indicadoresRepository.serieDiaria(periodo),
      indicadoresRepository.porCanal(periodo),
      indicadoresRepository.porStatus(periodo),
      indicadoresRepository.topProdutos(periodo),
      indicadoresRepository.clientesRecorrentes(),
      indicadoresRepository.atendimentoPorCanal(periodo),
      indicadoresRepository.alertaEstoque(),
    ]);

    return { resumo, serie, canais, status, produtos, clientes, atendimentoCanais, estoque };
  },
};
