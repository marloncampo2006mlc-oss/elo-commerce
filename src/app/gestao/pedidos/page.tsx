import { pedidosService } from '@/modules/pedidos/pedidos.service';
import { listarPedidosSchema } from '@/modules/pedidos/pedidos.schema';
import { BarraGestao } from '@/components/BarraGestao';
import { TabelaPedidos } from '@/components/gestao/TabelaPedidos';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

export default async function PedidosGestao({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAcesso('pedidos.ver');

  const parametros = await searchParams;
  const pagina = await pedidosService.listar(listarPedidosSchema.parse({
    status: parametros.status,
    canal: parametros.canal,
    limite: 25,
  }));

  return (
    <>
      <BarraGestao titulo="Pedidos" subtitulo={`${pagina.total} pedidos registrados`} />
      <div className="pagina">
        <TabelaPedidos pedidos={pagina.itens} />
      </div>
    </>
  );
}
