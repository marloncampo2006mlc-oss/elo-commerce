/**
 * Ícones desenhados em SVG, herdando cor e tamanho do texto.
 *
 * Emoji parecia solução rápida, mas cada sistema desenha o seu: no
 * macOS o 👁 vem colorido e com proporção própria, o que destoava do
 * traço fino da tela de login. Um path próprio fica coerente.
 */
export function Olho({ aberto }: { aberto: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {!aberto && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  );
}
