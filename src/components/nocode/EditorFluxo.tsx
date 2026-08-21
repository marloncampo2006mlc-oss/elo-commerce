'use client';

import {
  addEdge, Background, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { TIPOS_NO, type Fluxo, type TipoNo } from '@/chatbot/tipos';
import { useToast } from '@/components/Toasts';
import { ESTILO_BLOCO, NoCanvas, type DadosNoCanvas } from './NoCanvas';
import { PainelPropriedades } from './PainelPropriedades';
import { PainelTeste } from './PainelTeste';
import { IconeAlerta } from '@/components/Icones';

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
  const [testando, setTestando] = useState(false);
  const [sujo, setSujo] = useState(false);

  const { screenToFlowPosition } = useReactFlow();
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

  return (
    <div className="editor">
      <aside className="editor__blocos">
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

      <div className="editor__canvas"
           onDrop={soltar}
           onDragOver={(evento) => { evento.preventDefault(); evento.dataTransfer.dropEffect = 'move'; }}>
        <ReactFlow
          nodes={nodes}
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
          <Controls />
          <MiniMap pannable zoomable style={{ background: 'var(--superficie)' }} />
        </ReactFlow>

        {testando && (
          <PainelTeste
            botId={props.botId}
            versaoId={props.versaoId}
            aoFechar={() => setTestando(false)}
          />
        )}
      </div>

      <aside className="editor__props">
        <div className="flex entre" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 650, fontSize: 14 }}>{props.botNome}</div>
            <div className="dim" style={{ fontSize: 11.5 }}>
              versão {props.versao} · rascunho {sujo && '· não salvo'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button className="btn btn--sm" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <button className="btn btn--sm" onClick={async () => {
            if (sujo) await salvar();
            setTestando(true);
          }}>
            Testar
          </button>
          <button className="btn btn--sm btn--primario" onClick={() => void publicar()}>
            Publicar
          </button>
        </div>

        <PainelPropriedades
          no={noSelecionado}
          aoAlterar={atualizarNo}
          aoRemover={removerNo}
        />
      </aside>
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
