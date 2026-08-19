import { redirect } from 'next/navigation';
import { lerSessao } from '@/lib/sessao';
import { catalogoService } from '@/modules/catalogo/catalogo.service';
import { listarProdutosSchema } from '@/modules/catalogo/catalogo.schema';

/**
 * Página protegida. A checagem acontece no servidor, antes de qualquer
 * renderização — o HTML da gestão nunca chega a quem não tem sessão.
 */
export default async function Painel() {
  const sessao = await lerSessao();
  if (!sessao) redirect('/login');

  const { total } = await catalogoService.listar(listarProdutosSchema.parse({ limite: 1 }));

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22 }}>Painel da gestão</h1>
      <p style={{ opacity: 0.6, marginTop: 4 }}>
        {sessao.nome} · <strong>{sessao.papel}</strong> · {sessao.email}
      </p>

      <div style={{
        marginTop: 24, padding: 20, borderRadius: 14,
        border: '1px solid rgba(255,255,255,.1)',
      }}>
        <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase' }}>Catálogo</div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{total}</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>produtos cadastrados</div>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, opacity: 0.5 }}>
        Fase 1 concluída: base Next + TypeScript, domínio portado e autenticação real.
        A separação completa entre loja e gestão vem na Fase 2.
      </p>
    </main>
  );
}
