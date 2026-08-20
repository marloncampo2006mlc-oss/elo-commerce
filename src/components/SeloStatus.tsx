const CORES: Record<string, string> = {
  ativo: 'verde', inativo: 'cinza', prospect: 'ciano',
  rascunho: 'cinza', aguardando_pagamento: 'ambar', pago: 'violeta',
  enviado: 'ciano', entregue: 'verde', cancelado: 'vermelho',
  em_andamento: 'ambar', aguardando_atendente: 'vermelho', em_atendimento: 'violeta',
  finalizado: 'verde', resolvido: 'verde', transferido: 'violeta', abandonado: 'cinza',
};

export const ROTULOS: Record<string, string> = {
  aguardando_pagamento: 'aguardando pgto',
  aguardando_atendente: 'na fila',
  em_atendimento: 'em atendimento',
  em_andamento: 'com o bot',
  ura: 'URA', whatsapp: 'WhatsApp',
};

/** Estado sempre em forma + cor: dá para ler a tabela sem ler o texto. */
export function SeloStatus({ valor }: { valor: string }) {
  return (
    <span className={`selo selo--${CORES[valor] ?? 'cinza'}`}>
      {ROTULOS[valor] ?? valor.replace(/_/g, ' ')}
    </span>
  );
}
