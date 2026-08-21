'use client';

import { moeda } from '@/lib/formato';
import { useCarrinho } from './Carrinho';
import { useToast } from './Toasts';
import { IconeCarrinho } from './loja/IconesLoja';
import { IconeCaixa } from '@/components/Icones';

export interface ProdutoVitrine {
  id: string; nome: string; descricao: string | null; categoria: string;
  preco: number; estoque: number; imagem: string | null;
}

export function CardProduto({ produto }: { produto: ProdutoVitrine }) {
  const { adicionar } = useCarrinho();
  const { sucesso, erro } = useToast();

  const temImagem = produto.imagem?.startsWith('/') || produto.imagem?.startsWith('http');

  return (
    <article className="produto">
      <div className="produto__capa">
        {/* Halo atrás do produto: destaca a peça sem precisar recortar
            a imagem nem usar fundo branco no card escuro. */}
        <span className="produto__halo" aria-hidden="true" />
        {temImagem
          ? <img src={produto.imagem!} alt={produto.nome} loading="lazy" />
          : <span className="produto__vazio" aria-hidden="true"><IconeCaixa tamanho={40} /></span>}

        {produto.estoque <= 5 && (
          <span className="produto__tag">
            <span className="selo selo--ambar">últimas unidades</span>
          </span>
        )}
      </div>

      <div className="produto__corpo">
        <span className="selo selo--violeta" style={{ alignSelf: 'flex-start' }}>
          {produto.categoria}
        </span>

        <h3 className="produto__nome">{produto.nome}</h3>
        <p className="produto__desc">{produto.descricao}</p>

        <div className="produto__rodape">
          <div className="produto__preco">
            {moeda(produto.preco)}
            <small>em até 10x sem juros</small>
          </div>

          <button
            className="btn btn--primario produto__acao"
            onClick={() => {
              const coube = adicionar({
                id: produto.id, nome: produto.nome, preco: produto.preco,
                imagem: produto.imagem, estoque: produto.estoque,
              });
              if (coube) sucesso('Adicionado ao carrinho', produto.nome);
              else erro('Estoque insuficiente', `Só temos ${produto.estoque} unidade(s).`);
            }}
          >
            Adicionar <IconeCarrinho tamanho={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
