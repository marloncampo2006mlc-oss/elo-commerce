'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Entrega as falas do bot uma a uma, com o indicador de digitação entre
 * elas, em vez de despejar o turno inteiro de uma vez.
 *
 * Vale só para o bot. Fala de atendente humano aparece na hora — ele já
 * digitou de verdade, e atrasá-la seria encenar espera numa conversa
 * entre duas pessoas.
 *
 * Um turno do motor costuma render mais de uma fala — saudação, pergunta
 * e menu chegam juntos na mesma resposta. Mostrar tudo no mesmo quadro
 * faz o chat parecer um despejo de texto: a pessoa não sabe por onde
 * começar a ler e perde a noção de que houve uma conversa.
 *
 * A encenação é só de apresentação. As mensagens já vieram do servidor e
 * estão todas em memória — nada é buscado durante a espera, e recarregar
 * a página mostra a conversa inteira na hora.
 */

export interface MensagemEntregavel {
  id: string;
  autor: string;
  conteudo: string;
}

/**
 * Quanto tempo "digitar" uma fala.
 *
 * Proporcional ao tamanho, porque um "ok" instantâneo e um parágrafo
 * instantâneo destoam do mesmo jeito. O teto existe para que um texto
 * longo não vire espera real — passado certo ponto ninguém mais lê a
 * animação como digitação, lê como travamento.
 */
export function tempoDeDigitacao(texto: string): number {
  return Math.min(1400, Math.max(400, 280 + texto.length * 16));
}

/**
 * Genérico no tipo da mensagem para devolver o MESMO objeto que entrou —
 * quem chama continua enxergando seus próprios campos (as opções do
 * menu, por exemplo) em vez de uma versão reduzida ao mínimo que o hook
 * precisa ler.
 */
export function useEntregaGradual<M extends MensagemEntregavel>(mensagens: M[]) {
  const [entregues, setEntregues] = useState(0);
  const [digitando, setDigitando] = useState(false);

  /**
   * Quantidade a exibir de imediato, sem encenação.
   *
   * Usado ao retomar uma conversa já existente: reencenar um histórico
   * de vinte mensagens faria a pessoa esperar por algo que ela já leu.
   * É um ref, e não estado, porque precisa valer no mesmo ciclo em que
   * as mensagens chegam — um estado só valeria no ciclo seguinte, e a
   * animação já teria começado.
   */
  const pularRef = useRef<number | null>(null);
  const entregarSemAnimacao = (quantidade: number) => { pularRef.current = quantidade; };

  useEffect(() => {
    // Conversa trocada ou reiniciada: recomeça do que existe agora.
    if (mensagens.length < entregues) { setEntregues(mensagens.length); return; }
    if (mensagens.length === entregues) { setDigitando(false); return; }

    if (pularRef.current !== null) {
      const ate = Math.min(pularRef.current, mensagens.length);
      pularRef.current = null;
      setEntregues(ate);
      return;
    }

    const proxima = mensagens[entregues];
    if (!proxima) return;

    /**
     * Só a fala do BOT é encenada.
     *
     * A do cliente já foi escrita por ele, aviso de sistema não
     * "digita", e a do atendente é uma pessoa real do outro lado — que
     * já digitou de verdade. Segurar a mensagem dela para simular
     * digitação seria atrasar de propósito uma conversa entre duas
     * pessoas, o oposto do que o indicador promete.
     */
    if (proxima.autor !== 'bot') {
      setEntregues(entregues + 1);
      return;
    }

    setDigitando(true);
    const relogio = setTimeout(() => {
      setDigitando(false);
      setEntregues((atual) => atual + 1);
    }, tempoDeDigitacao(proxima.conteudo));

    return () => clearTimeout(relogio);
  }, [mensagens, entregues]);

  return {
    visiveis: mensagens.slice(0, entregues),
    /** Ainda há fala represada: o campo de opções não deve aparecer. */
    entregando: entregues < mensagens.length,
    digitando,
    entregarSemAnimacao,
  };
}
