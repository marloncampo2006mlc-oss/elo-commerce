/**
 * Ícones da loja, em traço fino e herdando a cor do texto.
 *
 * Todos com o mesmo grid de 24 e a mesma espessura, para que fiquem
 * coerentes entre si — é o que emoji não consegue dar, já que cada
 * sistema desenha o seu com peso e proporção próprios.
 */

type Props = { tamanho?: number };

const base = (tamanho: number) => ({
  width: tamanho,
  height: tamanho,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconeCarrinho = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h2.2l2.1 11.3a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H5.3" />
  </svg>
);

export const IconeBusca = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const IconeFiltro = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const IconeCaixa = ({ tamanho = 22 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M21 8.2v7.6a1.6 1.6 0 0 1-.9 1.4l-7.3 3.6a1.6 1.6 0 0 1-1.6 0L3.9 17.2a1.6 1.6 0 0 1-.9-1.4V8.2a1.6 1.6 0 0 1 .9-1.4l7.3-3.6a1.6 1.6 0 0 1 1.6 0l7.3 3.6a1.6 1.6 0 0 1 .9 1.4Z" />
    <path d="m3.3 7.4 8.7 4.3 8.7-4.3M12 21v-9.3" />
  </svg>
);

export const IconeEscudo = ({ tamanho = 22 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M12 22s8-3.6 8-9.6V5.6L12 2.4 4 5.6v6.8C4 18.4 12 22 12 22Z" />
    <path d="m8.8 12.2 2.2 2.2 4.2-4.4" />
  </svg>
);

export const IconeHeadset = ({ tamanho = 22 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M20 15.4a2.4 2.4 0 0 1-2.4 2.4h-.4a1.2 1.2 0 0 1-1.2-1.2v-3.4a1.2 1.2 0 0 1 1.2-1.2h2.8Z" />
    <path d="M4 15.4a2.4 2.4 0 0 0 2.4 2.4h.4a1.2 1.2 0 0 0 1.2-1.2v-3.4A1.2 1.2 0 0 0 6.8 12H4Z" />
    <path d="M20 17.4v.8a3.2 3.2 0 0 1-3.2 3.2H13" />
  </svg>
);

export const IconeGestao = ({ tamanho = 17 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="3" y="3" width="7.4" height="7.4" rx="1.6" />
    <rect x="13.6" y="3" width="7.4" height="7.4" rx="1.6" />
    <rect x="3" y="13.6" width="7.4" height="7.4" rx="1.6" />
    <rect x="13.6" y="13.6" width="7.4" height="7.4" rx="1.6" />
  </svg>
);

/** Assistente: usado no botão flutuante do chat. */
export const IconeAssistente = ({ tamanho = 26 }: Props) => (
  <svg {...base(tamanho)} strokeWidth={1.5}>
    <rect x="4" y="7.5" width="16" height="12" rx="3.4" />
    <path d="M12 7.5V4.4M9.6 3h4.8" />
    <circle cx="9.2" cy="13.2" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="13.2" r="1.15" fill="currentColor" stroke="none" />
    <path d="M9.8 16.6h4.4" />
    <path d="M2 12.4v2.6M22 12.4v2.6" />
  </svg>
);

/**
 * Marca do Google, nas quatro cores oficiais.
 *
 * É o único ícone do projeto com cor fixa, e de propósito: as diretrizes
 * de marca do Google não permitem recolorir o logotipo, então ele não
 * acompanha o tema como os outros.
 */
export const IconeGoogle = ({ tamanho = 19 }: Props) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.5-9.5 6.5-16.5Z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.8C8 41.3 15.4 46 24 46Z" />
    <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.8H4.3C2.8 17 2 20.4 2 24s.8 7 2.3 9.9l7.3-5.8Z" />
    <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.3 14.1l7.3 5.8c1.7-5.2 6.6-9.1 12.4-9.1Z" />
  </svg>
);
