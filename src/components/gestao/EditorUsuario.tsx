'use client';

import { useState } from 'react';
import { PainelLateral } from '@/components/Modal';
import { useToast } from '@/components/Toasts';
import { dataCurta } from '@/lib/formato';
import {
  DESCRICAO_PAPEL, PAPEIS, PRIVILEGIOS, privilegiosDoPapel, privilegiosEfetivos,
  temPersonalizacao, type Usuario,
} from '@/modules/usuarios/usuarios.types';
import type { PapelUsuario } from '@/lib/sessao';

export const COR_PAPEL: Record<PapelUsuario, string> = {
  administrador: 'vermelho', gerente: 'violeta', supervisor: 'ciano', atendente: 'verde',
};

export const ICONE_PAPEL: Record<PapelUsuario, string> = {
  administrador: '🛡', gerente: '📋', supervisor: '📊', atendente: '🎧',
};

interface Props {
  usuario: Usuario;
  meuId: string;
  aoFechar: () => void;
  aoSalvar: (usuario: Usuario) => void;
  aoRedefinirSenha: (usuario: Usuario) => void;
}

export function EditorUsuario({ usuario, meuId, aoFechar, aoSalvar, aoRedefinirSenha }: Props) {
  const { sucesso, erro } = useToast();
  const ehVoce = usuario.id === meuId;

  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [papel, setPapel] = useState<PapelUsuario>(usuario.papel);
  const [personalizado, setPersonalizado] = useState(temPersonalizacao(usuario));
  const [marcados, setMarcados] = useState<Set<string>>(
    new Set(privilegiosEfetivos(usuario)),
  );
  const [salvando, setSalvando] = useState(false);

  const dadosMudaram = nome !== usuario.nome || email !== usuario.email;
  const acessoMudou =
    papel !== usuario.papel
    || personalizado !== temPersonalizacao(usuario)
    || (personalizado && !mesmoConjunto(marcados, new Set(privilegiosEfetivos(usuario))));

  /** Trocar de papel repõe os privilégios daquele papel na lista. */
  function escolherPapel(novo: PapelUsuario) {
    setPapel(novo);
    if (!personalizado) {
      setMarcados(new Set(privilegiosDoPapel(novo).map((privilegio) => privilegio.chave)));
    }
  }

  function alternarPrivilegio(chave: string) {
    setMarcados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(chave)) proximos.delete(chave);
      else proximos.add(chave);
      return proximos;
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      const corpo: Record<string, unknown> = {};
      if (nome !== usuario.nome) corpo.nome = nome.trim();
      if (email !== usuario.email) corpo.email = email.trim();

      if (!ehVoce) {
        if (papel !== usuario.papel) corpo.papel = papel;
        // null devolve a pessoa ao pacote do papel; array fixa a exceção.
        if (personalizado !== temPersonalizacao(usuario) || personalizado) {
          corpo.privilegios = personalizado ? [...marcados] : null;
        }
      }

      if (Object.keys(corpo).length === 0) { aoFechar(); return; }

      const resposta = await fetch(`/api/gestao/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(dados.detalhes?.[0]?.mensagem ?? dados.erro ?? 'Não foi possível salvar');
      }

      sucesso('Usuário atualizado', nome);
      aoSalvar(dados.data as Usuario);
    } catch (falha) {
      erro('Alteração recusada', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAcesso() {
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/gestao/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !usuario.ativo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível');
      sucesso(usuario.ativo ? 'Acesso bloqueado' : 'Acesso reativado', usuario.nome);
      aoSalvar(dados.data as Usuario);
    } catch (falha) {
      erro('Alteração recusada', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  const cabecalho = (
    <div className="flex">
      <span className="avatar">{usuario.nome.slice(0, 2).toUpperCase()}</span>
      <div>
        <h2 style={{ fontSize: 15 }}>{usuario.nome}</h2>
        <p className="dim" style={{ fontSize: 12 }}>
          desde {dataCurta(usuario.created_at)}
          {usuario.ultimo_acesso
            ? ` · último acesso ${dataCurta(usuario.ultimo_acesso)}`
            : ' · nunca entrou'}
        </p>
      </div>
    </div>
  );

  return (
    <PainelLateral titulo={`Editar ${usuario.nome}`} cabecalho={cabecalho} aoFechar={aoFechar}>
      <div className="flex" style={{ gap: 8, marginBottom: 20 }}>
        <span className={`selo selo--${COR_PAPEL[usuario.papel]}`}>
          {ICONE_PAPEL[usuario.papel]} {usuario.papel}
        </span>
        <span className={`selo selo--${usuario.ativo ? 'verde' : 'cinza'}`}>
          {usuario.ativo ? 'ativo' : 'bloqueado'}
        </span>
        {temPersonalizacao(usuario) && (
          <span className="selo selo--ambar">privilégios personalizados</span>
        )}
      </div>

      {/* ---------- dados ---------- */}
      <div className="lateral__grupo" style={{ paddingLeft: 0, paddingTop: 0 }}>Dados</div>

      <div className="campo">
        <label htmlFor="edit-nome">Nome completo</label>
        <input id="edit-nome" value={nome} maxLength={120}
               onChange={(evento) => setNome(evento.target.value)} />
      </div>

      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="edit-email">E-mail de acesso</label>
        <input id="edit-email" type="email" value={email} maxLength={160}
               onChange={(evento) => setEmail(evento.target.value)} />
        {email !== usuario.email && (
          <span className="campo__dica">
            A pessoa passará a entrar com este novo e-mail.
          </span>
        )}
      </div>

      {/* ---------- acesso ---------- */}
      <div className="lateral__grupo" style={{ paddingLeft: 0 }}>Acesso</div>

      {ehVoce ? (
        <div className="aviso">
          Você não pode alterar o próprio perfil nem os próprios privilégios.
          É o que impede alguém de se trancar para fora da plataforma sem querer.
          Nome e e-mail continuam editáveis.
        </div>
      ) : (
        <>
          <div className="perfis">
            {PAPEIS.map((opcao) => (
              <button key={opcao} type="button"
                      className={`perfil ${papel === opcao ? 'perfil--ativo' : ''}`}
                      onClick={() => escolherPapel(opcao)}
                      aria-pressed={papel === opcao}>
                <span className="perfil__icone">{ICONE_PAPEL[opcao]}</span>
                <span className="perfil__nome">{opcao}</span>
                <span className="perfil__qtd">
                  {privilegiosDoPapel(opcao).length}/{PRIVILEGIOS.length}
                </span>
              </button>
            ))}
          </div>
          <span className="campo__dica" style={{ marginTop: 6 }}>{DESCRICAO_PAPEL[papel]}</span>

          <label className="alternador">
            <input type="checkbox" checked={personalizado}
                   onChange={(evento) => {
                     const ligado = evento.target.checked;
                     setPersonalizado(ligado);
                     if (!ligado) {
                       setMarcados(new Set(
                         privilegiosDoPapel(papel).map((privilegio) => privilegio.chave)));
                     }
                   }} />
            <span className="alternador__trilho" aria-hidden="true" />
            <span>
              <strong>Escolher privilégios um a um</strong>
              <span className="dim" style={{ display: 'block', fontSize: 11.5 }}>
                Ignora o pacote do perfil e usa exatamente o que você marcar
              </span>
            </span>
          </label>
        </>
      )}

      {/* ---------- privilégios ---------- */}
      <div className="previa-privilegios" style={{ marginTop: 14 }}>
        <div className="flex entre" style={{ marginBottom: 8 }}>
          <div className="lateral__grupo" style={{ padding: 0 }}>
            {personalizado ? 'Privilégios desta pessoa' : `Privilégios de ${papel}`}
          </div>
          <span className="dim" style={{ fontSize: 11.5 }}>
            {marcados.size} de {PRIVILEGIOS.length}
          </span>
        </div>

        {PRIVILEGIOS.map((privilegio) => {
          const tem = marcados.has(privilegio.chave);
          const editavel = personalizado && !ehVoce;

          return (
            <label key={privilegio.chave}
                   className={`priv-item ${tem ? '' : 'priv-item--nao'} ${
                     editavel ? 'priv-item--editavel' : ''}`}>
              <input type="checkbox" checked={tem} disabled={!editavel}
                     onChange={() => alternarPrivilegio(privilegio.chave)} />
              <span className="priv-item__marca" aria-hidden="true">{tem ? '✓' : '✕'}</span>
              <span>
                <span className="priv-item__rotulo">{privilegio.rotulo}</span>
                <span className="priv-item__desc">{privilegio.descricao}</span>
              </span>
            </label>
          );
        })}

        {personalizado && !ehVoce && (
          <p className="dim" style={{ fontSize: 11.5, marginTop: 10 }}>
            Clique em cada linha para conceder ou remover. O perfil continua servindo
            de rótulo, mas quem manda é esta lista.
          </p>
        )}
      </div>

      {/* ---------- ações ---------- */}
      <div className="modal__rodape" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn btn--sm" disabled={salvando}
                  onClick={() => aoRedefinirSenha(usuario)}>
            🔑 Redefinir senha
          </button>
          {!ehVoce && (
            <button className={`btn btn--sm ${usuario.ativo ? 'btn--perigo' : ''}`}
                    disabled={salvando} onClick={() => void alternarAcesso()}>
              {usuario.ativo ? 'Bloquear' : 'Reativar'}
            </button>
          )}
        </div>

        <div className="flex" style={{ gap: 8 }}>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn--primario"
                  disabled={salvando || (!dadosMudaram && !acessoMudou)
                    || nome.trim().length < 3 || !email.includes('@')}
                  onClick={() => void salvar()}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </PainelLateral>
  );
}

function mesmoConjunto(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((item) => b.has(item));
}
