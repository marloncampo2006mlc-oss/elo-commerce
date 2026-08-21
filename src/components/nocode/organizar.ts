import type { Edge, Node } from '@xyflow/react';

/**
 * Reorganiza o fluxo em colunas, da esquerda para a direita.
 *
 * O canvas aceita o bloco onde a pessoa soltar, e depois de meia dúzia
 * de edições o desenho vira um emaranhado: arestas cruzadas, blocos
 * sobrepostos, nada indicando por onde a conversa começa. Arrumar isso à
 * mão é trabalho manual que o próprio grafo já sabe fazer.
 *
 * A ideia é a de um layout em camadas: a distância até o início define a
 * coluna, e dentro da coluna os blocos se empilham. Assim a leitura
 * acompanha o sentido da conversa — quem começa fica à esquerda, quem
 * termina à direita.
 *
 * Não é um algoritmo de minimizar cruzamentos: isso exigiria uma
 * biblioteca de layout inteira para um ganho que este tamanho de fluxo
 * não justifica. Aqui o objetivo é sair do emaranhado, não a perfeição
 * tipográfica.
 */

/** Medidas casadas com o CSS do bloco no canvas. */
const LARGURA = 240;
const ALTURA = 108;
const VAO_X = 90;
const VAO_Y = 34;

export function organizarFluxo(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const saidas = new Map<string, string[]>();
  const temEntrada = new Set<string>();

  for (const aresta of edges) {
    saidas.set(aresta.source, [...(saidas.get(aresta.source) ?? []), aresta.target]);
    temEntrada.add(aresta.target);
  }

  /**
   * De onde a leitura começa.
   *
   * O bloco de início é a raiz natural. Sem ele — fluxo em construção —
   * servem os blocos que ninguém aponta. Se nem isso existir, o grafo é
   * todo cíclico e qualquer nó serve de âncora: melhor um começo
   * arbitrário do que devolver tudo empilhado na origem.
   */
  const raizes = nodes.filter((no) => (no.data as { tipo?: string }).tipo === 'inicio');
  const semEntrada = nodes.filter((no) => !temEntrada.has(no.id));
  const inicio = raizes.length > 0 ? raizes
    : semEntrada.length > 0 ? semEntrada
      : [nodes[0]!];

  /**
   * Largura primeiro, guardando o MENOR nível de cada bloco.
   *
   * Menor e não maior porque o fluxo tem ciclos por natureza — um menu
   * que volta ao início é desenho comum. Perseguir o caminho mais longo
   * nunca terminaria; a primeira visita já dá uma coluna estável.
   */
  const nivel = new Map<string, number>();
  const fila: Array<{ id: string; profundidade: number }> = [];

  for (const raiz of inicio) {
    nivel.set(raiz.id, 0);
    fila.push({ id: raiz.id, profundidade: 0 });
  }

  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const destino of saidas.get(atual.id) ?? []) {
      if (nivel.has(destino)) continue;
      nivel.set(destino, atual.profundidade + 1);
      fila.push({ id: destino, profundidade: atual.profundidade + 1 });
    }
  }

  // Blocos que nenhuma aresta alcança ainda são trabalho em andamento:
  // ficam numa coluna própria à direita, visíveis e fora do caminho.
  const maiorNivel = Math.max(0, ...nivel.values());
  for (const no of nodes) {
    if (!nivel.has(no.id)) nivel.set(no.id, maiorNivel + 1);
  }

  const colunas = new Map<number, Node[]>();
  for (const no of nodes) {
    const coluna = nivel.get(no.id) ?? 0;
    colunas.set(coluna, [...(colunas.get(coluna) ?? []), no]);
  }

  const alturaMaxima = Math.max(
    ...[...colunas.values()].map((coluna) => coluna.length)) * (ALTURA + VAO_Y);

  return nodes.map((no) => {
    const coluna = nivel.get(no.id) ?? 0;
    // A ordem dentro da coluna segue o Y atual: quem estava em cima
    // continua em cima, e a reorganização não embaralha o que a pessoa
    // já tinha memorizado da própria tela.
    const naColuna = (colunas.get(coluna) ?? [])
      .slice()
      .sort((a, b) => a.position.y - b.position.y);

    const indice = naColuna.findIndex((item) => item.id === no.id);
    const alturaDaColuna = naColuna.length * (ALTURA + VAO_Y);

    return {
      ...no,
      position: {
        x: coluna * (LARGURA + VAO_X),
        // Centraliza cada coluna: colunas curtas ficam alinhadas ao
        // meio das longas, em vez de todas grudadas no topo.
        y: (alturaMaxima - alturaDaColuna) / 2 + indice * (ALTURA + VAO_Y),
      },
    };
  });
}
