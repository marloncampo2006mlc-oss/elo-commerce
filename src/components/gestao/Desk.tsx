'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { moeda, ordinal, tempoEspera } from '@/lib/formato';
import { SeloStatus } from '@/components/SeloStatus';
import { useToast } from '@/components/Toasts';
import {
  IconeAtendimento, IconeEnviar, IconeSino, IconeSinoCortado,
} from '@/components/Icones';
import { tocarAlerta } from '@/lib/alertaSonoro';

const CHAVE_SOM = 'elo-alerta-fila';

interface ItemFila {
  id: string; protocolo: string; status: string; canal: string;
  cliente_nome: string | null; atendente_nome: string | null;
  total_mensagens: number; espera_segundos: number; created_at: string;
  posicao_fila: number | null;
}
interface Mensagem { id: string; autor: string; conteudo: string }
interface Evento { id: string; tipo: string; descricao: string; created_at: string }
interface DadosCliente {
  nome: string; email: string; telefone: string | null; cidade: string | null; uf: string | null;
  total_pedidos: number; total_gasto: number;
  pedidos: Array<{ numero: number; status: string; total: number; created_at: string }>;
}

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
  const { sucesso, erro, info } = useToast();
  const msgsRef = useRef<HTMLDivElement>(null);

  const [somLigado, setSomLigado] = useState(true);
  /**
   * Quem já estava na fila na última consulta.
   *
   * `null` marca que ainda não houve nenhuma: quem abre a tela com
   * cinco pessoas esperando não deve receber cinco alertas de "chegou
   * alguém". Só o que aparece DEPOIS da primeira carga é novidade.
   */
  const conhecidosRef = useRef<Set<string> | null>(null);

  const aguardandoAgora = fila.filter(
    (item) => item.status === 'aguardando_atendente').length;

  useEffect(() => {
    setSomLigado(localStorage.getItem(CHAVE_SOM) !== 'desligado');
  }, []);

  /**
   * Avisa quando alguém novo entra na fila.
   *
   * O aviso é do navegador, não do sistema operacional: notificação
   * nativa exige permissão, e uma permissão pedida de surpresa costuma
   * ser negada — deixando o atendente sem aviso nenhum. Um toast, o som
   * e o contador no título da aba funcionam sempre, inclusive com a aba
   * em segundo plano, que é justamente quando o aviso importa.
   */
  const anunciarNovidades = useCallback((novaFila: ItemFila[]) => {
    const aguardando = novaFila.filter((item) => item.status === 'aguardando_atendente');
    const ids = new Set(aguardando.map((item) => item.id));

    const conhecidos = conhecidosRef.current;
    conhecidosRef.current = ids;
    if (conhecidos === null) return;

    const novas = aguardando.filter((item) => !conhecidos.has(item.id));
    if (novas.length === 0) return;

    for (const nova of novas) {
      info(
        'Novo cliente na fila',
        `${nova.cliente_nome ?? 'Visitante'} · ${nova.protocolo}`,
      );
    }
    if (somLigado) tocarAlerta();
  }, [info, somLigado]);

  const carregarFila = useCallback(async () => {
    const resposta = await fetch('/api/gestao/atendimento/fila');
    if (!resposta.ok) return;
    const { data } = await resposta.json();
    setFila(data.fila);
    setHistorico(data.historico);
    anunciarNovidades(data.fila as ItemFila[]);
  }, [anunciarNovidades]);

  const carregarConversa = useCallback(async (id: string) => {
    const resposta = await fetch(`/api/gestao/atendimento/${id}`);
    if (!resposta.ok) return;
    const { data } = await resposta.json();
    setMensagens(data.mensagens);
    setEventos(data.eventos);
    setConversa(data.atendimento);
    setCliente(data.cliente ?? null);
  }, []);

  useEffect(() => { anunciarNovidades(filaInicial); }, [anunciarNovidades, filaInicial]);

  /**
   * Quantos esperam, no título da aba.
   *
   * É o único aviso que atravessa a aba em segundo plano — que é
   * exatamente quando o atendente não está olhando a tela.
   *
   * A dependência inclui `fila` de propósito, e não só a contagem: o
   * Next escreve o título vindo do `metadata` no commit inicial e
   * sobrescreve o nosso uma vez. Reafirmar a cada consulta da fila faz o
   * contador se recuperar sozinho, sem depender de vencer essa corrida.
   */
  useEffect(() => {
    document.title = aguardandoAgora > 0
      ? `(${aguardandoAgora}) Atendimento · Elo`
      : 'Atendimento · Elo';
  }, [aguardandoAgora, fila]);

  // Sair da tela não pode deixar o contador preso no título da aba.
  useEffect(() => () => { document.title = 'Elo Platform'; }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      void carregarFila();
      if (selecionado) void carregarConversa(selecionado);
    }, 5000);
    return () => clearInterval(intervalo);
  }, [carregarFila, carregarConversa, selecionado]);

  // Rola apenas a caixa de mensagens. scrollIntoView() arrastaria junto
  // todos os ancestrais roláveis — inclusive a página — e o cabeçalho do
  // card acabava atrás da barra fixa, com o botão de assumir escondido.
  useEffect(() => {
    const caixa = msgsRef.current;
    if (caixa) caixa.scrollTo({ top: caixa.scrollHeight, behavior: 'smooth' });
  }, [mensagens.length]);

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
    <div className="mesa">
      {/* ---------- fila ---------- */}
      <aside className="cartao mesa__fila">
        <div className="cartao__topo" style={{ gap: 6 }}>
          <button className={`btn btn--sm ${aba === 'fila' ? 'btn--primario' : 'btn--fantasma'}`}
                  onClick={() => setAba('fila')}>
            {/* O contador é de quem ESPERA, não do tamanho da lista: a
                aba também mostra conversas já assumidas, e um número
                que some as duas não diz o que precisa de atenção. */}
            Fila {aguardandoAgora > 0 && `(${aguardandoAgora})`}
          </button>
          <button className={`btn btn--sm ${aba === 'historico' ? 'btn--primario' : 'btn--fantasma'}`}
                  onClick={() => setAba('historico')}>
            Histórico
          </button>

          <button className="btn btn--sm btn--fantasma direita"
                  aria-pressed={somLigado}
                  title={somLigado ? 'Desligar o som de novo cliente' : 'Ligar o som de novo cliente'}
                  aria-label={somLigado ? 'Desligar o som de novo cliente' : 'Ligar o som de novo cliente'}
                  onClick={() => {
                    const proximo = !somLigado;
                    setSomLigado(proximo);
                    localStorage.setItem(CHAVE_SOM, proximo ? 'ligado' : 'desligado');
                    // Tocar na hora de ligar confirma que o som funciona
                    // e destrava o áudio do navegador, que só libera
                    // depois de um clique.
                    if (proximo) tocarAlerta();
                  }}>
            {somLigado ? <IconeSino tamanho={15} /> : <IconeSinoCortado tamanho={15} />}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lista.length === 0 ? (
            <div className="vazio">
              <div className="vazio__icone"><IconeAtendimento tamanho={26} /></div>
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
                {item.atendente_nome && ` · ${item.atendente_nome}`}
              </div>

              {item.status === 'aguardando_atendente' && item.posicao_fila !== null && (
                <div className="espera" style={{ marginTop: 6 }}>
                  <span className={`espera__vez ${item.posicao_fila === 1 ? 'espera__vez--proximo' : ''}`}>
                    {ordinal(item.posicao_fila)} na fila
                  </span>
                  <span className="dim">esperando há {tempoEspera(item.espera_segundos)}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ---------- conversa ---------- */}
      <section className="cartao mesa__conversa">
        {!conversa ? (
          <div className="vazio" style={{ margin: 'auto' }}>
            <div className="vazio__icone"><IconeAtendimento tamanho={26} /></div>
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

            {/* --mesa espelha os lados: aqui quem lê é o atendente, então
                o cliente fica à esquerda e a nossa fala à direita. No
                widget da loja é o contrário, e o mesmo CSS serve aos
                dois casos. */}
            <div className="chat__msgs chat__msgs--mesa" style={{ flex: 1 }} ref={msgsRef}>
              {mensagens.map((mensagem) => (
                <div key={mensagem.id} className={`msg msg--${mensagem.autor}`}>{mensagem.conteudo}</div>
              ))}
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
                <button className="btn btn--primario" type="submit" aria-label="Enviar">
                  <IconeEnviar />
                </button>
              </form>
            ) : naFila ? (
              /* Antes aqui só havia o texto "assuma o atendimento para
                 responder", e a única forma de assumir era o botão do
                 cabeçalho. Oferecer a ação no mesmo lugar em que ela é
                 pedida evita o beco sem saída. */
              <div className="chat__bloqueio">
                <span>Esta conversa está esperando um atendente.</span>
                <button className="btn btn--sm btn--primario"
                        onClick={() => void acao('assumir')}>
                  Assumir para responder
                </button>
              </div>
            ) : (
              <div className="chat__bloqueio dim">Conversa encerrada.</div>
            )}
          </>
        )}
      </section>

      {/* ---------- contexto do cliente ---------- */}
      <aside className="cartao mesa__contexto">
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
