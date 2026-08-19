import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';
import { CardProduto } from '@/components/CardProduto';
import { FiltrosVitrine } from '@/components/FiltrosVitrine';

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

  return (
    <>
      <section className="hero">
        <h1>Equipe sua operação de ponta a ponta</h1>
        <p>
          Headsets, telefonia IP, redes e videoconferência com pronta entrega.
          Precisa de ajuda? Fale com nosso assistente no canto da tela — ele consulta
          seu pedido e busca produtos no catálogo.
        </p>
      </section>

      <FiltrosVitrine categorias={categorias.map((categoria) => categoria.categoria)} />

      {itens.length === 0 ? (
        <div className="cartao">
          <div className="vazio">
            <div className="vazio__icone">🔎</div>
            <strong>Nada encontrado</strong>
            <p>Tente outra busca ou categoria.</p>
          </div>
        </div>
      ) : (
        <div className="vitrine">
          {itens.map((produto) => <CardProduto key={produto.id} produto={produto} />)}
        </div>
      )}
    </>
  );
}
