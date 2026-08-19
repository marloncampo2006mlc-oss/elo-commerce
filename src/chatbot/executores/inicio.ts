import type { Executor } from '../tipos';

/** Ponto de entrada do fluxo: não fala nada, apenas segue adiante. */
export const inicio: Executor = () => ({ falas: [] });
