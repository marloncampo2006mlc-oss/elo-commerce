'use client';

import { useEffect, useRef } from 'react';

/**
 * Neve caindo, desenhada em canvas.
 *
 * Canvas em vez de centenas de elementos animados por CSS: cada floco
 * seria um nó no DOM para o navegador recalcular a cada quadro. Aqui é
 * um único elemento, e a quantidade de flocos acompanha o tamanho da
 * tela em vez de ser fixa.
 */
export function Neve() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Quem pediu menos movimento não recebe animação nenhuma.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let largura = 0;
    let altura = 0;
    let flocos: Array<{
      x: number; y: number; raio: number; velocidade: number;
      deriva: number; fase: number; opacidade: number;
    }> = [];

    const criarFlocos = () => {
      // Densidade proporcional à área: telas grandes não ficam vazias
      // nem telas pequenas viram tempestade.
      const quantidade = Math.round((largura * altura) / 16000);
      flocos = Array.from({ length: Math.min(quantidade, 180) }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        raio: Math.random() * 1.9 + 0.5,
        velocidade: Math.random() * 0.42 + 0.14,
        deriva: Math.random() * 0.45 + 0.12,
        fase: Math.random() * Math.PI * 2,
        opacidade: Math.random() * 0.55 + 0.22,
      }));
    };

    const redimensionar = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      criarFlocos();
    };

    redimensionar();
    window.addEventListener('resize', redimensionar);

    let quadro = 0;
    let tempo = 0;

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);
      tempo += 0.01;

      for (const floco of flocos) {
        floco.y += floco.velocidade;
        // O seno dá o balanço lateral: neve não cai em linha reta.
        floco.x += Math.sin(tempo + floco.fase) * floco.deriva * 0.5;

        if (floco.y > altura + 5) {
          floco.y = -5;
          floco.x = Math.random() * largura;
        }
        if (floco.x > largura + 5) floco.x = -5;
        if (floco.x < -5) floco.x = largura + 5;

        ctx.beginPath();
        ctx.arc(floco.x, floco.y, floco.raio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${floco.opacidade})`;
        ctx.fill();
      }

      quadro = requestAnimationFrame(desenhar);
    };

    desenhar();

    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('resize', redimensionar);
    };
  }, []);

  return <canvas ref={canvasRef} className="neve" aria-hidden="true" />;
}
