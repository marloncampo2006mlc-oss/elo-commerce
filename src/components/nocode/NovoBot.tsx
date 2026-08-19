'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/Toasts';

export function NovoBot() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const router = useRouter();
  const { erro } = useToast();

  async function criar() {
    setSalvando(true);
    try {
      const resposta = await fetch('/api/gestao/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao: descricao || null }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha ao criar');
      router.push(`/gestao/no-code/${corpo.data.id}`);
    } catch (falha) {
      erro('Não foi possível criar', falha instanceof Error ? falha.message : 'Erro');
      setSalvando(false);
    }
  }

  if (!aberto) {
    return <button className="btn btn--primario" onClick={() => setAberto(true)}>＋ Novo chatbot</button>;
  }

  return (
    <div className="modal">
      <div className="modal__fundo" onClick={() => setAberto(false)} />
      <div className="modal__caixa" role="dialog" aria-modal="true" aria-label="Novo chatbot">
        <header className="modal__topo"><h2>Novo chatbot</h2></header>
        <div className="modal__corpo">
          <div className="campo">
            <label htmlFor="nome-bot">Nome</label>
            <input id="nome-bot" value={nome} maxLength={120} autoFocus
                   onChange={(evento) => setNome(evento.target.value)}
                   placeholder="Ex.: Atendimento pós-venda" />
          </div>
          <div className="campo" style={{ marginTop: 12 }}>
            <label htmlFor="desc-bot">Descrição</label>
            <input id="desc-bot" value={descricao} maxLength={500}
                   onChange={(evento) => setDescricao(evento.target.value)}
                   placeholder="Para que serve este fluxo" />
          </div>
          <div className="modal__rodape">
            <button className="btn" onClick={() => setAberto(false)}>Cancelar</button>
            <button className="btn btn--primario" disabled={nome.trim().length < 3 || salvando}
                    onClick={() => void criar()}>
              {salvando ? 'Criando…' : 'Criar e editar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
