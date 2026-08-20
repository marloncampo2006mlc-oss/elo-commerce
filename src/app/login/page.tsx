'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { CenarioLogin } from '@/components/CenarioLogin';

const DESTINO_PADRAO = '/gestao/painel';

/**
 * Só aceitamos destinos internos.
 *
 * Sem esta checagem, um link com ?proximo=https://site-falso.com usaria
 * a nossa tela de login para jogar a pessoa em outro domínio depois de
 * autenticar — o clássico open redirect. Barrar "//" cobre o caso de
 * URL protocolo-relativa.
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
  const [lembrar, setLembrar] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dados.get('email'),
          senha: dados.get('senha'),
          lembrar,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.erro ?? 'Não foi possível entrar');
        setEnviando(false);
        return;
      }

      router.replace(destinoSeguro(parametros.get('proximo')));
      router.refresh();   // faz os Server Components relerem a sessão
    } catch {
      setErro('O servidor não respondeu. Verifique se a aplicação está rodando.');
      setEnviando(false);
    }
  }

  return (
    <main className="acesso">
      <CenarioLogin />

      <div className="acesso__conteudo">
        <form className="vidro" onSubmit={entrar}>
          <div className="vidro__marca">
            <span className="vidro__logo" aria-hidden="true">◆</span>
            <div>
              <strong>Elo Platform</strong>
              <span>área de gestão</span>
            </div>
          </div>

          <h1 className="vidro__titulo">Entrar</h1>

          <div className="linha">
            <input id="email" name="email" type="email" required autoFocus
                   autoComplete="username" placeholder=" " />
            <label htmlFor="email">E-mail</label>
          </div>

          <div className="linha">
            <input id="senha" name="senha" type={verSenha ? 'text' : 'password'}
                   required autoComplete="current-password" placeholder=" " />
            <label htmlFor="senha">Senha</label>
            <button type="button" className="linha__olho"
                    onClick={() => setVerSenha((atual) => !atual)}
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              {verSenha ? '🙈' : '👁'}
            </button>
          </div>

          <div className="vidro__opcoes">
            <label className="marcador">
              <input type="checkbox" checked={lembrar}
                     onChange={(evento) => setLembrar(evento.target.checked)} />
              <span className="marcador__caixa" aria-hidden="true" />
              Lembrar de mim
            </label>

            <button type="button" className="vidro__link" onClick={() => setAjuda(true)}>
              Esqueci a senha
            </button>
          </div>

          {erro && (
            <div className="vidro__erro" role="alert">
              <strong>{erro}</strong>
              <span>Confira o e-mail e a senha, ou peça uma nova ao administrador.</span>
            </div>
          )}

          <button className="vidro__botao" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="vidro__rodape">
            Acesso criado pelo administrador · <a href="/">voltar para a loja</a>
          </p>
        </form>
      </div>

      {ajuda && (
        <div className="modal" onClick={() => setAjuda(false)}>
          <div className="modal__fundo" />
          <div className="modal__caixa" role="dialog" aria-modal="true"
               aria-label="Recuperar acesso"
               onClick={(evento) => evento.stopPropagation()}>
            <header className="modal__topo"><h2>Recuperar acesso</h2></header>
            <div className="modal__corpo">
              <p style={{ color: 'var(--texto-2)', marginBottom: 14 }}>
                A senha não pode ser recuperada: o banco guarda apenas o hash, então
                nem quem tem acesso ao servidor consegue lê-la. O caminho é definir uma nova.
              </p>
              <p style={{ color: 'var(--texto-2)', marginBottom: 10 }}>
                <strong>Peça a um administrador</strong> para abrir
                <span className="mono"> Gestão → Usuários</span>, selecionar seu nome e
                clicar em <strong>Redefinir senha</strong>.
              </p>
              <p className="dim" style={{ fontSize: 12.5 }}>
                Se você administra o servidor, também dá pelo terminal:
              </p>
              <pre className="bloco-codigo">npm run db:senha -- seu@email.com NovaSenha123</pre>

              <div className="modal__rodape">
                <button className="btn btn--primario" onClick={() => setAjuda(false)}>
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Login() {
  // useSearchParams exige uma fronteira de Suspense no App Router.
  return (
    <Suspense fallback={<main className="acesso"><CenarioLogin /></main>}>
      <FormularioLogin />
    </Suspense>
  );
}
