'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DadosNo, TipoNo } from '@/chatbot/tipos';

/** Aparência de cada tipo de bloco no canvas. */
export const ESTILO_BLOCO: Record<TipoNo, { icone: string; cor: string; rotulo: string }> = {
  inicio:           { icone: '▶', cor: '#16a34a', rotulo: 'Início' },
  mensagem:         { icone: '💬', cor: '#6d4aff', rotulo: 'Mensagem' },
  pergunta:         { icone: '❓', cor: '#0ea5e9', rotulo: 'Pergunta' },
  menu:             { icone: '☰', cor: '#d97706', rotulo: 'Menu' },
  condicao:         { icone: '⑂', cor: '#db2777', rotulo: 'Condição' },
  buscar_produtos:  { icone: '🔎', cor: '#17c4e0', rotulo: 'Buscar produtos' },
  consultar_pedido: { icone: '📦', cor: '#8b5cf6', rotulo: 'Consultar pedido' },
  transferir:       { icone: '🎧', cor: '#f59e0b', rotulo: 'Transferir' },
  finalizar:        { icone: '⏹', cor: '#dc2626', rotulo: 'Finalizar' },
};

/**
 * Dados do nó dentro do canvas: os mesmos do domínio, mais o `tipo`,
 * que o React Flow guarda junto de `data`. Estender DadosNo evita que
 * os tipos se soltem entre o editor e o motor.
 */
export interface DadosNoCanvas extends DadosNo, Record<string, unknown> {
  tipo: TipoNo;
}

/**
 * Nó visual. As alças (Handles) são o que o React Flow usa para conectar:
 * blocos com saídas múltiplas (menu, condição) expõem uma alça por
 * caminho, com o `id` igual ao valor gravado em `aresta.saida`.
 */
export function NoCanvas({ data, selected }: NodeProps) {
  const dados = data as DadosNoCanvas;
  const estilo = ESTILO_BLOCO[dados.tipo] ?? ESTILO_BLOCO.mensagem;

  const opcoes = dados.opcoes ?? [];
  const saidasCondicao = dados.tipo === 'condicao' ? ['sim', 'nao'] : [];
  const temSaidaUnica = !['menu', 'condicao', 'transferir', 'finalizar'].includes(dados.tipo);

  const resumo =
    dados.tipo === 'condicao'
      ? `${dados.variavel ?? '—'} ${dados.operador ?? 'igual'} ${dados.valor ?? ''}`
      : dados.tipo === 'buscar_produtos'
        ? `busca: ${dados.termo || 'destaques'}`
        : dados.tipo === 'consultar_pedido'
          ? `pedido: ${dados.termo || '{{pedido}}'}`
          : dados.texto;

  return (
    <div className={`no-flow ${selected ? 'no-flow--selecionado' : ''}`}>
      {dados.tipo !== 'inicio' && (
        <Handle type="target" position={Position.Left} style={{ background: estilo.cor }} />
      )}

      <div className="no-flow__topo" style={{ color: estilo.cor }}>
        <span aria-hidden="true">{estilo.icone}</span>
        <span>{dados.titulo || estilo.rotulo}</span>
      </div>

      {resumo && (
        <div className="no-flow__corpo">
          {String(resumo).slice(0, 90)}{String(resumo).length > 90 ? '…' : ''}
        </div>
      )}

      {dados.variavel && dados.tipo === 'pergunta' && (
        <div className="no-flow__corpo" style={{ paddingTop: 0 }}>
          <code style={{ fontSize: 10.5 }}>→ {`{{${dados.variavel}}}`}</code>
        </div>
      )}

      {/* Uma alça por opção do menu, alinhada à sua linha */}
      {opcoes.map((opcao, indice) => (
        <div key={opcao.id} className="no-flow__opcao" style={{ position: 'relative', paddingRight: 14 }}>
          {indice + 1}. {opcao.rotulo}
          <Handle
            type="source"
            position={Position.Right}
            id={opcao.id}
            style={{ background: estilo.cor, top: '50%' }}
          />
        </div>
      ))}

      {saidasCondicao.map((saida) => (
        <div key={saida} className="no-flow__opcao" style={{ position: 'relative', paddingRight: 14 }}>
          {saida === 'sim' ? '✓ verdadeiro' : '✗ falso'}
          <Handle
            type="source"
            position={Position.Right}
            id={saida}
            style={{ background: saida === 'sim' ? '#16a34a' : '#dc2626', top: '50%' }}
          />
        </div>
      ))}

      {temSaidaUnica && (
        <Handle type="source" position={Position.Right} style={{ background: estilo.cor }} />
      )}
    </div>
  );
}
