'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const dados = new FormData(evento.currentTarget);
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dados.get('email'), senha: dados.get('senha') }),
    });

    if (resposta.ok) {
      // refresh() faz os Server Components relerem a sessão do cookie
      router.replace('/painel');
      router.refresh();
      return;
    }

    const corpo = await resposta.json().catch(() => ({}));
    setErro(corpo.erro ?? 'Não foi possível entrar');
    setEnviando(false);
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <form onSubmit={entrar} style={{
        width: 'min(380px, 100%)', display: 'flex', flexDirection: 'column', gap: 14,
        border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 28,
      }}>
        <h1 style={{ fontSize: 20 }}>Elo Platform</h1>
        <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 6 }}>Acesso da equipe interna</p>

        <label style={{ fontSize: 12, opacity: 0.8 }} htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username"
               style={campo} placeholder="voce@elo.dev" />

        <label style={{ fontSize: 12, opacity: 0.8 }} htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password"
               style={campo} placeholder="••••••••" />

        {erro && <p role="alert" style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}

        <button type="submit" disabled={enviando} style={botao}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

const campo: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, background: '#0a0a12',
  border: '1px solid rgba(255,255,255,.12)', color: 'inherit', font: 'inherit',
};

const botao: React.CSSProperties = {
  padding: '11px 16px', borderRadius: 10, border: 0, cursor: 'pointer',
  background: 'linear-gradient(135deg,#7c5cff,#22d3ee)', color: '#fff',
  fontWeight: 600, marginTop: 8,
};
