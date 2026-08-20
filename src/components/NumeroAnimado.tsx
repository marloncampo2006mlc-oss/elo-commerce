'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Número que transita até o novo valor em vez de trocar de uma vez.
 *
 * Serve para deixar visível QUE algo mudou: ao alternar o período do BI,
 * um salto seco passa despercebido, enquanto a contagem chama o olho
 * para o indicador que se moveu.
 *
 * Respeita prefers-reduced-motion: quem pediu menos animação recebe o
 * valor direto.
 */
export function NumeroAnimado({ valor, formatar, duracao = 750 }: {
  valor: number;
  formatar: (valor: number) => string;
  duracao?: number;
}) {
  const [exibido, setExibido] = useState(valor);
  const anteriorRef = useRef(valor);
  const quadroRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const inicio = anteriorRef.current;
    const destino = valor;
    anteriorRef.current = valor;

    if (inicio === destino) return;

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) { setExibido(destino); return; }

    const comeco = performance.now();

    // easeOutCubic: acelera no início e desacelera no fim, que é como o
    // olho espera que um número "assente".
    const suavizar = (t: number) => 1 - (1 - t) ** 3;

    const animar = (agora: number) => {
      const progresso = Math.min((agora - comeco) / duracao, 1);
      setExibido(inicio + (destino - inicio) * suavizar(progresso));
      if (progresso < 1) quadroRef.current = requestAnimationFrame(animar);
    };

    quadroRef.current = requestAnimationFrame(animar);
    return () => { if (quadroRef.current) cancelAnimationFrame(quadroRef.current); };
  }, [valor, duracao]);

  return <>{formatar(exibido)}</>;
}
