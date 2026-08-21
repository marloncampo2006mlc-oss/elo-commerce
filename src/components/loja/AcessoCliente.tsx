'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toasts';
import { Olho } from '@/components/Icone';
import { IconeEnvelope } from '@/components/Icones';

type Etapa = 'escolha' | 'entrar' | 'cadastrar';

/** Máscara de CPF conforme digita, mantendo só os dígitos no envio. */
function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function AcessoCliente({ aoEntrar, proximo }: {
  aoEntrar?: () => void;
  proximo?: string;
}) {
  const router = useRouter();
  const { sucesso, erro } = useToast();

  const [etapa, setEtapa] = useState<Etapa>('escolha');
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [cpf, setCpf] = useState('');

  /**
   * O callback do Google volta por redirecionamento, não por fetch —
   * então o motivo da falha chega na URL, e é aqui que ele vira aviso.
   */
  useEffect(() => {
    const motivo = new URLSearchParams(window.location.search).get('erro');
    if (!motivo) return;

    const mensagens: Record<string, [string, string]> = {
      'google-indisponivel': ['Login com Google indisponível',
        'Faltam as credenciais OAuth no servidor. Use e-mail e senha.'],
      'state-invalido': ['Sessão de login expirada', 'Tente entrar novamente.'],
      'login-cancelado': ['Login cancelado', 'Você voltou sem concluir no Google.'],
      'google-falhou': ['O Google recusou a autenticação', 'Tente novamente ou use e-mail e senha.'],
    };

    const [titulo, detalhe] = mensagens[motivo] ?? ['Não foi possível entrar', 'Tente novamente.'];
    erro(titulo, detalhe);

    // Limpa a URL para o aviso não reaparecer a cada recarga.
    window.history.replaceState({}, '', window.location.pathname);
  }, [erro]);

  async function enviar(evento: FormEvent<HTMLFormElement>, rota: string) {
    evento.preventDefault();
    setEnviando(true);
    setFalha(null);

    const dados = Object.fromEntries(new FormData(evento.currentTarget).entries());

    try {
      const resposta = await fetch(`/api/loja/auth/${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, cpf: String(dados.cpf ?? '').replace(/\D/g, '') }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok) {
        throw new Error(corpo.detalhes?.[0]?.mensagem ?? corpo.erro ?? 'Não foi possível continuar');
      }

      sucesso(`Olá, ${corpo.data.nome.split(' ')[0]}!`, 'Você está conectado.');
      aoEntrar?.();
      router.refresh();
      if (proximo) router.push(proximo);
    } catch (problema) {
      setFalha(problema instanceof Error ? problema.message : 'Erro inesperado');
    } finally {
      setEnviando(false);
    }
  }

  /* ---------------------------- escolha ---------------------------- */
  if (etapa === 'escolha') {
    return (
      <div className="acesso-loja">
        <h2 className="acesso-loja__titulo">Como você quer entrar?</h2>
        <p className="acesso-loja__sub">
          Precisamos identificar você para registrar o pedido e acompanhar a entrega.
        </p>

        <a className="opcao-acesso opcao-acesso--google" href="/api/loja/auth/google">
          <span className="opcao-acesso__icone" aria-hidden="true">
            {/* Marca do Google em suas quatro cores oficiais */}
            <svg width="19" height="19" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.5-9.5 6.5-16.5Z" />
              <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.8C8 41.3 15.4 46 24 46Z" />
              <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.8H4.3C2.8 17 2 20.4 2 24s.8 7 2.3 9.9l7.3-5.8Z" />
              <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.3 14.1l7.3 5.8c1.7-5.2 6.6-9.1 12.4-9.1Z" />
            </svg>
          </span>
          Entrar com Google
        </a>

        <button className="opcao-acesso" type="button" onClick={() => setEtapa('entrar')}>
          <span className="opcao-acesso__icone" aria-hidden="true"><IconeEnvelope /></span>
          Entrar com e-mail e senha
        </button>

        <div className="acesso-loja__divisor"><span>ainda não tem conta?</span></div>

        <button className="btn btn--primario btn--bloco" onClick={() => setEtapa('cadastrar')}>
          Criar minha conta
        </button>
      </div>
    );
  }

  /* ---------------------------- entrar ----------------------------- */
  if (etapa === 'entrar') {
    return (
      <form className="acesso-loja" onSubmit={(evento) => void enviar(evento, 'login')}>
        <button type="button" className="acesso-loja__voltar" onClick={() => setEtapa('escolha')}>
          Outras formas de entrar
        </button>

        <h2 className="acesso-loja__titulo">Entrar</h2>

        <div className="campo">
          <label htmlFor="cli-email">E-mail</label>
          <input id="cli-email" name="email" type="email" required autoFocus
                 autoComplete="username" placeholder="voce@email.com" />
        </div>

        <div className="campo" style={{ marginTop: 12 }}>
          <label htmlFor="cli-senha">Senha</label>
          <div className="campo-senha">
            <input id="cli-senha" name="senha" type={verSenha ? 'text' : 'password'}
                   required autoComplete="current-password" placeholder="••••••••" />
            <button type="button" className="campo-senha__olho"
                    onClick={() => setVerSenha((atual) => !atual)}
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              <Olho aberto={verSenha} />
            </button>
          </div>
        </div>

        {falha && <div className="acesso-loja__erro" role="alert">{falha}</div>}

        <button className="btn btn--primario btn--bloco" type="submit"
                style={{ marginTop: 18 }} disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <button type="button" className="acesso-loja__link" onClick={() => setEtapa('cadastrar')}>
          Não tenho conta — quero me cadastrar
        </button>
      </form>
    );
  }

  /* --------------------------- cadastrar --------------------------- */
  return (
    <form className="acesso-loja" onSubmit={(evento) => void enviar(evento, 'cadastro')}>
      <button type="button" className="acesso-loja__voltar" onClick={() => setEtapa('escolha')}>
        Outras formas de entrar
      </button>

      <h2 className="acesso-loja__titulo">Criar conta</h2>

      <div className="campo">
        <label htmlFor="cad-nome">Nome completo</label>
        <input id="cad-nome" name="nome" required autoFocus maxLength={120}
               placeholder="Como no seu documento" />
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="cad-email">E-mail</label>
        <input id="cad-email" name="email" type="email" required maxLength={160}
               autoComplete="email" placeholder="voce@email.com" />
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="cad-cpf">CPF</label>
        <input id="cad-cpf" name="cpf" required inputMode="numeric" value={cpf}
               onChange={(evento) => setCpf(formatarCpf(evento.target.value))}
               placeholder="000.000.000-00" />
        <span className="campo__dica">Usado para emitir a nota do pedido.</span>
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="cad-senha">Senha</label>
        <div className="campo-senha">
          <input id="cad-senha" name="senha" type={verSenha ? 'text' : 'password'}
                 required minLength={8} autoComplete="new-password" placeholder="mínimo 8 caracteres" />
          <button type="button" className="campo-senha__olho"
                  onClick={() => setVerSenha((atual) => !atual)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
            <Olho aberto={verSenha} />
          </button>
        </div>
      </div>

      {falha && <div className="acesso-loja__erro" role="alert">{falha}</div>}

      <button className="btn btn--primario btn--bloco" type="submit"
              style={{ marginTop: 18 }} disabled={enviando}>
        {enviando ? 'Criando…' : 'Criar conta e continuar'}
      </button>

      <button type="button" className="acesso-loja__link" onClick={() => setEtapa('entrar')}>
        Já tenho conta — quero entrar
      </button>
    </form>
  );
}
