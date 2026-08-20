'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/Toasts';
import { dataCurta } from '@/lib/formato';
import {
  DESCRICAO_PAPEL, PAPEIS, PRIVILEGIOS, privilegiosDoPapel,
  type Usuario,
} from '@/modules/usuarios/usuarios.types';
import type { PapelUsuario } from '@/lib/sessao';

const CorPapel: Record<PapelUsuario, string> = {
  administrador: 'vermelho', gerente: 'violeta', supervisor: 'ciano', atendente: 'verde',
};

/** Senha inicial forte, sem caracteres ambíguos (l/1, O/0). */
function gerarSenha(): string {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const valores = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(valores, (valor) => alfabeto[valor % alfabeto.length]).join('');
}

export function GestaoUsuarios({ usuarios, meuId }: { usuarios: Usuario[]; meuId: string }) {
  const router = useRouter();
  const { sucesso, erro } = useToast();

  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [verPrivilegios, setVerPrivilegios] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [form, setForm] = useState({
    nome: '', email: '', papel: 'atendente' as PapelUsuario, senha: gerarSenha(),
  });

  function abrirCriacao() {
    setForm({ nome: '', email: '', papel: 'atendente', senha: gerarSenha() });
    setCriando(true);
  }

  async function criar() {
    setOcupado(true);
    try {
      const resposta = await fetch('/api/gestao/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        const detalhe = corpo.detalhes?.[0]?.mensagem;
        throw new Error(detalhe ?? corpo.erro ?? 'Falha ao criar');
      }
      setCriando(false);
      setSenhaGerada({ email: form.email, senha: form.senha });
      sucesso('Usuário criado', form.nome);
      router.refresh();
    } catch (falha) {
      erro('Não foi possível criar', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  async function salvarEdicao(mudanca: { papel?: PapelUsuario; ativo?: boolean }) {
    if (!editando) return;
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/gestao/usuarios/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mudanca),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Falha ao salvar');
      setEditando(null);
      sucesso('Acesso atualizado');
      router.refresh();
    } catch (falha) {
      erro('Alteração recusada', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  async function redefinirSenha(usuario: Usuario) {
    const nova = gerarSenha();
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/gestao/usuarios/${usuario.id}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: nova }),
      });
      if (!resposta.ok) throw new Error((await resposta.json()).erro ?? 'Falha');
      setEditando(null);
      setSenhaGerada({ email: usuario.email, senha: nova });
    } catch (falha) {
      erro('Não foi possível redefinir', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="flex" style={{ gap: 8, marginBottom: 16 }}>
        <button className="btn btn--primario" onClick={abrirCriacao}>＋ Novo usuário</button>
        <button className="btn" onClick={() => setVerPrivilegios(true)}>
          Ver privilégios de cada perfil
        </button>
      </div>

      <div className="cartao">
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th><th>Perfil</th><th>Privilégios</th>
                <th>Situação</th><th>Último acesso</th><th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} style={{ opacity: usuario.ativo ? 1 : 0.55 }}>
                  <td>
                    <div className="flex">
                      <span className="avatar">{usuario.nome.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <div style={{ fontWeight: 550 }}>
                          {usuario.nome}
                          {usuario.id === meuId && (
                            <span className="dim" style={{ fontWeight: 400 }}> · você</span>
                          )}
                        </div>
                        <div className="dim" style={{ fontSize: 11.5 }}>{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`selo selo--${CorPapel[usuario.papel]}`}>{usuario.papel}</span></td>
                  <td className="dim" style={{ fontSize: 12 }}>
                    {privilegiosDoPapel(usuario.papel).length} de {PRIVILEGIOS.length}
                  </td>
                  <td>
                    <span className={`selo selo--${usuario.ativo ? 'verde' : 'cinza'}`}>
                      {usuario.ativo ? 'ativo' : 'bloqueado'}
                    </span>
                  </td>
                  <td className="dim">
                    {usuario.ultimo_acesso ? dataCurta(usuario.ultimo_acesso) : 'nunca entrou'}
                  </td>
                  <td className="acoes">
                    <button className="btn btn--sm" onClick={() => setEditando(usuario)}>
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- criar ---------- */}
      {criando && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setCriando(false)} />
          <div className="modal__caixa" role="dialog" aria-modal="true" aria-label="Novo usuário">
            <header className="modal__topo"><h2>Novo usuário</h2></header>
            <div className="modal__corpo">
              <div className="campo">
                <label htmlFor="nome">Nome completo</label>
                <input id="nome" value={form.nome} maxLength={120} autoFocus
                       onChange={(evento) => setForm({ ...form, nome: evento.target.value })}
                       placeholder="Ex.: Ana Beatriz Lima" />
              </div>

              <div className="campo" style={{ marginTop: 12 }}>
                <label htmlFor="email">E-mail de acesso</label>
                <input id="email" type="email" value={form.email} maxLength={160}
                       onChange={(evento) => setForm({ ...form, email: evento.target.value })}
                       placeholder="ana@empresa.com" />
              </div>

              <div className="campo" style={{ marginTop: 12 }}>
                <label htmlFor="papel">Perfil de acesso</label>
                <select id="papel" value={form.papel}
                        onChange={(evento) =>
                          setForm({ ...form, papel: evento.target.value as PapelUsuario })}>
                  {PAPEIS.map((papel) => <option key={papel} value={papel}>{papel}</option>)}
                </select>
                <span className="campo__dica">{DESCRICAO_PAPEL[form.papel]}</span>
              </div>

              <div style={{
                marginTop: 12, padding: 12, borderRadius: 9,
                background: 'var(--superficie-2)', border: '1px solid var(--borda)',
              }}>
                <div className="lateral__grupo" style={{ padding: '0 0 6px' }}>
                  O que este perfil poderá fazer
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {privilegiosDoPapel(form.papel).map((privilegio) => (
                    <span key={privilegio.chave} className="selo selo--cinza">
                      {privilegio.rotulo}
                    </span>
                  ))}
                </div>
              </div>

              <div className="campo" style={{ marginTop: 12 }}>
                <label htmlFor="senha">Senha inicial</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input id="senha" value={form.senha} className="mono" maxLength={200}
                         onChange={(evento) => setForm({ ...form, senha: evento.target.value })} />
                  <button className="btn btn--sm" type="button"
                          onClick={() => setForm({ ...form, senha: gerarSenha() })}>
                    Gerar
                  </button>
                </div>
                <span className="campo__dica">
                  Mostrada uma única vez após criar. Combine com a pessoa para ela trocar depois.
                </span>
              </div>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setCriando(false)}>Cancelar</button>
                <button className="btn btn--primario" disabled={ocupado
                          || form.nome.trim().length < 3
                          || !form.email.includes('@')
                          || form.senha.length < 8}
                        onClick={() => void criar()}>
                  {ocupado ? 'Criando…' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- senha exibida uma vez ---------- */}
      {senhaGerada && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setSenhaGerada(null)} />
          <div className="modal__caixa" role="dialog" aria-modal="true">
            <header className="modal__topo"><h2>Guarde esta senha</h2></header>
            <div className="modal__corpo">
              <p className="dim" style={{ marginBottom: 14 }}>
                Ela não será exibida novamente — o banco guarda apenas o hash.
                Se perder, é só redefinir.
              </p>
              <div style={{
                padding: 14, borderRadius: 9, background: 'var(--superficie-2)',
                border: '1px solid var(--borda)',
              }}>
                <div className="dim" style={{ fontSize: 12 }}>{senhaGerada.email}</div>
                <div className="mono" style={{ fontSize: 19, marginTop: 6, letterSpacing: '.04em' }}>
                  {senhaGerada.senha}
                </div>
              </div>
              <div className="modal__rodape">
                <button className="btn btn--primario" onClick={() => setSenhaGerada(null)}>
                  Anotei
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- gerenciar acesso ---------- */}
      {editando && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setEditando(null)} />
          <div className="modal__caixa" role="dialog" aria-modal="true">
            <header className="modal__topo"><h2>{editando.nome}</h2></header>
            <div className="modal__corpo">
              <p className="dim" style={{ marginBottom: 16 }}>{editando.email}</p>

              <div className="campo">
                <label htmlFor="novo-papel">Perfil de acesso</label>
                <select id="novo-papel" defaultValue={editando.papel}
                        disabled={editando.id === meuId}
                        onChange={(evento) =>
                          void salvarEdicao({ papel: evento.target.value as PapelUsuario })}>
                  {PAPEIS.map((papel) => <option key={papel} value={papel}>{papel}</option>)}
                </select>
                {editando.id === meuId && (
                  <span className="campo__dica">
                    Você não pode alterar o próprio perfil — evita perder o acesso por engano.
                  </span>
                )}
              </div>

              <div style={{
                marginTop: 14, padding: 12, borderRadius: 9,
                background: 'var(--superficie-2)', border: '1px solid var(--borda)',
              }}>
                <div className="lateral__grupo" style={{ padding: '0 0 6px' }}>Privilégios atuais</div>
                {PRIVILEGIOS.map((privilegio) => {
                  const tem = privilegio.papeis.includes(editando.papel);
                  return (
                    <div key={privilegio.chave} className="flex entre"
                         style={{ padding: '4px 0', fontSize: 12.5, opacity: tem ? 1 : 0.45 }}>
                      <span>{tem ? '✓' : '✕'} {privilegio.rotulo}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex" style={{ gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn btn--sm" disabled={ocupado}
                        onClick={() => void redefinirSenha(editando)}>
                  Redefinir senha
                </button>
                {editando.id !== meuId && (
                  <button className={`btn btn--sm ${editando.ativo ? 'btn--perigo' : ''}`}
                          disabled={ocupado}
                          onClick={() => void salvarEdicao({ ativo: !editando.ativo })}>
                    {editando.ativo ? 'Bloquear acesso' : 'Reativar acesso'}
                  </button>
                )}
              </div>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setEditando(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- matriz de privilégios ---------- */}
      {verPrivilegios && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setVerPrivilegios(false)} />
          <div className="modal__caixa modal__caixa--largo" role="dialog" aria-modal="true">
            <header className="modal__topo"><h2>O que cada perfil pode fazer</h2></header>
            <div className="modal__corpo">
              <div className="tabela-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Privilégio</th>
                      {PAPEIS.map((papel) => <th key={papel} className="num">{papel}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PRIVILEGIOS.map((privilegio) => (
                      <tr key={privilegio.chave}>
                        <td>
                          <div style={{ fontWeight: 550 }}>{privilegio.rotulo}</div>
                          <div className="dim" style={{ fontSize: 11.5 }}>{privilegio.descricao}</div>
                        </td>
                        {PAPEIS.map((papel) => (
                          <td key={papel} className="num" style={{ fontSize: 15 }}>
                            {privilegio.papeis.includes(papel)
                              ? <span style={{ color: 'var(--verde)' }}>✓</span>
                              : <span className="dim">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="dim" style={{ fontSize: 12, marginTop: 14 }}>
                Estes privilégios são verificados no servidor, em cada rota da API.
                Esconder um botão na tela não impede nada — quem chamar a API direto
                sem o perfil correto recebe <code>403</code>.
              </p>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setVerPrivilegios(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
