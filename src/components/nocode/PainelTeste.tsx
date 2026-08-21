'use client';

import { useEffect, useRef, useState } from 'react';
import { IconeAtualizar, IconeEnviar, IconeFechar } from '@/components/Icones';

interface Mensagem {
  id: string; autor: string; conteudo: string;
  opcoes: Array<{ id: string; rotulo: string }> | null;
}

/**
 * Depurador do fluxo: conversa com o RASCUNHO usando exatamente o mesmo
 * motor do atendimento real. Se usasse um simulador diferente, não
 * provaria nada sobre o comportamento em produção.
 *
 * Além da conversa, mostra o ESTADO do motor — em que bloco a execução
 * parou e quais variáveis já foram coletadas. É a diferença entre testar
 * e depurar: sem isso, um fluxo que segue pelo caminho errado só revela
 * o sintoma, e a pessoa fica adivinhando qual condição falhou.
 *
 * `aoMudarNo` devolve o bloco atual para o canvas destacá-lo, ligando o
 * que se lê aqui ao que se vê no desenho.
 *
 * As conversas de teste são marcadas e ficam fora das métricas do BI.
 */
export function PainelTeste({ botId, versaoId, aoFechar, aoMudarNo }: {
  botId: string; versaoId: string; aoFechar: () => void;
  aoMudarNo?: (noId: string | null) => void;
}) {
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [noAtual, setNoAtual] = useState<string | null>(null);
  const [contexto, setContexto] = useState<Record<string, unknown>>({});
  const fimRef = useRef<HTMLDivElement>(null);

  /** Estado do motor depois de cada turno, para o painel e para o canvas. */
  function absorver(atendimento: { no_atual?: string | null; contexto?: Record<string, unknown> }) {
    const no = atendimento.no_atual ?? null;
    setNoAtual(no);
    setContexto(atendimento.contexto ?? {});
    aoMudarNo?.(no);
  }

  useEffect(() => { void iniciar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [versaoId]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens.length]);

  async function iniciar() {
    setErro(null);
    const resposta = await fetch(`/api/gestao/bots/${botId}/testar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versaoId }),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) { setErro(corpo.erro ?? 'Falha ao iniciar o teste'); return; }
    setConversaId(corpo.data.atendimento.id);
    setMensagens(corpo.data.mensagens);
    absorver(corpo.data.atendimento);
  }

  async function enviar(conteudo: string) {
    if (!conteudo.trim() || !conversaId) return;
    setTexto('');
    const resposta = await fetch(`/api/chat/${conversaId}/mensagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: conteudo }),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) { setErro(corpo.erro ?? 'Falha ao enviar'); return; }
    setMensagens(corpo.data.mensagens);
    absorver(corpo.data.atendimento);
  }

  const opcoes = mensagens.at(-1)?.opcoes ?? [];

  return (
    <div className="painel-teste">
      <header className="chat__topo">
        <div style={{ flex: 1 }}>
          <strong>Depurar fluxo</strong>
          <span>rascunho · não conta no BI</span>
        </div>
        <button className="btn btn--sm" onClick={() => void iniciar()}
                aria-label="Reiniciar o teste"><IconeAtualizar /></button>
        <button className="btn btn--sm btn--fantasma" onClick={aoFechar}
                aria-label="Fechar"><IconeFechar /></button>
      </header>

      {/* O estado do motor fica acima da conversa, sempre visível: é o
          que responde "por que ele foi para lá?" enquanto se lê a fala. */}
      <div className="depurador">
        <div className="depurador__linha">
          <span className="depurador__rotulo">Bloco atual</span>
          <code className="depurador__valor">{noAtual ?? '— fim do fluxo —'}</code>
        </div>
        <div className="depurador__linha">
          <span className="depurador__rotulo">Variáveis</span>
          {Object.keys(contexto).length === 0 ? (
            <span className="depurador__vazio">nenhuma coletada ainda</span>
          ) : (
            <div className="depurador__vars">
              {Object.entries(contexto).map(([chave, valor]) => (
                <code key={chave} className="depurador__var">
                  {chave}: {JSON.stringify(valor)}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chat__msgs">
        {erro && <div className="msg msg--sistema">{erro}</div>}
        {mensagens.map((mensagem) => (
          <div key={mensagem.id} className={`msg msg--${mensagem.autor}`}>{mensagem.conteudo}</div>
        ))}
        <div ref={fimRef} />
      </div>

      {opcoes.length > 0 && (
        <div className="chat__opcoes">
          {opcoes.map((opcao) => (
            <button key={opcao.id} className="chat__opcao" onClick={() => void enviar(opcao.rotulo)}>
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}

      <form className="chat__form" onSubmit={(evento) => { evento.preventDefault(); void enviar(texto); }}>
        <input value={texto} onChange={(evento) => setTexto(evento.target.value)}
               placeholder="Responder como cliente…" aria-label="Mensagem de teste" />
        <button className="btn btn--primario" type="submit" aria-label="Enviar">
          <IconeEnviar />
        </button>
      </form>
    </div>
  );
}
