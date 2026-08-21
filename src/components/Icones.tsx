/**
 * Conjunto de ícones da gestão.
 *
 * Mesmo grid de 24 e mesma espessura para todos, herdando cor e tamanho
 * do contexto. É o que emoji não entrega: cada sistema desenha o seu com
 * peso e proporção próprios, então uma fileira de emojis nunca fica
 * alinhada entre si.
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

/* ------------------------------ tema ------------------------------ */

export const IconeSol = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconeLua = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />
  </svg>
);

/* ------------------------------ ações ----------------------------- */

export const IconeEnviar = ({ tamanho = 17 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M21.5 12 3 4.8l2.4 7.2L3 19.2 21.5 12Z" />
    <path d="M5.4 12h16.1" />
  </svg>
);

export const IconeFechar = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconeCheck = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconeMenos = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M5.5 12h13" />
  </svg>
);

export const IconeAtualizar = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
    <path d="M20.5 4v5h-5" />
  </svg>
);

/* ------------------------------ objetos --------------------------- */

export const IconePrancheta = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
    <path d="M8 6H6.5A1.5 1.5 0 0 0 5 7.5v11A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 6H16" />
    <path d="M9 11h6M9 15h4" />
  </svg>
);

export const IconeCaixa = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20.5 8.2 12 4 3.5 8.2v7.6L12 20l8.5-4.2V8.2Z" />
    <path d="m3.5 8.2 8.5 4.1 8.5-4.1M12 12.3V20" />
  </svg>
);

export const IconeCadeado = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="4.5" y="10" width="15" height="10" rx="2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);

export const IconeSino = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconeSinoCortado = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M18 9a6 6 0 0 0-9.3-5" />
    <path d="M6.1 6.1A6 6 0 0 0 6 9c0 5-2 6.5-2 6.5h12" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    <path d="m3 3 18 18" />
  </svg>
);

/* --------------------- blocos do editor no-code -------------------- */

export const IconeIniciar = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M7 4.6 19 12 7 19.4V4.6Z" />
  </svg>
);

export const IconeBalao = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20 12.5a7 7 0 0 1-7 7H8l-4 3 1-4.4A7 7 0 0 1 11 5.5h2a7 7 0 0 1 7 7Z" />
  </svg>
);

export const IconeInterrogacao = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M9.2 9a2.9 2.9 0 1 1 3.9 2.7c-.7.3-1.1 1-1.1 1.8v.6" />
    <path d="M12 17.6h.01" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const IconeLista = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
  </svg>
);

export const IconeBifurcacao = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M12 20v-5.5" />
    <path d="M12 14.5 6.5 9.5V4M12 14.5 17.5 9.5V4" />
  </svg>
);

export const IconeParar = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const IconeHeadset = ({ tamanho = 15 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M4.5 13.5v-1.6a7.5 7.5 0 0 1 15 0v1.6" />
    <rect x="2.8" y="13" width="4" height="6" rx="1.6" />
    <rect x="17.2" y="13" width="4" height="6" rx="1.6" />
    <path d="M19.5 19v.6a2.4 2.4 0 0 1-2.4 2.4H13" />
  </svg>
);

export const IconeEnvelope = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

/* ------------------------------ navegação ------------------------- */

export const IconePainel = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="3" y="3" width="7.5" height="9" rx="1.8" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
    <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.8" />
  </svg>
);

export const IconeProdutos = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20.5 8.4v7.2a1.6 1.6 0 0 1-.85 1.4l-6.8 3.6a1.6 1.6 0 0 1-1.5 0l-6.8-3.6a1.6 1.6 0 0 1-.85-1.4V8.4a1.6 1.6 0 0 1 .85-1.4l6.8-3.6a1.6 1.6 0 0 1 1.5 0l6.8 3.6a1.6 1.6 0 0 1 .85 1.4Z" />
    <path d="m3.9 7.7 8.1 4.2 8.1-4.2M12 20.6v-8.7" />
  </svg>
);

export const IconePedidos = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M6.5 2.8h11a1.6 1.6 0 0 1 1.6 1.6v15.4a.9.9 0 0 1-1.35.78L15.4 19l-2.5 1.5a1.8 1.8 0 0 1-1.8 0L8.6 19l-2.35 1.58a.9.9 0 0 1-1.35-.78V4.4a1.6 1.6 0 0 1 1.6-1.6Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const IconeClientes = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M16.5 20v-1.7a3.4 3.4 0 0 0-3.4-3.4H6.9a3.4 3.4 0 0 0-3.4 3.4V20" />
    <circle cx="10" cy="7.6" r="3.4" />
    <path d="M20.5 20v-1.7a3.4 3.4 0 0 0-2.6-3.3M15.4 4.4a3.4 3.4 0 0 1 0 6.4" />
  </svg>
);

export const IconeFluxo = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="2.6" y="9.4" width="5.4" height="5.4" rx="1.4" />
    <rect x="16" y="3.4" width="5.4" height="5.4" rx="1.4" />
    <rect x="16" y="15.4" width="5.4" height="5.4" rx="1.4" />
    <path d="M8 12h3.6a1.4 1.4 0 0 0 1.4-1.4V7.5a1.4 1.4 0 0 1 1.4-1.4H16" />
    <path d="M8 12h3.6a1.4 1.4 0 0 1 1.4 1.4v3.1a1.4 1.4 0 0 0 1.4 1.4H16" />
  </svg>
);

export const IconeAtendimento = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M20.5 11.6a8.2 8.2 0 0 1-8.8 8.2 8.5 8.5 0 0 1-3.6-1L3.5 20.3l1.5-4.5a8.5 8.5 0 0 1-1-3.6 8.2 8.2 0 0 1 8.2-8.8h.6a8.2 8.2 0 0 1 7.7 7.7Z" />
  </svg>
);

export const IconeGrafico = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M3 3v16.5a1.5 1.5 0 0 0 1.5 1.5H21" />
    <path d="m7 14.5 3.6-4 3.2 2.8L20 6.5" />
  </svg>
);

export const IconeUsuarios = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M19 20v-1.7a3.4 3.4 0 0 0-3.4-3.4H8.4A3.4 3.4 0 0 0 5 18.3V20" />
    <circle cx="12" cy="7.6" r="3.6" />
  </svg>
);

export const IconeLoja = ({ tamanho = 18 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M3.6 9.5 5 4.4a1.6 1.6 0 0 1 1.55-1.2h10.9A1.6 1.6 0 0 1 19 4.4l1.4 5.1" />
    <path d="M4.5 9.5h15v9.3a1.6 1.6 0 0 1-1.6 1.6H6.1a1.6 1.6 0 0 1-1.6-1.6Z" />
    <path d="M3.6 9.5a3 3 0 0 0 5.6 0 3 3 0 0 0 5.6 0 3 3 0 0 0 5.6 0" />
  </svg>
);

/* ------------------------------ indicadores ----------------------- */

export const IconeDinheiro = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.6 9.1a2.7 2.7 0 0 0-2.6-1.6c-1.5 0-2.7.9-2.7 2.1 0 2.9 5.6 1.4 5.6 4.3 0 1.3-1.3 2.2-2.9 2.2a3 3 0 0 1-2.8-1.7" />
    <path d="M12 6v12" />
  </svg>
);

export const IconeCaixaAberta = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M3.4 8.6h17.2v9.8a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6Z" />
    <path d="M3.4 8.6 5.6 4.4h12.8l2.2 4.2M12 8.6v11.4" />
  </svg>
);

export const IconeRobo = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <rect x="4" y="7.6" width="16" height="12" rx="3.2" />
    <path d="M12 7.6V4.4M9.8 3h4.4" />
    <circle cx="9.2" cy="13.2" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="13.2" r="1.1" fill="currentColor" stroke="none" />
    <path d="M2 12.6v2.4M22 12.6v2.4" />
  </svg>
);

export const IconeChave = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="7.8" cy="15.8" r="3.6" />
    <path d="m10.6 13.4 8-8M16.4 7.6l2 2M14 10l1.8 1.8" />
  </svg>
);

export const IconeEscudoCheck = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M12 21s7.4-3.3 7.4-8.9V5.4L12 2.6 4.6 5.4v6.7C4.6 17.7 12 21 12 21Z" />
    <path d="m9.1 12.1 2 2 3.8-4" />
  </svg>
);

export const IconeAlerta = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M10.6 3.6 2.5 17.4a1.6 1.6 0 0 0 1.4 2.4h16.2a1.6 1.6 0 0 0 1.4-2.4L13.4 3.6a1.6 1.6 0 0 0-2.8 0Z" />
    <path d="M12 9v4M12 16.6h.01" />
  </svg>
);

export const IconeEngrenagem = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.6 14.6a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 0 1-3.6 0v-.1a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4a1.8 1.8 0 0 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06a1.8 1.8 0 1 1 2.55-2.55l.06.06a1.5 1.5 0 0 0 1.65.3H9.5a1.5 1.5 0 0 0 .9-1.37V4a1.8 1.8 0 0 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.08a1.5 1.5 0 0 0 1.37.9H20a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z" />
  </svg>
);

export const IconeRelogio = ({ tamanho = 20 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.8V12l3.4 1.9" />
  </svg>
);

export const IconeSair = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)}>
    <path d="M9.6 20.4H5.4a1.8 1.8 0 0 1-1.8-1.8V5.4a1.8 1.8 0 0 1 1.8-1.8h4.2" />
    <path d="m15.6 16.4 4.4-4.4-4.4-4.4M20 12H9.6" />
  </svg>
);

export const IconeBuscaG = ({ tamanho = 17 }: Props) => (
  <svg {...base(tamanho)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const IconeMais = ({ tamanho = 16 }: Props) => (
  <svg {...base(tamanho)} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
