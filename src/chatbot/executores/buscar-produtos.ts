import { interpolar, moeda, type Executor } from '../tipos';

/**
 * Consulta o catálogo real e devolve os resultados em texto.
 *
 * O termo pode ser fixo ou vir do contexto via {{variavel}} — é assim
 * que o bloco se liga a uma pergunta anterior.
 */
export const buscarProdutos: Executor = async ({ no, contexto, deps }) => {
  const termo = interpolar(no.dados.termo ?? '', contexto).trim();
  const limite = Math.min(Math.max(no.dados.limite ?? 3, 1), 10);

  const produtos = await deps.buscarProdutos(termo, limite);

  if (produtos.length === 0) {
    return {
      falas: [{
        autor: 'bot',
        texto: termo
          ? `Não encontrei nada para "${termo}" no momento.`
          : 'No momento não temos itens disponíveis em estoque.',
      }],
      contexto: { produtos_encontrados: '0' },
    };
  }

  const lista = produtos
    .map((produto) => `• ${produto.nome} — ${moeda(produto.preco)}`)
    .join('\n');

  return {
    falas: [{
      autor: 'bot',
      texto: `${termo ? `Encontrei isto para "${termo}"` : 'Nossos destaques'}:\n\n${lista}`,
    }],
    contexto: { produtos_encontrados: String(produtos.length) },
  };
};
