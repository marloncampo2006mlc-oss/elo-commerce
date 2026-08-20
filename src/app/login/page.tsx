'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

const DESTINO_PADRAO = '/gestao/painel';

/**
 * Só aceitamos destinos internos.
 *
 * Sem esta checagem, alguém poderia mandar um link com
 * ?proximo=https://site-falso.com e usar a nossa tela de login para
 * jogar a pessoa em outro domínio depois de autenticar — o clássico
 * open redirect. Barrar "//" cobre o caso de URL protocolo-relativa.
 */
function destinoSeguro(valor: string | null): string {
  if (!valor) return DESTINO_PADRAO;
  if (!valor.startsWith('/') || valor.startsWith('//')) return DESTINO_PADRAO;
  return valor;
}

function FormularioLogin() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: dados.get('email'), senha: dados.get('senha') }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.erro ?? 'Não foi possível entrar');
        setEnviando(false);
        return;
      }

      // Volta para onde a pessoa tentou ir antes de ser barrada.
      router.replace(destinoSeguro(parametros.get('proximo')));
      router.refresh();   // faz os Server Components relerem a sessão
    } catch {
      setErro('Servidor não respondeu. Verifique se a aplicação está rodando.');
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <div className="login__coluna">
        <form className="login__caixa" onSubmit={entrar}>
          <div className="login__marca">
            <span className="login__logo" aria-hidden="true">◆</span>
            <div>
              <strong>Elo Platform</strong>
              <span>área de gestão</span>
            </div>
          </div>

          <h1 className="login__titulo">Entrar</h1>
          <p className="login__sub">Use o e-mail cadastrado pelo administrador.</p>

          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoFocus
                   autoComplete="username" placeholder="voce@empresa.com" />
          </div>

          <div className="campo" style={{ marginTop: 14 }}>
            <label htmlFor="senha">Senha</label>
            <div className="login__senha">
              <input id="senha" name="senha" type={verSenha ? 'text' : 'password'}
                     required autoComplete="current-password" placeholder="••••••••" />
              <button type="button" className="login__olho"
                      onClick={() => setVerSenha((atual) => !atual)}
                      aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                {verSenha ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {erro && (
            <div className="login__erro" role="alert">
              <strong>{erro}</strong>
              <span>Confira o e-mail e a senha. Se persistir, peça ao administrador para redefinir.</span>
            </div>
          )}

          <button className="btn btn--primario btn--bloco" type="submit"
                  style={{ marginTop: 18 }} disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <a href="/" className="login__voltar">← Voltar para a loja</a>
        </form>
      </div>

      <aside className="login__lado" aria-hidden="true">
        <div className="login__lado-conteudo">
          <h2>Uma plataforma, cinco frentes</h2>
          <ul>
            <li><b>Loja</b> — vitrine, carrinho e checkout</li>
            <li><b>Gestão</b> — produtos, pedidos e clientes</li>
            <li><b>No-Code</b> — monte o chatbot arrastando blocos</li>
            <li><b>Atendimento</b> — fila e transferência do bot para humano</li>
            <li><b>BI</b> — indicadores da operação em tempo real</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}

export default function Login() {
  // useSearchParams exige fronteira de Suspense no App Router.
  return (
    <Suspense fallback={<main className="login" />}>
      <FormularioLogin />
    </Suspense>
  );
}
