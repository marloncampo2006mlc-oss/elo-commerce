import { atendimentoService } from '@/modules/atendimento/atendimento.service';
import { BarraGestao } from '@/components/BarraGestao';
import { Desk } from '@/components/gestao/Desk';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

export default async function Atendimento() {
  await exigirAcesso('atendimento.atender');

  const [fila, historico] = await Promise.all([
    atendimentoService.fila(),
    atendimentoService.historico(20),
  ]);

  const aguardando = fila.filter((item) => item.status === 'aguardando_atendente').length;

  return (
    <>
      <BarraGestao
        titulo="Atendimento"
        subtitulo={aguardando > 0
          ? `${aguardando} cliente(s) aguardando na fila`
          : 'Nenhum cliente aguardando'}
      />
      <div className="pagina pagina--cheia">
        <Desk
          filaInicial={JSON.parse(JSON.stringify(fila))}
          historicoInicial={JSON.parse(JSON.stringify(historico))}
        />
      </div>
    </>
  );
}
