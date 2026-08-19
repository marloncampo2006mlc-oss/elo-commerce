'use client';

import { useEffect, useRef, useState } from 'react';

interface Opcao { id: string; rotulo: string }
interface Mensagem {
  id: string; autor: 'cliente' | 'bot' | 'atendente' | 'sistema';
  conteudo: string; opcoes: Opcao[] | null;
}
interface Conversa {
  atendimento: { id: string; protocolo: string; status: string };
  mensagens: Mensagem[];
}

/**
 * Widget de atendimento da loja.
 *
 * Não conhece NENHUM texto do fluxo: só inicia a conversa e envia o que
 * o cliente digita. Todo o conteúdo vem da versão publicada no No-Code —
 * é isso que faz "publicar" mudar o chat da loja de verdade.
 */
export function WidgetChat() {
  const [aberto, setAberto] = useState(false);
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversa?.mensagens.length, carregando]);

  async function iniciar() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch('/api/chat/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal: 'chatbot' }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha ao abrir o atendimento');
      setConversa(corpo.data as Conversa);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Erro inesperado');
    } finally {
      setCarregando(false);
    }
  }

  async function enviar(mensagem: string) {
    const conteudo = mensagem.trim();
    if (!conteudo || !conversa || carregando) return;

    setTexto('');
    setCarregando(true);

    // Eco otimista: a fala do cliente aparece antes da ida ao servidor.
    setConversa((atual) => atual && {
      ...atual,
      mensagens: [...atual.mensagens, {
        id: `local-${Date.now()}`, autor: 'cliente', conteudo, opcoes: null,
      }],
    });

    try {
      const resposta = await fetch(`/api/chat/${conversa.atendimento.id}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha ao enviar');
      setConversa(corpo.data as Conversa);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Erro inesperado');
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Depois de transferido, o cliente precisa ver a resposta do atendente.
   * Sem WebSocket (a Vercel não mantém conexão aberta em serverless),
   * a alternativa correta é consultar periodicamente — e só enquanto a
   * janela está aberta e a conversa está com um humano.
   */
  useEffect(() => {
    const status = conversa?.atendimento.status;
    if (!aberto || !conversa || !['aguardando_atendente', 'em_atendimento'].includes(status ?? '')) {
      return;
    }

    const intervalo = setInterval(async () => {
      const resposta = await fetch(`/api/chat/${conversa.atendimento.id}/mensagens`);
      if (resposta.ok) setConversa((await resposta.json()).data as Conversa);
    }, 4000);

    return () => clearInterval(intervalo);
  }, [aberto, conversa]);

  const ultima = conversa?.mensagens.at(-1);
  const opcoes = ultima?.opcoes ?? [];
  const encerrada = conversa?.atendimento.status === 'finalizado';

  if (!aberto) {
    return (
      <button className="fab" onClick={() => { setAberto(true); if (!conversa) void iniciar(); }}
              aria-label="Abrir atendimento">💬</button>
    );
  }

  return (
    <section className="chat" aria-label="Atendimento">
      <header className="chat__topo">
        <div className="avatar" aria-hidden="true">◆</div>
        <div style={{ flex: 1 }}>
          <strong>Assistente Elo</strong>
          <span>{conversa?.atendimento.protocolo ?? 'iniciando…'}</span>
        </div>
        <button className="btn btn--sm btn--fantasma" onClick={() => setAberto(false)}
                aria-label="Fechar">✕</button>
      </header>

      <div className="chat__msgs">
        {erro && <div className="msg msg--sistema">{erro}</div>}

        {conversa?.mensagens.map((mensagem) => (
          <div key={mensagem.id} className={`msg msg--${mensagem.autor}`}>
            {mensagem.conteudo}
          </div>
        ))}

        {carregando && (
          <div className="msg msg--bot digitando" aria-label="digitando">
            <i /><i /><i />
          </div>
        )}

        {conversa?.atendimento.status === 'aguardando_atendente' && (
          <div className="msg msg--sistema">Aguardando um atendente entrar na conversa…</div>
        )}

        <div ref={fimRef} />
      </div>

      {opcoes.length > 0 && !carregando && !encerrada && (
        <div className="chat__opcoes">
          {opcoes.map((opcao) => (
            <button key={opcao.id} className="chat__opcao" onClick={() => void enviar(opcao.rotulo)}>
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}

      {encerrada ? (
        <div style={{ padding: 14, borderTop: '1px solid var(--borda)' }}>
          <button className="btn btn--primario btn--bloco" onClick={() => void iniciar()}>
            Iniciar nova conversa
          </button>
        </div>
      ) : (
        <form className="chat__form" onSubmit={(evento) => { evento.preventDefault(); void enviar(texto); }}>
          <input value={texto} onChange={(evento) => setTexto(evento.target.value)}
                 placeholder="Digite sua mensagem…" maxLength={500} aria-label="Mensagem"
                 disabled={!conversa || carregando} />
          <button className="btn btn--primario" type="submit" disabled={!texto.trim() || carregando}
                  aria-label="Enviar">➤</button>
        </form>
      )}
    </section>
  );
}
