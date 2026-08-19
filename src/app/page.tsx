import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';

/**
 * Vitrine — Server Component: a consulta roda no servidor e o HTML já
 * chega pronto ao navegador, sem passar credencial de banco ao cliente.
 */
export default async function Vitrine() {
  const filtros = listarProdutosSchema.parse({ limite: 12, ordem: 'nome' });
  const { itens, total } = await catalogoService.vitrine(filtros);

  const moeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <main style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Elo Store</h1>
      <p style={{ opacity: 0.6, marginBottom: 24 }}>
        {total} produto(s) disponíveis — dados reais vindos do PostgreSQL
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {itens.map((produto) => (
          <article key={produto.id} style={{
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, overflow: 'hidden',
          }}>
            {produto.imagem?.startsWith('/') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt={produto.nome}
                   style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{produto.categoria}</div>
              <div style={{ fontWeight: 600, margin: '4px 0' }}>{produto.nome}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{moeda(produto.preco)}</div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
