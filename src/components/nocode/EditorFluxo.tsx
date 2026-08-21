'use client';

import {
  addEdge, Background, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { TIPOS_NO, type Fluxo, type TipoNo } from '@/chatbot/tipos';
import { useToast } from '@/components/Toasts';
import { ESTILO_BLOCO, NoCanvas, type DadosNoCanvas } from './NoCanvas';
import { PainelPropriedades } from './PainelPropriedades';
import { PainelTeste } from './PainelTeste';
import { organizarFluxo } from './organizar';
import {
  IconeAjustar, IconeAlerta, IconeBlocos, IconeCheck, IconeDepurar,
  IconeDisquete, IconeOrganizar, IconePublicar, IconeVoltar,
} from '@/components/Icones';

interface Props {
  botId: string;
  botNome: string;
  versaoId: string;
  versao: number;
  fluxoInicial: Fluxo;
  publicada: boolean;
}

/** Converte o formato do banco para o do React Flow, e vice-versa. */
const paraCanvas = (fluxo: Fluxo): { nodes: Node[]; edges: Edge[] } => ({
  nodes: fluxo.nodes.map((no) => ({
    id: no.id,
    type: 'elo',
    position: no.posicao,
    data: { tipo: no.tipo, ...no.dados } as DadosNoCanvas,
  })),
  edges: fluxo.edges.map((aresta) => ({
    id: aresta.id,
    source: aresta.origem,
    target: aresta.destino,
    sourceHandle: aresta.saida ?? null,
    animated: true,
  })),
});

const paraBanco = (nodes: Node[], edges: Edge[]): Fluxo => ({
  nodes: nodes.map((no) => {
    const { tipo, ...dados } = no.data as DadosNoCanvas;
    return { id: no.id, tipo, posicao: no.position, dados };
  }),
  edges: edges.map((aresta) => ({
    id: aresta.id,
    origem: aresta.source,
    destino: aresta.target,
    saida: aresta.sourceHandle ?? null,
  })),
});

function Editor(props: Props) {
  const inicial = useMemo(() => paraCanvas(props.fluxoInicial), [props.fluxoInicial]);
  const [nodes, setNodes, onNodesChange] = useNodesState(inicial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(inicial.edges);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [depurando, setDepurando] = useState(false);
  const [sujo, setSujo] = useState(false);

  /** Paleta aberta por padrão: é de onde saem os blocos. */
  const [mostrarBlocos, setMostrarBlocos] = useState(true);

  /** Bloco onde o depurador parou, destacado no canvas. */
  const [noEmExecucao, setNoEmExecucao] = useState<string | null>(null);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const { sucesso, erro } = useToast();
  const contadorRef = useRef(0);

  const marcarSujo = useCallback(() => setSujo(true), []);

  const conectar = useCallback((conexao: Connection) => {
    setEdges((atuais) => addEdge({ ...conexao, animated: true }, atuais));
    marcarSujo();
  }, [setEdges, marcarSujo]);

  /** Soltar um bloco da paleta cria o nó na posição do cursor. */
  const soltar = useCallback((evento: React.DragEvent) => {
    evento.preventDefault();
    const tipo = evento.dataTransfer.getData('application/elo-bloco') as TipoNo;
    if (!tipo || !TIPOS_NO.includes(tipo)) return;

    contadorRef.current += 1;
    const id = `${tipo}_${Date.now().toString(36)}_${contadorRef.current}`;

    const padroes: Record<string, DadosNoCanvas> = {
      mensagem: { tipo, texto: 'Escreva aqui a mensagem.' },
      pergunta: { tipo, texto: 'O que você quer perguntar?', variavel: 'resposta' },
      menu: { tipo, texto: 'Escolha uma opção:', opcoes: [
        { id: 'opcao1', rotulo: 'Primeira opção' },
        { id: 'opcao2', rotulo: 'Segunda opção' },
      ]},
      condicao: { tipo, variavel: 'resposta', operador: 'igual', valor: '' },
      buscar_produtos: { tipo, termo: '', limite: 3 },
      consultar_pedido: { tipo, termo: '{{pedido}}' },
      transferir: { tipo, texto: 'Vou te transferir para um atendente.' },
      finalizar: { tipo, texto: 'Obrigado pelo contato!' },
    };

    setNodes((atuais) => atuais.concat({
      id,
      type: 'elo',
      position: screenToFlowPosition({ x: evento.clientX, y: evento.clientY }),
      data: padroes[tipo] ?? { tipo },
    }));
    setSelecionado(id);
    marcarSujo();
  }, [screenToFlowPosition, setNodes, marcarSujo]);

  /**
   * Reposiciona tudo em colunas e reenquadra a tela.
   *
   * Não salva sozinho: reorganizar é uma decisão visual, e gravar sem
   * pedir tiraria da pessoa a chance de desfazer com Ctrl+Z se não
   * gostar do resultado.
   */
  const organizar = useCallback(() => {
    setNodes((atuais) => organizarFluxo(atuais, edges));
    marcarSujo();
    // Espera o React pintar as posições novas antes de enquadrar,
    // senão o fitView mede o desenho antigo.
    setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 60);
    sucesso('Fluxo organizado', 'Blocos alinhados em colunas, do início ao fim');
  }, [edges, setNodes, marcarSujo, fitView, sucesso]);

  const atualizarNo = useCallback((id: string, dados: Partial<DadosNoCanvas>) => {
    setNodes((atuais) => atuais.map((no) =>
      no.id === id ? { ...no, data: { ...no.data, ...dados } } : no));
    marcarSujo();
  }, [setNodes, marcarSujo]);

  const removerNo = useCallback((id: string) => {
    setNodes((atuais) => atuais.filter((no) => no.id !== id));
    setEdges((atuais) => atuais.filter((a) => a.source !== id && a.target !== id));
    setSelecionado(null);
    marcarSujo();
  }, [setNodes, setEdges, marcarSujo]);

  async function salvar(): Promise<boolean> {
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/gestao/bots/${props.botId}/versoes/${props.versaoId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fluxo: paraBanco(nodes, edges) }),
        },
      );
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha ao salvar');

      setProblemas((corpo.data.problemas ?? []).map((p: { mensagem: string }) => p.mensagem));
      setSujo(false);
      sucesso('Fluxo salvo', `Versão ${props.versao} (rascunho)`);
      return true;
    } catch (falha) {
      erro('Não foi possível salvar', falha instanceof Error ? falha.message : 'Erro inesperado');
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function publicar() {
    if (!(await salvar())) return;

    const resposta = await fetch(`/api/gestao/bots/${props.botId}/publicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versaoId: props.versaoId }),
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      const detalhes = (corpo.detalhes ?? []) as Array<{ mensagem: string }>;
      setProblemas(detalhes.map((detalhe) => detalhe.mensagem));
      erro('Publicação recusada', corpo.erro ?? 'O fluxo tem problemas');
      return;
    }

    sucesso('Fluxo publicado', 'O chat da loja já está usando esta versão');
    window.location.reload();
  }

  const noSelecionado = nodes.find((no) => no.id === selecionado) ?? null;

  /** O canvas recebe o destaque do depurador como dado do próprio nó. */
  const nosNoCanvas = useMemo(
    () => nodes.map((no) => ({
      ...no,
      data: { ...no.data, emExecucao: no.id === noEmExecucao },
      className: no.id === noEmExecucao ? 'no-flow--executando' : undefined,
    })),
    [nodes, noEmExecucao],
  );

  const valido = problemas.length === 0;

  return (
    <div className="estudio">
      {/* Barra própria do estúdio. A da gestão foi deixada de fora desta
          tela: aqui o assunto é um documento, não uma seção do sistema —
          o que importa é o nome do fluxo, o estado dele e o caminho de
          volta. */}
      <header className="estudio__topo">
        <Link href="/gestao/no-code" className="estudio__voltar" aria-label="Voltar para os chatbots">
          <IconeVoltar />
        </Link>

        <div className="estudio__identidade">
          <strong>{props.botNome}</strong>
          <span>
            versão {props.versao} · rascunho
            {sujo ? ' · não salvo' : ' · salvo'}
          </span>
        </div>

        {/* Números do fluxo à vista, como um verificador: dá para
            perceber que uma aresta sumiu sem precisar procurar no canvas. */}
        <div className="estudio__medidas">
          <span><b>{nodes.length}</b> blocos</span>
          <span><b>{edges.length}</b> conexões</span>
          <span className={valido ? 'estudio__selo estudio__selo--ok' : 'estudio__selo estudio__selo--erro'}>
            {valido ? <IconeCheck tamanho={13} /> : <IconeAlerta tamanho={13} />}
            {valido ? 'fluxo válido' : `${problemas.length} problema(s)`}
          </span>
        </div>

        <div className="estudio__acoes">
          <button className="btn btn--sm" onClick={() => void salvar()} disabled={salvando}>
            <IconeDisquete tamanho={15} /> {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <button className="btn btn--sm btn--primario" onClick={() => void publicar()}>
            <IconePublicar tamanho={15} /> Publicar
          </button>
        </div>
      </header>

      <div className="estudio__area">
        {mostrarBlocos && (
          <aside className="estudio__blocos">
            <div className="lateral__grupo" style={{ paddingTop: 0 }}>Blocos</div>
            <p className="dim" style={{ fontSize: 11.5, marginBottom: 10 }}>
              Arraste para o canvas
            </p>
            {TIPOS_NO.filter((tipo) => tipo !== 'inicio').map((tipo) => {
              const estilo = ESTILO_BLOCO[tipo];
              return (
                <div key={tipo} className="bloco-arrastavel" draggable
                     onDragStart={(evento) => {
                       evento.dataTransfer.setData('application/elo-bloco', tipo);
                       evento.dataTransfer.effectAllowed = 'move';
                     }}>
                  <span style={{ color: estilo.cor }} aria-hidden="true">{estilo.icone}</span>
                  {estilo.rotulo}
                </div>
              );
            })}

            {problemas.length > 0 && (
              <>
                <div className="lateral__grupo">Impedem publicar</div>
                {problemas.map((problema, indice) => (
                  <div key={indice} className="problema">
                    <IconeAlerta tamanho={14} /> {problema}
                  </div>
                ))}
              </>
            )}
          </aside>
        )}

        <div className="estudio__canvas"
             onDrop={soltar}
             onDragOver={(evento) => {
               evento.preventDefault();
               evento.dataTransfer.dropEffect = 'move';
             }}>
          <ReactFlow
            nodes={nosNoCanvas}
            edges={edges}
            onNodesChange={(mudancas) => { onNodesChange(mudancas); marcarSujo(); }}
            onEdgesChange={(mudancas) => { onEdgesChange(mudancas); marcarSujo(); }}
            onConnect={conectar}
            onNodeClick={(_evento, no) => setSelecionado(no.id)}
            onPaneClick={() => setSelecionado(null)}
            nodeTypes={{ elo: NoCanvas }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} color="var(--borda)" />
            <MiniMap pannable zoomable className="estudio__mapa" />
          </ReactFlow>

          {/* Ferramentas flutuando sobre o canvas, e não numa coluna:
              são ações sobre o desenho, então ficam perto dele. */}
          <div className="ferramentas" role="toolbar" aria-label="Ferramentas do fluxo">
            <button className={`ferramenta ${mostrarBlocos ? 'ferramenta--ativa' : ''}`}
                    onClick={() => setMostrarBlocos((atual) => !atual)}
                    title="Mostrar ou esconder os blocos"
                    aria-pressed={mostrarBlocos}>
              <IconeBlocos /> <span>Blocos</span>
            </button>

            <button className="ferramenta" onClick={organizar}
                    title="Alinhar os blocos em colunas, do início ao fim">
              <IconeOrganizar /> <span>Organizar</span>
            </button>

            <button className={`ferramenta ${depurando ? 'ferramenta--ativa' : ''}`}
                    onClick={async () => {
                      if (depurando) { setDepurando(false); setNoEmExecucao(null); return; }
                      if (sujo) await salvar();
                      setDepurando(true);
                    }}
                    title="Percorrer o fluxo vendo o bloco atual e as variáveis"
                    aria-pressed={depurando}>
              <IconeDepurar /> <span>Depurar</span>
            </button>

            <span className="ferramentas__divisor" aria-hidden="true" />

            <button className="ferramenta" onClick={() => fitView({ duration: 300, padding: 0.15 })}
                    title="Enquadrar o fluxo na tela">
              <IconeAjustar /> <span>Enquadrar</span>
            </button>
          </div>

          {depurando && (
            <PainelTeste
              botId={props.botId}
              versaoId={props.versaoId}
              aoMudarNo={setNoEmExecucao}
              aoFechar={() => { setDepurando(false); setNoEmExecucao(null); }}
            />
          )}
        </div>

        {/* O painel de propriedades só aparece com um bloco selecionado.
            Antes ficava sempre ali, ocupando 300px para dizer "selecione
            um bloco" — espaço tirado justamente do canvas. */}
        {noSelecionado && (
          <aside className="estudio__props">
            <PainelPropriedades
              no={noSelecionado}
              aoAlterar={atualizarNo}
              aoRemover={removerNo}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export function EditorFluxo(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
