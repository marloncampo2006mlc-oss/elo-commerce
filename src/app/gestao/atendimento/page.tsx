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

  return (
    <>
      {/*
        O subtítulo não conta ninguém de propósito.
        Ele é renderizado no servidor, uma vez, enquanto a fila se
        atualiza a cada 5s no navegador — o número congelava e passava a
        contradizer a lista logo abaixo. A contagem viva fica na aba
        "Fila" e no título do navegador, que acompanham o polling.
      */}
      <BarraGestao
        titulo="Atendimento"
        subtitulo="Quem está esperando e as conversas em andamento"
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
