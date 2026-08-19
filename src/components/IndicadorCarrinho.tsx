'use client';

import Link from 'next/link';
import { useCarrinho } from './Carrinho';

export function IndicadorCarrinho() {
  const { quantidade } = useCarrinho();

  return (
    <Link href="/carrinho" className="btn btn--sm" aria-label={`Carrinho com ${quantidade} item(ns)`}>
      🛒 <span style={{ fontVariantNumeric: 'tabular-nums' }}>{quantidade}</span>
    </Link>
  );
}
