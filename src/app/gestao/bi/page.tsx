import { indicadoresService } from '@/modules/indicadores/indicadores.service';
import { filtroSchema, intervaloSql } from '@/modules/indicadores/indicadores.schema';
import { BarraGestao } from '@/components/BarraGestao';
import { PainelBI } from '@/components/gestao/PainelBI';

export const dynamic = 'force-dynamic';

export default async function BI({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const { periodo } = filtroSchema.parse({ periodo: parametros.periodo });

  const dados = await indicadoresService.completo(periodo);

  return (
    <>
      <BarraGestao titulo="BI / Supervisão"
                   subtitulo={`Indicadores de ${intervaloSql(periodo).rotulo}`} />
      <div className="pagina">
        <PainelBI dados={JSON.parse(JSON.stringify(dados))} periodo={periodo} />
      </div>
    </>
  );
}
