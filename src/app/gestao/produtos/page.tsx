import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';
import { BarraGestao } from '@/components/BarraGestao';
import { TabelaProdutos } from '@/components/gestao/TabelaProdutos';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

export default async function ProdutosGestao({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAcesso('catalogo.ver');

  const parametros = await searchParams;
  const filtros = listarProdutosSchema.parse({
    busca: parametros.busca,
    categoria: parametros.categoria,
    pagina: parametros.pagina,
    limite: 20,
  });

  const [pagina, categorias] = await Promise.all([
    catalogoService.listar(filtros),
    catalogoService.categorias(),
  ]);

  return (
    <>
      <BarraGestao titulo="Produtos" subtitulo={`${pagina.total} itens no catálogo`} />
      <div className="pagina">
        <TabelaProdutos
          produtos={pagina.itens}
          categorias={categorias.map((c) => c.categoria)}
          total={pagina.total}
        />
      </div>
    </>
  );
}
