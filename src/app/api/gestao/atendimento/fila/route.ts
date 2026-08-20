import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { exigirPrivilegio } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

export const GET = comTratamentoDeErro(async () => {
  await exigirPrivilegio('atendimento.atender');
  const [fila, historico] = await Promise.all([
    atendimentoService.fila(),
    atendimentoService.historico(20),
  ]);
  return ok({ fila, historico });
});
