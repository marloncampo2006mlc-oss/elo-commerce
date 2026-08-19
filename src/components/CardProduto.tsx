'use client';

import { moeda } from '@/lib/formato';
import { useCarrinho } from './Carrinho';
import { useToast } from './Toasts';

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
        {temImagem
          ? <img src={produto.imagem!} alt={produto.nome} loading="lazy" />
          : <span style={{ fontSize: 42 }}>{produto.imagem ?? '📦'}</span>}
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
        <div className="produto__nome">{produto.nome}</div>
        <p className="produto__desc">{produto.descricao}</p>

        <div className="produto__rodape">
          <div className="produto__preco">
            {moeda(produto.preco)}
            <small>em até 10x sem juros</small>
          </div>
          <button
            className="btn btn--primario btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              const coube = adicionar({
                id: produto.id, nome: produto.nome, preco: produto.preco,
                imagem: produto.imagem, estoque: produto.estoque,
              });
              if (coube) sucesso('Adicionado ao carrinho', produto.nome);
              else erro('Estoque insuficiente', `Só temos ${produto.estoque} unidade(s).`);
            }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
