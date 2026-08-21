'use client';

import type { Node } from '@xyflow/react';
import type { DadosNo } from '@/chatbot/tipos';
import { ESTILO_BLOCO, type DadosNoCanvas } from './NoCanvas';
import { IconeFechar } from '@/components/Icones';

interface Props {
  no: Node | null;
  aoAlterar: (id: string, dados: Partial<DadosNoCanvas>) => void;
  aoRemover: (id: string) => void;
}

/** Formulário de configuração do bloco selecionado. */
export function PainelPropriedades({ no, aoAlterar, aoRemover }: Props) {
  if (!no) {
    return (
      <div className="dim" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
        <div className="lateral__grupo" style={{ paddingLeft: 0 }}>Propriedades</div>
        Selecione um bloco no canvas para configurá-lo.
        <p style={{ marginTop: 10 }}>
          Use <code>{'{{variavel}}'}</code> nos textos para inserir uma resposta
          coletada antes.
        </p>
      </div>
    );
  }

  const dados = no.data as DadosNoCanvas;
  const estilo = ESTILO_BLOCO[dados.tipo];
  const alterar = (mudanca: Partial<DadosNoCanvas>) => aoAlterar(no.id, mudanca);

  const temTexto = ['mensagem', 'pergunta', 'menu', 'transferir', 'finalizar'].includes(dados.tipo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="lateral__grupo" style={{ paddingLeft: 0, paddingTop: 0 }}>
        <span style={{ color: estilo.cor, display: 'inline-flex', verticalAlign: '-3px' }}>
          {estilo.icone}
        </span> {estilo.rotulo}
      </div>

      <div className="campo">
        <label htmlFor="titulo">Nome do bloco</label>
        <input id="titulo" value={dados.titulo ?? ''} maxLength={80}
               onChange={(evento) => alterar({ titulo: evento.target.value })}
               placeholder={estilo.rotulo} />
      </div>

      {temTexto && (
        <div className="campo">
          <label htmlFor="texto">
            {dados.tipo === 'pergunta' ? 'Pergunta' : 'Mensagem'}
          </label>
          <textarea id="texto" value={dados.texto ?? ''} maxLength={2000}
                    onChange={(evento) => alterar({ texto: evento.target.value })} />
        </div>
      )}

      {dados.tipo === 'pergunta' && (
        <div className="campo">
          <label htmlFor="variavel">Guardar resposta em</label>
          <input id="variavel" value={dados.variavel ?? ''} maxLength={40}
                 onChange={(evento) => alterar({ variavel: evento.target.value.replace(/\s/g, '_') })} />
          <span className="campo__dica">
            Use depois como <code>{`{{${dados.variavel || 'variavel'}}}`}</code>
          </span>
        </div>
      )}

      {dados.tipo === 'menu' && (
        <div className="campo">
          <label>Opções</label>
          {(dados.opcoes ?? []).map((opcao, indice) => (
            <div key={opcao.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={opcao.rotulo} maxLength={80}
                     aria-label={`Opção ${indice + 1}`}
                     onChange={(evento) => alterar({
                       opcoes: (dados.opcoes ?? []).map((atual) =>
                         atual.id === opcao.id ? { ...atual, rotulo: evento.target.value } : atual),
                     })} />
              <button className="btn btn--sm btn--perigo" aria-label="Remover opção"
                      onClick={() => alterar({
                        opcoes: (dados.opcoes ?? []).filter((atual) => atual.id !== opcao.id),
                      })}><IconeFechar tamanho={13} /></button>
            </div>
          ))}
          <button className="btn btn--sm" onClick={() => alterar({
            opcoes: [...(dados.opcoes ?? []), {
              id: `opcao${Date.now().toString(36)}`,
              rotulo: 'Nova opção',
            }],
          })}>+ Adicionar opção</button>
          <span className="campo__dica">
            Cada opção vira uma saída do bloco — conecte todas.
          </span>
        </div>
      )}

      {dados.tipo === 'condicao' && (
        <>
          <div className="campo">
            <label htmlFor="var-cond">Variável</label>
            <input id="var-cond" value={dados.variavel ?? ''} maxLength={40}
                   onChange={(evento) => alterar({ variavel: evento.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="operador">Comparação</label>
            <select id="operador" value={dados.operador ?? 'igual'}
                    onChange={(evento) => alterar({
                      operador: evento.target.value as DadosNo['operador'],
                    })}>
              <option value="igual">é igual a</option>
              <option value="diferente">é diferente de</option>
              <option value="contem">contém</option>
              <option value="preenchido">está preenchida</option>
              <option value="maior">é maior que</option>
              <option value="menor">é menor que</option>
            </select>
          </div>
          {dados.operador !== 'preenchido' && (
            <div className="campo">
              <label htmlFor="valor">Valor</label>
              <input id="valor" value={dados.valor ?? ''} maxLength={200}
                     onChange={(evento) => alterar({ valor: evento.target.value })} />
            </div>
          )}
        </>
      )}

      {dados.tipo === 'buscar_produtos' && (
        <div className="campo">
          <label htmlFor="termo">Termo de busca</label>
          <input id="termo" value={dados.termo ?? ''} maxLength={200}
                 onChange={(evento) => alterar({ termo: evento.target.value })}
                 placeholder="vazio = destaques" />
          <span className="campo__dica">
            Aceita <code>{'{{variavel}}'}</code> para usar o que o cliente respondeu.
          </span>
        </div>
      )}

      {dados.tipo === 'consultar_pedido' && (
        <div className="campo">
          <label htmlFor="termo-pedido">Número do pedido</label>
          <input id="termo-pedido" value={dados.termo ?? ''} maxLength={200}
                 onChange={(evento) => alterar({ termo: evento.target.value })} />
          <span className="campo__dica">
            Normalmente <code>{'{{pedido}}'}</code>, vindo de uma Pergunta anterior.
            Grava <code>pedido_encontrado</code> no contexto.
          </span>
        </div>
      )}

      {dados.tipo !== 'inicio' && (
        <button className="btn btn--sm btn--perigo" style={{ marginTop: 8 }}
                onClick={() => aoRemover(no.id)}>
          Excluir bloco
        </button>
      )}
    </div>
  );
}
