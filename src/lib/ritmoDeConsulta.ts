/**
 * De quanto em quanto tempo consultar o servidor.
 *
 * A aplicação roda em funções serverless, que não mantêm conexão aberta
 * — WebSocket funcionaria na máquina de desenvolvimento e quebraria em
 * produção. Consultar em intervalo é o caminho honesto aqui; o que dá a
 * sensação de tempo real é o intervalo ser curto ENQUANTO a conversa
 * está viva, e não ser curto o tempo todo.
 *
 * Por isso dois valores. Com a aba à vista e alguém do outro lado
 * esperando resposta, quase dois segundos passam por instantâneo. Com a
 * aba escondida ninguém está lendo: manter o ritmo curto só gastaria
 * invocação de função e bateria.
 */

/** Conversa aberta e visível: a resposta do outro lado precisa chegar. */
export const RITMO_ATIVO = 1_800;

/** Aba escondida ou conversa parada: presença, não urgência. */
export const RITMO_OCIOSO = 15_000;

/** Fila de atendimento: chegada nova pode esperar alguns segundos. */
export const RITMO_FILA = 5_000;

/**
 * O documento está à vista?
 *
 * Fora do navegador (renderização no servidor) devolve `true`: assumir
 * que está escondido faria o primeiro intervalo nascer lento e a
 * conversa começar travada.
 */
export const abaVisivel = (): boolean =>
  typeof document === 'undefined' || document.visibilityState === 'visible';
