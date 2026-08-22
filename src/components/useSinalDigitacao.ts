'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Envia presença de digitação sem fazer uma requisição por tecla.
 * O servidor mantém o sinal por poucos segundos; este hook o renova
 * enquanto houver uma mensagem sendo preparada e só o desliga quando
 * ela for enviada, apagada ou quando a conversa sair da tela.
 */
export function useSinalDigitacao(endpoint: string | null) {
  const relogioRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enviar = useCallback((digitando: boolean) => {
    if (!endpoint) return;
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digitando }),
      keepalive: !digitando,
    }).catch(() => {
      // Presença é informação efêmera: a expiração no servidor garante
      // a limpeza mesmo quando esta requisição não chega.
    });
  }, [endpoint]);

  const parar = useCallback(() => {
    if (relogioRef.current) clearInterval(relogioRef.current);
    relogioRef.current = null;
    enviar(false);
  }, [enviar]);

  const sinalizar = useCallback(() => {
    if (!endpoint || relogioRef.current) return;

    enviar(true);
    // Continua renovando mesmo durante uma pausa na escrita. Assim os
    // três pontos permanecem até a mensagem ser efetivamente enviada.
    relogioRef.current = setInterval(() => enviar(true), 1_500);
  }, [endpoint, enviar]);

  useEffect(() => parar, [parar]);

  return { sinalizar, parar };
}
