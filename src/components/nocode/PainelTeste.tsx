'use client';

import { useEffect, useRef, useState } from 'react';
import { IconeAtualizar, IconeEnviar, IconeFechar } from '@/components/Icones';

interface Mensagem {
  id: string; autor: string; conteudo: string;
  opcoes: Array<{ id: string; rotulo: string }> | null;
}

/**
 * Modo Testar: conversa com o RASCUNHO usando exatamente o mesmo motor
 * do atendimento real. Se o teste usasse um simulador diferente, ele não
 * provaria nada sobre o comportamento em produção.
 *
 * As conversas de teste são marcadas e ficam fora das métricas do BI.
 */
export function PainelTeste({ botId, versaoId, aoFechar }: {
  botId: string; versaoId: string; aoFechar: () => void;
}) {
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

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
  }

  const opcoes = mensagens.at(-1)?.opcoes ?? [];

  return (
    <div className="painel-teste">
      <header className="chat__topo">
        <div style={{ flex: 1 }}>
          <strong>Testar fluxo</strong>
          <span>rascunho · não conta no BI</span>
        </div>
        <button className="btn btn--sm" onClick={() => void iniciar()}
                aria-label="Reiniciar o teste"><IconeAtualizar /></button>
        <button className="btn btn--sm btn--fantasma" onClick={aoFechar}
                aria-label="Fechar"><IconeFechar /></button>
      </header>

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
