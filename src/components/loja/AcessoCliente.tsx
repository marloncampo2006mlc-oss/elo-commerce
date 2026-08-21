'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toasts';
import { Olho } from '@/components/Icone';
import { IconeEnvelope } from '@/components/Icones';
import { IconeGoogle } from './IconesLoja';

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
   * `null` enquanto não sabemos: o botão nasce neutro em vez de piscar
   * de "disponível" para "indisponível" assim que a consulta responde.
   */
  const [googleDisponivel, setGoogleDisponivel] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resposta = await fetch('/api/loja/auth/sessao');
        if (!resposta.ok) return;
        const { data } = await resposta.json();
        setGoogleDisponivel(Boolean(data?.provedores?.google));
      } catch {
        // Sem resposta, o botão fica no estado neutro e o caminho por
        // e-mail continua à vista — que é o que precisa funcionar.
      }
    })();
  }, []);

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

        {googleDisponivel === false ? (
          /* Configuração ausente no servidor. Mostrar o botão ativo faria
             a pessoa sair da loja e voltar com erro; desligado e com o
             motivo à vista, ela escolhe outro caminho na hora. */
          <div className="opcao-acesso opcao-acesso--google opcao-acesso--off"
               aria-disabled="true">
            <span className="opcao-acesso__icone" aria-hidden="true">
              <IconeGoogle />
            </span>
            <span>
              Entrar com Google
              <small>indisponível nesta instalação</small>
            </span>
          </div>
        ) : (
        <a className="opcao-acesso opcao-acesso--google" href="/api/loja/auth/google">
          <span className="opcao-acesso__icone" aria-hidden="true">
            <IconeGoogle />
          </span>
          Entrar com Google
        </a>
        )}

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
