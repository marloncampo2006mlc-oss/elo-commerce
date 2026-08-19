import { EXECUTORES } from './executores';
import {
  FLUXO_VAZIO,
  type Aresta,
  type Contexto,
  type DependenciasExecutor,
  type Fala,
  type Fluxo,
  type No,
  type ResultadoTurno,
} from './tipos';

/**
 * Motor de execução do fluxo conversacional.
 *
 * Recebe o fluxo desenhado no No-Code, o nó em que a conversa parou e a
 * entrada do cliente; devolve as falas do bot e onde a conversa para
 * agora. Não conhece banco nem HTTP: as consultas chegam por `deps`,
 * o que torna o motor testável sem infraestrutura.
 */

/** Trava contra fluxo em ciclo: um grafo A→B→A não pode travar o servidor. */
const MAX_SALTOS = 25;

export interface EntradaTurno {
  fluxo: Fluxo;
  noAtual: string | null;
  entrada: string | null;
  contexto: Contexto;
  deps: DependenciasExecutor;
}

const acharNo = (fluxo: Fluxo, id: string | null): No | undefined =>
  fluxo.nodes.find((no) => no.id === id);

/**
 * Escolhe a aresta de saída. Quando o executor indicou uma saída
 * específica (opção de menu, sim/não da condição), respeita; senão,
 * pega a primeira saída sem rótulo.
 */
function proximaAresta(fluxo: Fluxo, noId: string, saida?: string): Aresta | undefined {
  const candidatas = fluxo.edges.filter((aresta) => aresta.origem === noId);
  if (saida !== undefined) {
    return candidatas.find((aresta) => aresta.saida === saida);
  }
  return candidatas.find((aresta) => !aresta.saida) ?? candidatas[0];
}

export function acharNoInicial(fluxo: Fluxo): No | undefined {
  return fluxo.nodes.find((no) => no.tipo === 'inicio') ?? fluxo.nodes[0];
}

/**
 * Executa um turno completo: encadeia nós automáticos até chegar em um
 * que precise de resposta, ou até o fluxo terminar.
 */
export async function executarTurno({
  fluxo, noAtual, entrada, contexto, deps,
}: EntradaTurno): Promise<ResultadoTurno> {
  const grafo = fluxo ?? FLUXO_VAZIO;
  const falas: Fala[] = [];
  let contextoAtual: Contexto = { ...contexto };
  let desfecho: ResultadoTurno['desfecho'] = null;

  let atual = acharNo(grafo, noAtual) ?? acharNoInicial(grafo);
  if (!atual) {
    return {
      falas: [{ autor: 'sistema', texto: 'Este atendimento ainda não tem um fluxo publicado.' }],
      noAtual: null,
      contexto: contextoAtual,
      aguardandoEntrada: false,
      desfecho: null,
    };
  }

  // A entrada do cliente alimenta apenas o primeiro nó do turno; os
  // seguintes rodam automaticamente.
  let entradaPendente = entrada;

  for (let salto = 0; salto < MAX_SALTOS; salto += 1) {
    const executor = EXECUTORES[atual.tipo];
    if (!executor) {
      falas.push({ autor: 'sistema', texto: `Bloco desconhecido: ${atual.tipo}` });
      break;
    }

    const saida = await executor({
      no: atual,
      entrada: entradaPendente,
      contexto: contextoAtual,
      deps,
    });

    falas.push(...saida.falas);
    if (saida.contexto) contextoAtual = { ...contextoAtual, ...saida.contexto };
    if (saida.desfecho) desfecho = saida.desfecho;

    // Parou esperando o cliente: o nó continua sendo o atual.
    if (saida.aguardaEntrada) {
      return {
        falas,
        noAtual: atual.id,
        contexto: contextoAtual,
        aguardandoEntrada: true,
        desfecho,
      };
    }

    if (desfecho) {
      return { falas, noAtual: atual.id, contexto: contextoAtual, aguardandoEntrada: false, desfecho };
    }

    const aresta = proximaAresta(grafo, atual.id, saida.saida);
    const proximo = aresta ? acharNo(grafo, aresta.destino) : undefined;

    if (!proximo) {
      // Fim de caminho sem bloco Finalizar: encerra sem erro.
      return { falas, noAtual: atual.id, contexto: contextoAtual, aguardandoEntrada: false, desfecho };
    }

    atual = proximo;
    entradaPendente = null;   // só o primeiro nó do turno consome a entrada
  }

  falas.push({
    autor: 'sistema',
    texto: 'O fluxo excedeu o limite de passos e foi interrompido para evitar repetição infinita.',
  });
  return { falas, noAtual: atual.id, contexto: contextoAtual, aguardandoEntrada: false, desfecho };
}

/* ------------------------------------------------------------------ */
/* Validação — roda antes de publicar                                  */
/* ------------------------------------------------------------------ */

export interface ProblemaFluxo {
  noId: string | null;
  mensagem: string;
}

/**
 * Impede publicar um fluxo quebrado. É melhor recusar aqui do que
 * descobrir o problema com um cliente real conversando.
 */
export function validarFluxo(fluxo: Fluxo): ProblemaFluxo[] {
  const problemas: ProblemaFluxo[] = [];
  const nodes = fluxo.nodes ?? [];
  const edges = fluxo.edges ?? [];

  const iniciais = nodes.filter((no) => no.tipo === 'inicio');
  if (iniciais.length === 0) problemas.push({ noId: null, mensagem: 'O fluxo precisa de um bloco Início.' });
  if (iniciais.length > 1) problemas.push({ noId: null, mensagem: 'Há mais de um bloco Início.' });
  if (nodes.length < 2) problemas.push({ noId: null, mensagem: 'O fluxo precisa de ao menos um bloco além do Início.' });

  const idsValidos = new Set(nodes.map((no) => no.id));
  for (const aresta of edges) {
    if (!idsValidos.has(aresta.origem) || !idsValidos.has(aresta.destino)) {
      problemas.push({ noId: null, mensagem: 'Existe uma conexão apontando para um bloco inexistente.' });
    }
  }

  const terminais = new Set(['transferir', 'finalizar']);

  for (const no of nodes) {
    const saidas = edges.filter((aresta) => aresta.origem === no.id);
    const rotulo = no.dados.titulo || no.tipo;

    if (!terminais.has(no.tipo) && saidas.length === 0) {
      problemas.push({ noId: no.id, mensagem: `O bloco "${rotulo}" não leva a lugar nenhum.` });
    }

    if (no.tipo === 'menu') {
      const opcoes = no.dados.opcoes ?? [];
      if (opcoes.length === 0) {
        problemas.push({ noId: no.id, mensagem: `O menu "${rotulo}" não tem nenhuma opção.` });
      }
      for (const opcao of opcoes) {
        if (!saidas.some((aresta) => aresta.saida === opcao.id)) {
          problemas.push({
            noId: no.id,
            mensagem: `A opção "${opcao.rotulo}" do menu "${rotulo}" não está conectada.`,
          });
        }
      }
    }

    if (no.tipo === 'condicao') {
      for (const caminho of ['sim', 'nao'] as const) {
        if (!saidas.some((aresta) => aresta.saida === caminho)) {
          problemas.push({
            noId: no.id,
            mensagem: `A condição "${rotulo}" não tem saída para "${caminho}".`,
          });
        }
      }
      if (!no.dados.variavel?.trim()) {
        problemas.push({ noId: no.id, mensagem: `A condição "${rotulo}" não define qual variável comparar.` });
      }
    }

    if (no.tipo === 'pergunta' && !no.dados.variavel?.trim()) {
      problemas.push({ noId: no.id, mensagem: `A pergunta "${rotulo}" não define onde guardar a resposta.` });
    }
  }

  // Alcançabilidade: bloco que ninguém consegue atingir é lixo silencioso.
  const inicial = acharNoInicial(fluxo);
  if (inicial) {
    const alcancados = new Set<string>([inicial.id]);
    const fila = [inicial.id];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      for (const aresta of edges.filter((e) => e.origem === atual)) {
        if (!alcancados.has(aresta.destino)) {
          alcancados.add(aresta.destino);
          fila.push(aresta.destino);
        }
      }
    }
    for (const no of nodes) {
      if (!alcancados.has(no.id)) {
        problemas.push({
          noId: no.id,
          mensagem: `O bloco "${no.dados.titulo || no.tipo}" não é alcançável a partir do Início.`,
        });
      }
    }
  }

  return problemas;
}
