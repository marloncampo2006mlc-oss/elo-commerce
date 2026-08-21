'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toasts';
import { Olho } from '@/components/Icone';
import { IconeCheck, IconeEnvelope } from '@/components/Icones';
import { IconeGoogle } from './IconesLoja';

/**
 * Etapas do acesso do cliente.
 *
 * Uma tela por vez, sempre com um caminho de volta. Empilhar login,
 * cadastro e recuperação num formulário só faria a pessoa ler três vezes
 * mais do que precisa para a tarefa que veio fazer.
 */
type Etapa = 'escolha' | 'entrar' | 'cadastrar' | 'recuperar' | 'redefinir';

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

  /** Levado entre as etapas para a pessoa não redigitar o que já digitou. */
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEmitido, setCodigoEmitido] = useState<string | null>(null);

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

  /** Trocar de etapa nunca leva junto o erro da etapa anterior. */
  function irPara(proxima: Etapa) {
    setFalha(null);
    setVerSenha(false);
    setEtapa(proxima);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>, rota: string) {
    evento.preventDefault();
    setEnviando(true);
    setFalha(null);

    const dados = Object.fromEntries(new FormData(evento.currentTarget).entries());

    try {
      const resposta = await fetch(`/api/loja/auth/${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
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

  /** Passo 1 da recuperação: confirma o e-mail e recebe o código. */
  async function pedirCodigo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setFalha(null);

    try {
      const resposta = await fetch('/api/loja/auth/recuperacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Não foi possível continuar');

      setCodigoEmitido(corpo.data.codigo);
      setCodigo('');
      irPara('redefinir');
    } catch (problema) {
      setFalha(problema instanceof Error ? problema.message : 'Erro inesperado');
    } finally {
      setEnviando(false);
    }
  }

  /** Passo 2: confere o código e grava a senha nova. */
  async function redefinir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setFalha(null);

    const senha = String(new FormData(evento.currentTarget).get('senha') ?? '');

    try {
      const resposta = await fetch('/api/loja/auth/recuperacao/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, senha }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok) {
        throw new Error(corpo.detalhes?.[0]?.mensagem ?? corpo.erro ?? 'Não foi possível continuar');
      }

      sucesso('Senha alterada', 'Entre com a senha nova.');
      setCodigoEmitido(null);
      setCodigo('');
      irPara('entrar');
    } catch (problema) {
      setFalha(problema instanceof Error ? problema.message : 'Erro inesperado');
    } finally {
      setEnviando(false);
    }
  }

  const aviso = falha && <div className="acesso-loja__erro" role="alert">{falha}</div>;

  const voltar = (destino: Etapa, texto: string) => (
    <button type="button" className="acesso-loja__voltar" onClick={() => irPara(destino)}>
      {texto}
    </button>
  );

  /* ---------------------------- escolha ---------------------------- */
  if (etapa === 'escolha') {
    return (
      <div className="acesso-loja">
        <header className="acesso-loja__cabecalho">
          <h2 className="acesso-loja__titulo">Como você quer entrar?</h2>
          <p className="acesso-loja__sub">
            Precisamos identificar você para registrar o pedido e acompanhar a entrega.
          </p>
        </header>

        <div className="acesso-loja__opcoes">
          {googleDisponivel === false ? (
            /* Configuração ausente no servidor. Mostrar o botão ativo faria
               a pessoa sair da loja e voltar com erro; desligado e com o
               motivo à vista, ela escolhe outro caminho na hora. */
            <div className="opcao-acesso opcao-acesso--google opcao-acesso--off"
                 aria-disabled="true">
              <span className="opcao-acesso__icone" aria-hidden="true"><IconeGoogle /></span>
              <span>
                Entrar com Google
                <small>indisponível nesta instalação</small>
              </span>
            </div>
          ) : (
            <a className="opcao-acesso opcao-acesso--google" href="/api/loja/auth/google">
              <span className="opcao-acesso__icone" aria-hidden="true"><IconeGoogle /></span>
              Entrar com Google
            </a>
          )}

          <button className="opcao-acesso" type="button" onClick={() => irPara('entrar')}>
            <span className="opcao-acesso__icone" aria-hidden="true"><IconeEnvelope /></span>
            Entrar com e-mail e senha
          </button>
        </div>

        <div className="acesso-loja__divisor"><span>ainda não tem conta?</span></div>

        <button className="btn btn--primario btn--bloco" onClick={() => irPara('cadastrar')}>
          Criar minha conta
        </button>
      </div>
    );
  }

  /* ---------------------------- entrar ----------------------------- */
  if (etapa === 'entrar') {
    return (
      <form className="acesso-loja" onSubmit={(evento) => void enviar(evento, 'login')}>
        {voltar('escolha', 'Outras formas de entrar')}

        <header className="acesso-loja__cabecalho">
          <h2 className="acesso-loja__titulo">Entrar</h2>
          <p className="acesso-loja__sub">Use o e-mail e a senha da sua conta.</p>
        </header>

        <div className="acesso-loja__campos">
          <div className="campo">
            <label htmlFor="cli-email">E-mail</label>
            <input id="cli-email" name="email" type="email" required autoFocus
                   autoComplete="username" placeholder="voce@email.com"
                   value={email} onChange={(evento) => setEmail(evento.target.value)} />
          </div>

          <div className="campo">
            <div className="campo__linha">
              <label htmlFor="cli-senha">Senha</label>
              {/* O atalho fica junto do campo que falhou, não no rodapé:
                  é ali que a pessoa percebe que não lembra. */}
              <button type="button" className="acesso-loja__link acesso-loja__link--inline"
                      onClick={() => irPara('recuperar')}>
                Esqueci minha senha
              </button>
            </div>
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
        </div>

        {aviso}

        <button className="btn btn--primario btn--bloco" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <button type="button" className="acesso-loja__link" onClick={() => irPara('cadastrar')}>
          Não tenho conta — quero me cadastrar
        </button>
      </form>
    );
  }

  /* --------------------------- recuperar --------------------------- */
  if (etapa === 'recuperar') {
    return (
      <form className="acesso-loja" onSubmit={(evento) => void pedirCodigo(evento)}>
        {voltar('entrar', 'Voltar para o login')}

        <header className="acesso-loja__cabecalho">
          <h2 className="acesso-loja__titulo">Recuperar senha</h2>
          <p className="acesso-loja__sub">
            Informe o e-mail da sua conta. Vamos gerar um código para você criar uma senha nova.
          </p>
        </header>

        <div className="acesso-loja__campos">
          <div className="campo">
            <label htmlFor="rec-email">E-mail da conta</label>
            <input id="rec-email" type="email" required autoFocus
                   autoComplete="username" placeholder="voce@email.com"
                   value={email} onChange={(evento) => setEmail(evento.target.value)} />
          </div>
        </div>

        {aviso}

        <button className="btn btn--primario btn--bloco" type="submit" disabled={enviando}>
          {enviando ? 'Confirmando…' : 'Continuar'}
        </button>
      </form>
    );
  }

  /* --------------------------- redefinir --------------------------- */
  if (etapa === 'redefinir') {
    return (
      <form className="acesso-loja" onSubmit={(evento) => void redefinir(evento)}>
        {voltar('recuperar', 'Usar outro e-mail')}

        <header className="acesso-loja__cabecalho">
          <h2 className="acesso-loja__titulo">Nova senha</h2>
          <p className="acesso-loja__sub">
            Confirmamos a conta de <strong>{email}</strong>.
          </p>
        </header>

        {/* Sem serviço de e-mail configurado, o código aparece aqui.
            Em produção ele chegaria na caixa de entrada — o aviso deixa
            isso explícito em vez de fingir que houve um envio. */}
        {codigoEmitido && (
          <div className="codigo-demo">
            <span className="codigo-demo__rotulo">Seu código de verificação</span>
            <strong className="codigo-demo__valor">{codigoEmitido}</strong>
            <button type="button" className="btn btn--sm"
                    onClick={() => setCodigo(codigoEmitido)}>
              <IconeCheck tamanho={14} /> Usar este código
            </button>
            <span className="codigo-demo__nota">
              Vale por 15 minutos. Numa loja de verdade ele chegaria por e-mail;
              aqui não há serviço de envio configurado.
            </span>
          </div>
        )}

        <div className="acesso-loja__campos">
          <div className="campo">
            <label htmlFor="rec-codigo">Código de 6 dígitos</label>
            <input id="rec-codigo" inputMode="numeric" required maxLength={6}
                   className="mono" placeholder="000000" autoComplete="one-time-code"
                   value={codigo}
                   onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ''))} />
          </div>

          <div className="campo">
            <label htmlFor="rec-senha">Senha nova</label>
            <div className="campo-senha">
              <input id="rec-senha" name="senha" type={verSenha ? 'text' : 'password'}
                     required minLength={8} autoComplete="new-password"
                     placeholder="mínimo 8 caracteres" />
              <button type="button" className="campo-senha__olho"
                      onClick={() => setVerSenha((atual) => !atual)}
                      aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                <Olho aberto={verSenha} />
              </button>
            </div>
            <span className="campo__dica">Depois de salvar, use esta senha para entrar.</span>
          </div>
        </div>

        {aviso}

        <button className="btn btn--primario btn--bloco" type="submit"
                disabled={enviando || codigo.length !== 6}>
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    );
  }

  /* --------------------------- cadastrar --------------------------- */
  return (
    <form className="acesso-loja" onSubmit={(evento) => void enviar(evento, 'cadastro')}>
      {voltar('escolha', 'Outras formas de entrar')}

      <header className="acesso-loja__cabecalho">
        <h2 className="acesso-loja__titulo">Criar conta</h2>
        <p className="acesso-loja__sub">Leva menos de um minuto.</p>
      </header>

      <div className="acesso-loja__campos">
        <div className="campo">
          <label htmlFor="cad-nome">Nome completo</label>
          <input id="cad-nome" name="nome" required autoFocus maxLength={120}
                 placeholder="Como no seu documento" />
        </div>

        <div className="campo">
          <label htmlFor="cad-email">E-mail</label>
          <input id="cad-email" name="email" type="email" required maxLength={160}
                 autoComplete="email" placeholder="voce@email.com"
                 value={email} onChange={(evento) => setEmail(evento.target.value)} />
        </div>

        <div className="campo">
          <label htmlFor="cad-senha">Senha</label>
          <div className="campo-senha">
            <input id="cad-senha" name="senha" type={verSenha ? 'text' : 'password'}
                   required minLength={8} autoComplete="new-password"
                   placeholder="mínimo 8 caracteres" />
            <button type="button" className="campo-senha__olho"
                    onClick={() => setVerSenha((atual) => !atual)}
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              <Olho aberto={verSenha} />
            </button>
          </div>
        </div>
      </div>

      {aviso}

      <button className="btn btn--primario btn--bloco" type="submit" disabled={enviando}>
        {enviando ? 'Criando…' : 'Criar conta e continuar'}
      </button>

      <button type="button" className="acesso-loja__link" onClick={() => irPara('entrar')}>
        Já tenho conta — quero entrar
      </button>
    </form>
  );
}
