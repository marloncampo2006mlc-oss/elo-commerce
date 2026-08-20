/**
 * Cenário noturno do login, desenhado em SVG.
 *
 * Feito à mão em vez de usar uma ilustração pronta: nenhum arquivo
 * externo para carregar, escala sem perder nitidez em qualquer tela e
 * as cores saem dos mesmos tokens da marca.
 */
export function CenarioLogin() {
  // Posições fixas: geradas aleatoriamente cintilariam a cada render.
  const estrelas = [
    [6, 12, 1.1, 0.9], [14, 26, 0.8, 0.5], [21, 8, 1.3, 0.8], [28, 19, 0.7, 0.4],
    [35, 31, 1.0, 0.7], [42, 11, 0.9, 0.6], [49, 24, 1.2, 0.85], [56, 7, 0.8, 0.5],
    [63, 18, 1.1, 0.75], [71, 29, 0.7, 0.45], [78, 13, 1.0, 0.65], [85, 22, 0.9, 0.55],
    [92, 9, 1.2, 0.8], [11, 38, 0.8, 0.45], [33, 42, 0.7, 0.35], [67, 39, 0.9, 0.5],
    [88, 35, 0.8, 0.4], [45, 4, 0.7, 0.5], [59, 33, 0.6, 0.35], [95, 27, 0.9, 0.6],
  ] as const;

  return (
    <svg className="cenario" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ceu" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#150c33" />
          <stop offset="45%" stopColor="#3a1d6e" />
          <stop offset="100%" stopColor="#6d4aff" />
        </linearGradient>

        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff5d6" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff5d6" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#17c4e0" stopOpacity="0" />
          <stop offset="50%" stopColor="#17c4e0" stopOpacity=".22" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>

        {/* Montanhas do fundo para a frente: mais escuras conforme se aproximam */}
        <linearGradient id="serra1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c2d8f" /><stop offset="100%" stopColor="#2d1a5e" />
        </linearGradient>
        <linearGradient id="serra2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33205f" /><stop offset="100%" stopColor="#1d1240" />
        </linearGradient>
        <linearGradient id="serra3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1140" /><stop offset="100%" stopColor="#0f0a26" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill="url(#ceu)" />

      {estrelas.map(([x, y, raio, opacidade], indice) => (
        <circle key={indice} cx={x} cy={y} r={raio * 0.22} fill="#fff" opacity={opacidade}>
          <animate attributeName="opacity"
                   values={`${opacidade};${opacidade * 0.35};${opacidade}`}
                   dur={`${3 + (indice % 4)}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* lua */}
      <circle cx="76" cy="17" r="11" fill="url(#halo)" />
      <circle cx="76" cy="17" r="4.2" fill="#fdf6e0" />
      <circle cx="74.2" cy="15.6" r="0.9" fill="#e8dcc0" opacity=".55" />
      <circle cx="77.6" cy="18.8" r="0.6" fill="#e8dcc0" opacity=".45" />

      <path d="M0 30 Q25 22 50 29 T100 24 L100 34 Q75 29 50 36 T0 38 Z" fill="url(#aurora)">
        <animateTransform attributeName="transform" type="translate"
                          values="0 0; 0 2.5; 0 0" dur="14s" repeatCount="indefinite" />
      </path>

      {/* serras */}
      <path d="M0 62 L13 47 L23 57 L34 42 L48 60 L58 50 L70 63 L82 52 L100 66 L100 100 L0 100 Z"
            fill="url(#serra1)" opacity=".85" />
      <path d="M0 72 L11 60 L24 71 L38 56 L52 70 L66 59 L79 72 L92 63 L100 71 L100 100 L0 100 Z"
            fill="url(#serra2)" />
      <path d="M0 84 L16 73 L30 82 L45 71 L61 83 L76 74 L90 84 L100 78 L100 100 L0 100 Z"
            fill="url(#serra3)" />

      {/* neve nos picos */}
      <path d="M34 42 L38 47 L36 47.6 L34.5 46.5 L32.5 47.8 L30 47 Z" fill="#fff" opacity=".55" />
      <path d="M38 56 L41.5 60.6 L39.6 61.2 L38.2 60.2 L36.4 61.4 L34.4 60.6 Z"
            fill="#fff" opacity=".38" />

      {/* reflexo suave no vale */}
      <ellipse cx="50" cy="99" rx="46" ry="7" fill="#a78bfa" opacity=".14" />
    </svg>
  );
}
