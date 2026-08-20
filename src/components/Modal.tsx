'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal renderizado em portal, direto no <body>.
 *
 * Isto não é preciosismo: `position: fixed` deixa de se referir à janela
 * quando algum ancestral tem `transform`, `filter` ou `backdrop-filter` —
 * esse ancestral vira o bloco de contenção. A barra da gestão usa
 * backdrop-filter, então um modal declarado dentro dela era posicionado
 * em relação à barra e aparecia colado no topo, cortado.
 *
 * O portal tira o modal da árvore visual e resolve o problema na raiz,
 * em vez de compensar com z-index ou margens mágicas.
 */
export function Modal({ titulo, largo = false, aoFechar, children }: {
  titulo: string;
  largo?: boolean;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Esc fecha, e a rolagem do fundo trava enquanto o modal está aberto.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);

    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = rolagemAnterior;
    };
  }, [aoFechar]);

  if (!montado) return null;   // portal só existe no cliente

  return createPortal(
    <div className="modal" role="presentation">
      <div className="modal__fundo" onClick={aoFechar} />
      <div className={`modal__caixa ${largo ? 'modal__caixa--largo' : ''}`}
           role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal__topo">
          <h2>{titulo}</h2>
          <button className="btn btn--sm btn--fantasma" style={{ marginLeft: 'auto' }}
                  onClick={aoFechar} aria-label="Fechar">✕</button>
        </header>
        <div className="modal__corpo">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Variante em painel lateral, para conteúdo que acompanha uma lista. */
export function PainelLateral({ titulo, cabecalho, aoFechar, children }: {
  titulo: string;
  cabecalho?: ReactNode;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  if (!montado) return null;

  return createPortal(
    <div className="modal" role="presentation">
      <div className="modal__fundo" onClick={aoFechar} />
      <aside className="painel-lateral" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal__topo">
          {cabecalho ?? <h2>{titulo}</h2>}
          <button className="btn btn--sm btn--fantasma" style={{ marginLeft: 'auto' }}
                  onClick={aoFechar} aria-label="Fechar">✕</button>
        </header>
        <div className="modal__corpo">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
