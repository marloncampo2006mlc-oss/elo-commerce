/**
 * Ilustração do estado sem conversa aberta.
 *
 * Desenhada aqui em vez de importada como imagem: é uma peça só, some
 * assim que qualquer conversa é selecionada, e um arquivo externo seria
 * mais um download e mais um asset para versionar. Em SVG ela também
 * acompanha o tema, porque herda as cores por currentColor e tokens.
 *
 * `aria-hidden` porque o texto ao lado já diz o que a tela está
 * esperando — anunciar a figura seria repetir a mesma informação.
 */
export function IlustracaoVazio({ tamanho = 168 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho * 0.72} viewBox="0 0 240 172"
         fill="none" aria-hidden="true">
      {/* Halo de fundo, bem discreto: dá volume sem competir com o texto. */}
      <ellipse cx="120" cy="92" rx="96" ry="66" fill="currentColor" opacity=".05" />

      {/* Balão grande — a conversa que ainda não existe. */}
      <path d="M52 44h96a14 14 0 0 1 14 14v44a14 14 0 0 1-14 14H88l-22 18v-18h-14a14 14 0 0 1-14-14V58a14 14 0 0 1 14-14Z"
            fill="currentColor" opacity=".12" />
      <path d="M52 44h96a14 14 0 0 1 14 14v44a14 14 0 0 1-14 14H88l-22 18v-18h-14a14 14 0 0 1-14-14V58a14 14 0 0 1 14-14Z"
            stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />

      {/* Três pontos: o sinal universal de "alguém vai falar aqui". */}
      <circle cx="82" cy="80" r="6" fill="currentColor" opacity=".38" />
      <circle cx="100" cy="80" r="6" fill="currentColor" opacity=".28" />
      <circle cx="118" cy="80" r="6" fill="currentColor" opacity=".18" />

      {/* Balão menor atrás, sugerindo troca e não monólogo. */}
      <path d="M150 26h44a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10h-30l-14 12V72h-.5a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10Z"
            fill="currentColor" opacity=".08" />
    </svg>
  );
}
