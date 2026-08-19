'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { moeda } from '@/lib/formato';
import { SeloStatus } from '@/components/SeloStatus';
import { useToast } from '@/components/Toasts';

interface ItemFila {
  id: string; protocolo: string; status: string; canal: string;
  cliente_nome: string | null; atendente_nome: string | null;
  total_mensagens: number; espera_segundos: number; created_at: string;
}
interface Mensagem { id: string; autor: string; conteudo: string }
interface Evento { id: string; tipo: string; descricao: string; created_at: string }
interface DadosCliente {
  nome: string; email: string; telefone: string | null; cidade: string | null; uf: string | null;
  total_pedidos: number; total_gasto: number;
  pedidos: Array<{ numero: number; status: string; total: number; created_at: string }>;
}

const tempoEspera = (segundos: number): string => {
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  return minutos < 60 ? `${minutos}min` : `${Math.floor(minutos / 60)}h${minutos % 60}min`;
};

/**
 * Mesa de atendimento.
 *
 * Atualiza por polling, e não por WebSocket, porque a aplicação roda em
 * funções serverless — que não mantêm conexão aberta. Consultamos a cada
 * 5s a fila e a conversa aberta; é simples, previsível e suficiente para
 * o volume desta operação.
 */
export function Desk({ filaInicial, historicoInicial }: {
  filaInicial: ItemFila[]; historicoInicial: ItemFila[];
}) {
  const [fila, setFila] = useState(filaInicial);
  const [historico, setHistorico] = useState(historicoInicial);
  const [aba, setAba] = useState<'fila' | 'historico'>('fila');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [conversa, setConversa] = useState<ItemFila | null>(null);
  const [cliente, setCliente] = useState<DadosCliente | null>(null);
  const [texto, setTexto] = useState('');
  const { sucesso, erro } = useToast();
  const fimRef = useRef<HTMLDivElement>(null);

  const carregarFila = useCallback(async () => {
    const resposta = await fetch('/api/gestao/atendimento/fila');
    if (!resposta.ok) return;
    const { data } = await resposta.json();
    setFila(data.fila);
    setHistorico(data.historico);
  }, []);

  const carregarConversa = useCallback(async (id: string) => {
    const resposta = await fetch(`/api/gestao/atendimento/${id}`);
    if (!resposta.ok) return;
    const { data } = await resposta.json();
    setMensagens(data.mensagens);
    setEventos(data.eventos);
    setConversa(data.atendimento);
    setCliente(data.cliente ?? null);
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      void carregarFila();
      if (selecionado) void carregarConversa(selecionado);
    }, 5000);
    return () => clearInterval(intervalo);
  }, [carregarFila, carregarConversa, selecionado]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens.length]);

  async function acao(caminho: string, corpo?: object) {
    if (!selecionado) return;
    const resposta = await fetch(`/api/gestao/atendimento/${selecionado}/${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = await resposta.json();
    if (!resposta.ok) { erro('Não foi possível', dados.erro); return false; }
    await carregarConversa(selecionado);
    await carregarFila();
    return true;
  }

  const lista = aba === 'fila' ? fila : historico;
  const emAtendimento = conversa?.status === 'em_atendimento';
  const naFila = conversa?.status === 'aguardando_atendente';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 280px', gap: 14, height: 'calc(100vh - 130px)' }}>
      {/* ---------- fila ---------- */}
      <aside className="cartao" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="cartao__topo" style={{ gap: 6 }}>
          <button className={`btn btn--sm ${aba === 'fila' ? 'btn--primario' : 'btn--fantasma'}`}
                  onClick={() => setAba('fila')}>
            Fila {fila.length > 0 && `(${fila.length})`}
          </button>
          <button className={`btn btn--sm ${aba === 'historico' ? 'btn--primario' : 'btn--fantasma'}`}
                  onClick={() => setAba('historico')}>
            Histórico
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lista.length === 0 ? (
            <div className="vazio">
              <div className="vazio__icone">◐</div>
              <strong>Fila vazia</strong>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Peça um atendente no chat da loja para ver a conversa aparecer aqui.
              </p>
            </div>
          ) : lista.map((item) => (
            <button key={item.id}
                    onClick={() => { setSelecionado(item.id); void carregarConversa(item.id); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none',
                      border: 0, borderBottom: '1px solid var(--borda)', cursor: 'pointer',
                      borderLeft: selecionado === item.id ? '3px solid var(--violeta)' : '3px solid transparent',
                    }}>
              <div className="flex entre" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{item.cliente_nome ?? 'Visitante'}</strong>
                <SeloStatus valor={item.status} />
              </div>
              <div className="dim mono" style={{ fontSize: 11 }}>{item.protocolo}</div>
              <div className="dim" style={{ fontSize: 11.5, marginTop: 3 }}>
                {item.canal} · {item.total_mensagens} msgs
                {item.status === 'aguardando_atendente' && ` · espera ${tempoEspera(item.espera_segundos)}`}
                {item.atendente_nome && ` · ${item.atendente_nome}`}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ---------- conversa ---------- */}
      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!conversa ? (
          <div className="vazio" style={{ margin: 'auto' }}>
            <div className="vazio__icone">💬</div>
            <strong>Selecione uma conversa</strong>
          </div>
        ) : (
          <>
            <div className="cartao__topo">
              <div>
                <h3>{conversa.cliente_nome ?? 'Visitante'}</h3>
                <p className="mono">{conversa.protocolo} · {conversa.canal}</p>
              </div>
              <div className="direita flex" style={{ gap: 8 }}>
                {naFila && (
                  <button className="btn btn--sm btn--primario" onClick={() => void acao('assumir')}>
                    Assumir atendimento
                  </button>
                )}
                {emAtendimento && (
                  <button className="btn btn--sm" onClick={async () => {
                    if (await acao('finalizar')) sucesso('Atendimento finalizado');
                  }}>Finalizar</button>
                )}
              </div>
            </div>

            <div className="chat__msgs" style={{ flex: 1 }}>
              {mensagens.map((mensagem) => (
                <div key={mensagem.id} className={`msg msg--${mensagem.autor}`}>{mensagem.conteudo}</div>
              ))}
              <div ref={fimRef} />
            </div>

            {emAtendimento ? (
              <form className="chat__form"
                    onSubmit={async (evento) => {
                      evento.preventDefault();
                      if (!texto.trim()) return;
                      const enviado = texto;
                      setTexto('');
                      await acao('mensagens', { texto: enviado });
                    }}>
                <input value={texto} onChange={(evento) => setTexto(evento.target.value)}
                       placeholder="Responder ao cliente…" aria-label="Resposta" />
                <button className="btn btn--primario" type="submit" aria-label="Enviar">➤</button>
              </form>
            ) : (
              <div style={{ padding: 14, borderTop: '1px solid var(--borda)' }} className="dim">
                {naFila ? 'Assuma o atendimento para responder.' : 'Conversa encerrada.'}
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------- contexto do cliente ---------- */}
      <aside className="cartao" style={{ overflowY: 'auto' }}>
        <div className="cartao__topo"><div><h3>Dados do cliente</h3></div></div>

        {!cliente ? (
          <p className="dim" style={{ padding: 18, fontSize: 12.5 }}>
            {conversa
              ? 'Cliente não identificado nesta conversa.'
              : 'Selecione uma conversa para ver o histórico.'}
          </p>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <strong>{cliente.nome}</strong>
              <div className="dim" style={{ fontSize: 12 }}>{cliente.email}</div>
              {cliente.telefone && <div className="dim" style={{ fontSize: 12 }}>{cliente.telefone}</div>}
              {cliente.cidade && (
                <div className="dim" style={{ fontSize: 12 }}>{cliente.cidade}/{cliente.uf}</div>
              )}
            </div>

            <div className="flex" style={{ gap: 8 }}>
              <div className="cartao cartao--pad" style={{ flex: 1, padding: 12 }}>
                <div className="kpi__rotulo">Pedidos</div>
                <strong style={{ fontSize: 18 }}>{cliente.total_pedidos}</strong>
              </div>
              <div className="cartao cartao--pad" style={{ flex: 1, padding: 12 }}>
                <div className="kpi__rotulo">Gasto</div>
                <strong style={{ fontSize: 15 }}>{moeda(cliente.total_gasto)}</strong>
              </div>
            </div>

            <div>
              <div className="lateral__grupo" style={{ paddingLeft: 0 }}>Pedidos recentes</div>
              {cliente.pedidos.length === 0
                ? <p className="dim" style={{ fontSize: 12 }}>Nenhum pedido.</p>
                : cliente.pedidos.map((pedido) => (
                  <div key={pedido.numero} className="flex entre" style={{ padding: '6px 0', fontSize: 12.5 }}>
                    <span className="mono">#{pedido.numero}</span>
                    <span>{moeda(pedido.total)}</span>
                    <SeloStatus valor={pedido.status} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {eventos.length > 0 && (
          <>
            <div className="cartao__topo" style={{ borderTop: '1px solid var(--borda)' }}>
              <div><h3>Linha do tempo</h3></div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eventos.map((evento) => (
                <div key={evento.id} style={{ fontSize: 12 }}>
                  <div>{evento.descricao}</div>
                  <div className="dim" style={{ fontSize: 11 }}>
                    {new Date(evento.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
