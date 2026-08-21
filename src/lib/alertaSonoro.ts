/**
 * Bipe curto para avisar o atendente de conversa nova.
 *
 * Sintetizado na hora em vez de tocar um arquivo: um .mp3 seria mais um
 * download, mais um asset para versionar e mais uma coisa para falhar em
 * produção. Dois tons curtos são inconfundíveis e custam nada.
 *
 * O AudioContext é criado sob demanda e reaproveitado — navegadores
 * bloqueiam áudio antes da primeira interação da pessoa com a página, e
 * abrir um contexto por bipe estouraria o limite do navegador.
 */

type ComAudioLegado = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (contexto) return contexto;

  const Construtor = window.AudioContext ?? (globalThis as ComAudioLegado).webkitAudioContext;
  if (!Construtor) return null;

  contexto = new Construtor();
  return contexto;
}

export function tocarAlerta(): void {
  try {
    const ctx = obterContexto();
    if (!ctx) return;

    // Suspenso é o estado normal antes de qualquer clique na página.
    if (ctx.state === 'suspended') void ctx.resume();

    [0, 0.16].forEach((atraso, indice) => {
      const oscilador = ctx.createOscillator();
      const volume = ctx.createGain();

      oscilador.type = 'sine';
      oscilador.frequency.value = indice === 0 ? 880 : 1174;

      // A rampa evita o "clique" que um corte seco no volume produz.
      const inicio = ctx.currentTime + atraso;
      volume.gain.setValueAtTime(0.0001, inicio);
      volume.gain.exponentialRampToValueAtTime(0.18, inicio + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.13);

      oscilador.connect(volume).connect(ctx.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.14);
    });
  } catch {
    // Som é conforto, não função: se o navegador recusar, a fila
    // continua funcionando com o aviso visual.
  }
}
