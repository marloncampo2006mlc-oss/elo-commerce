import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';
import { CardProduto } from '@/components/CardProduto';
import { FiltrosVitrine } from '@/components/FiltrosVitrine';
import { HeroLoja } from '@/components/loja/HeroLoja';

export const dynamic = 'force-dynamic';

/**
 * Vitrine — Server Component: a consulta roda no servidor e o HTML chega
 * pronto, sem expor credencial de banco nem lógica de filtro ao cliente.
 */
export default async function Vitrine({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;

  const filtros = listarProdutosSchema.parse({
    busca: parametros.busca,
    categoria: parametros.categoria,
    ordem: parametros.ordem ?? 'nome',
    limite: 60,
  });

  const [{ itens }, categorias] = await Promise.all([
    catalogoService.vitrine(filtros),
    catalogoService.categorias(),
  ]);

  // Faixa de preço é filtro de apresentação: aplicá-lo aqui evita
  // inflar o schema do catálogo com um parâmetro que só a vitrine usa.
  const faixa = typeof parametros.faixa === 'string' ? parametros.faixa : '';
  const [minimo, maximo] = faixa.split('-');
  const visiveis = faixa
    ? itens.filter((produto) =>
        produto.preco >= Number(minimo || 0)
        && produto.preco <= Number(maximo || Number.MAX_SAFE_INTEGER))
    : itens;

  return (
    <>
      <HeroLoja />

      <FiltrosVitrine categorias={categorias.map((categoria) => categoria.categoria)} />

      {visiveis.length === 0 ? (
        <div className="cartao">
          <div className="vazio">
            <div className="vazio__icone">🔎</div>
            <strong>Nada encontrado</strong>
            <p>Tente outra busca ou categoria.</p>
          </div>
        </div>
      ) : (
        <div className="vitrine">
          {visiveis.map((produto) => <CardProduto key={produto.id} produto={produto} />)}
        </div>
      )}
    </>
  );
}
