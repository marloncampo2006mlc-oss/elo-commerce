/**
 * Contrato do fluxo conversacional.
 *
 * O mesmo formato é produzido pelo editor visual (React Flow) e
 * consumido pelo motor no servidor. Por isso vive num módulo neutro:
 * nem o editor nem o motor é dono do formato.
 */

export const TIPOS_NO = [
  'inicio',
  'mensagem',
  'pergunta',
  'menu',
  'condicao',
  'buscar_produtos',
  'consultar_pedido',
  'transferir',
  'finalizar',
] as const;

export type TipoNo = (typeof TIPOS_NO)[number];

export interface OpcaoMenu {
  id: string;
  rotulo: string;
}

export interface DadosNo {
  /** mensagem, pergunta, transferir, finalizar */
  texto?: string;
  /** pergunta: nome da variável onde a resposta é guardada */
  variavel?: string;
  /** menu: alternativas apresentadas */
  opcoes?: OpcaoMenu[];
  /** condicao: `variavel` compara com `valor` usando `operador` */
  operador?: 'igual' | 'diferente' | 'contem' | 'preenchido' | 'maior' | 'menor';
  valor?: string;
  /** buscar_produtos: termo fixo ou {{variavel}}; limite de resultados */
  termo?: string;
  limite?: number;
  /** rótulo livre exibido no canvas */
  titulo?: string;
}

export interface No {
  id: string;
  tipo: TipoNo;
  posicao: { x: number; y: number };
  dados: DadosNo;
}

export interface Aresta {
  id: string;
  origem: string;
  destino: string;
  /** Saída específica: id da opção do menu, ou 'sim'/'nao' na condição. */
  saida?: string | null;
}

export interface Fluxo {
  nodes: No[];
  edges: Aresta[];
}

export const FLUXO_VAZIO: Fluxo = { nodes: [], edges: [] };

/** Contexto acumulado da conversa: respostas e dados coletados. */
export type Contexto = Record<string, string>;

/** Uma fala produzida pelo motor. */
export interface Fala {
  autor: 'bot' | 'sistema';
  texto: string;
  opcoes?: OpcaoMenu[];
}

/** Resultado de um turno de conversa. */
export interface ResultadoTurno {
  falas: Fala[];
  noAtual: string | null;
  contexto: Contexto;
  aguardandoEntrada: boolean;
  /** Preenchido quando o fluxo pede transferência ou encerramento. */
  desfecho: 'transferir' | 'finalizar' | null;
}

/** O que um executor devolve ao motor. */
export interface SaidaExecutor {
  falas: Fala[];
  /** Interrompe a cadeia e espera a próxima mensagem do cliente. */
  aguardaEntrada?: boolean;
  /** Escolhe explicitamente por qual saída seguir (menu/condição). */
  saida?: string;
  /** Novas variáveis a gravar no contexto. */
  contexto?: Contexto;
  desfecho?: 'transferir' | 'finalizar';
  /** Repete o nó atual (entrada inválida) em vez de avançar. */
  repetir?: boolean;
}

/** Dependências injetadas: é por aqui que o executor toca o banco. */
export interface DependenciasExecutor {
  buscarProdutos(termo: string, limite: number): Promise<Array<{
    nome: string; preco: number; categoria: string;
  }>>;
  consultarPedido(numero: number): Promise<{
    numero: number; status: string; total: number; criadoEm: Date; clienteNome: string;
  } | null>;
}

export interface EntradaExecutor {
  no: No;
  /** Texto digitado ou id da opção escolhida. Null na primeira entrada no nó. */
  entrada: string | null;
  contexto: Contexto;
  deps: DependenciasExecutor;
}

export type Executor = (entrada: EntradaExecutor) => Promise<SaidaExecutor> | SaidaExecutor;

/** Substitui {{variavel}} pelo valor do contexto. */
export function interpolar(texto: string, contexto: Contexto): string {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_correspondencia, chave: string) =>
    contexto[chave] ?? '');
}

export const moeda = (valor: number): string =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
