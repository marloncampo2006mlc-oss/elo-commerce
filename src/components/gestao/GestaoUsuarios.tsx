'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toasts';
import { dataCurta } from '@/lib/formato';
import {
  DESCRICAO_PAPEL, PAPEIS, PRIVILEGIOS, privilegiosDoPapel,
  type Usuario,
} from '@/modules/usuarios/usuarios.types';
import type { PapelUsuario } from '@/lib/sessao';

const COR_PAPEL: Record<PapelUsuario, string> = {
  administrador: 'vermelho', gerente: 'violeta', supervisor: 'ciano', atendente: 'verde',
};

const ICONE_PAPEL: Record<PapelUsuario, string> = {
  administrador: '🛡', gerente: '📋', supervisor: '📊', atendente: '🎧',
};

/** Senha forte sem caracteres ambíguos (l/1, O/0) para ditar sem erro. */
function gerarSenha(): string {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const valores = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(valores, (valor) => alfabeto[valor % alfabeto.length]).join('');
}

export function GestaoUsuarios({ usuarios, meuId }: { usuarios: Usuario[]; meuId: string }) {
  const router = useRouter();
  const { sucesso, erro } = useToast();

  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<'' | PapelUsuario>('');
  const [criando, setCriando] = useState(false);
  const [detalhe, setDetalhe] = useState<Usuario | null>(null);
  const [verMatriz, setVerMatriz] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const [form, setForm] = useState({
    nome: '', email: '', papel: 'atendente' as PapelUsuario, senha: gerarSenha(),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const casaBusca = !termo
        || usuario.nome.toLowerCase().includes(termo)
        || usuario.email.toLowerCase().includes(termo);
      return casaBusca && (!filtroPapel || usuario.papel === filtroPapel);
    });
  }, [usuarios, busca, filtroPapel]);

  const ativos = usuarios.filter((usuario) => usuario.ativo).length;
  const admins = usuarios.filter((u) => u.papel === 'administrador' && u.ativo).length;
  const nuncaEntraram = usuarios.filter((usuario) => !usuario.ultimo_acesso).length;

  async function chamar(url: string, metodo: string, corpo?: object) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      throw new Error(dados.detalhes?.[0]?.mensagem ?? dados.erro ?? 'Operação recusada');
    }
    return dados.data;
  }

  async function criar() {
    setOcupado(true);
    try {
      await chamar('/api/gestao/usuarios', 'POST', form);
      setCriando(false);
      setSenhaGerada({ email: form.email, senha: form.senha });
      setCopiado(false);
      sucesso('Usuário criado', form.nome);
      router.refresh();
    } catch (falha) {
      erro('Não foi possível criar', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  async function editar(mudanca: { papel?: PapelUsuario; ativo?: boolean }) {
    if (!detalhe) return;
    setOcupado(true);
    try {
      const atualizado = await chamar(`/api/gestao/usuarios/${detalhe.id}`, 'PATCH', mudanca);
      setDetalhe(atualizado as Usuario);
      sucesso('Acesso atualizado', (atualizado as Usuario).nome);
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
      await chamar(`/api/gestao/usuarios/${usuario.id}/senha`, 'PUT', { senha: nova });
      setDetalhe(null);
      setSenhaGerada({ email: usuario.email, senha: nova });
      setCopiado(false);
    } catch (falha) {
      erro('Não foi possível redefinir', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      {/* ---------- panorama ---------- */}
      <section className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <span className="kpi__icone">👥</span>
          <div className="kpi__rotulo">Com acesso</div>
          <div className="kpi__valor">{ativos}</div>
          <div className="kpi__nota">
            {usuarios.length - ativos > 0
              ? `${usuarios.length - ativos} bloqueado(s)`
              : 'nenhum bloqueado'}
          </div>
        </div>
        <div className="kpi">
          <span className="kpi__icone">🛡</span>
          <div className="kpi__rotulo">Administradores</div>
          <div className="kpi__valor">{admins}</div>
          <div className="kpi__nota">
            {admins === 1 ? 'só um — considere ter outro' : 'acesso total à plataforma'}
          </div>
        </div>
        <div className="kpi">
          <span className="kpi__icone">🔑</span>
          <div className="kpi__rotulo">Nunca entraram</div>
          <div className="kpi__valor">{nuncaEntraram}</div>
          <div className="kpi__nota">aguardando o primeiro acesso</div>
        </div>
        <div className="kpi">
          <span className="kpi__icone">⚙</span>
          <div className="kpi__rotulo">Perfis disponíveis</div>
          <div className="kpi__valor">{PAPEIS.length}</div>
          <div className="kpi__nota">
            <button className="btn btn--sm btn--fantasma" style={{ padding: 0 }}
                    onClick={() => setVerMatriz(true)}>
              ver o que cada um pode →
            </button>
          </div>
        </div>
      </section>

      {/* ---------- barra de ferramentas ---------- */}
      <div className="filtros">
        <div className="busca">
          <input value={busca} onChange={(evento) => setBusca(evento.target.value)}
                 placeholder="Buscar por nome ou e-mail…" aria-label="Buscar usuário" />
        </div>

        <select className="filtro" value={filtroPapel} aria-label="Filtrar por perfil"
                onChange={(evento) => setFiltroPapel(evento.target.value as '' | PapelUsuario)}>
          <option value="">Todos os perfis</option>
          {PAPEIS.map((papel) => (
            <option key={papel} value={papel}>
              {papel} ({usuarios.filter((u) => u.papel === papel).length})
            </option>
          ))}
        </select>

        <button className="btn btn--primario" style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setForm({ nome: '', email: '', papel: 'atendente', senha: gerarSenha() });
                  setCriando(true);
                }}>
          ＋ Novo usuário
        </button>
      </div>

      {/* ---------- tabela ---------- */}
      <div className="cartao">
        {filtrados.length === 0 ? (
          <div className="vazio">
            <div className="vazio__icone">🔎</div>
            <strong>Ninguém encontrado</strong>
            <p style={{ marginTop: 6 }}>Ajuste a busca ou o filtro de perfil.</p>
          </div>
        ) : (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th><th>Perfil</th><th>Pode fazer</th>
                  <th>Situação</th><th>Último acesso</th><th />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((usuario) => {
                  const quantos = privilegiosDoPapel(usuario.papel).length;
                  return (
                    <tr key={usuario.id} style={{ opacity: usuario.ativo ? 1 : 0.5 }}>
                      <td>
                        <div className="flex">
                          <span className="avatar">{usuario.nome.slice(0, 2).toUpperCase()}</span>
                          <div>
                            <div style={{ fontWeight: 550 }}>
                              {usuario.nome}
                              {usuario.id === meuId && (
                                <span className="selo selo--cinza" style={{ marginLeft: 6 }}>você</span>
                              )}
                            </div>
                            <div className="dim" style={{ fontSize: 11.5 }}>{usuario.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`selo selo--${COR_PAPEL[usuario.papel]}`}>
                          {ICONE_PAPEL[usuario.papel]} {usuario.papel}
                        </span>
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <div className="dim" style={{ fontSize: 11.5 }}>
                          {quantos} de {PRIVILEGIOS.length} privilégios
                        </div>
                        <div className="barra-prog" style={{ maxWidth: 110 }}>
                          <i style={{ width: `${(quantos / PRIVILEGIOS.length) * 100}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={`selo selo--${usuario.ativo ? 'verde' : 'cinza'}`}>
                          {usuario.ativo ? 'ativo' : 'bloqueado'}
                        </span>
                      </td>
                      <td className="dim">
                        {usuario.ultimo_acesso
                          ? dataCurta(usuario.ultimo_acesso)
                          : <span className="selo selo--ambar">nunca entrou</span>}
                      </td>
                      <td className="acoes">
                        <button className="btn btn--sm" onClick={() => setDetalhe(usuario)}>
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- criar ---------- */}
      {criando && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setCriando(false)} />
          <div className="modal__caixa" role="dialog" aria-modal="true" aria-label="Novo usuário">
            <header className="modal__topo">
              <h2>Novo usuário</h2>
              <button className="btn btn--sm btn--fantasma" style={{ marginLeft: 'auto' }}
                      onClick={() => setCriando(false)} aria-label="Fechar">✕</button>
            </header>

            <div className="modal__corpo">
              <div className="campo">
                <label htmlFor="nome">Nome completo</label>
                <input id="nome" value={form.nome} maxLength={120} autoFocus
                       onChange={(evento) => setForm({ ...form, nome: evento.target.value })}
                       placeholder="Ex.: Ana Beatriz Lima" />
              </div>

              <div className="campo" style={{ marginTop: 14 }}>
                <label htmlFor="email">E-mail de acesso</label>
                <input id="email" type="email" value={form.email} maxLength={160}
                       onChange={(evento) => setForm({ ...form, email: evento.target.value })}
                       placeholder="ana@empresa.com" />
                <span className="campo__dica">É com este e-mail que a pessoa faz login.</span>
              </div>

              <div className="campo" style={{ marginTop: 16 }}>
                <label>Perfil de acesso</label>
                <div className="perfis">
                  {PAPEIS.map((papel) => (
                    <button key={papel} type="button"
                            className={`perfil ${form.papel === papel ? 'perfil--ativo' : ''}`}
                            onClick={() => setForm({ ...form, papel })}
                            aria-pressed={form.papel === papel}>
                      <span className="perfil__icone">{ICONE_PAPEL[papel]}</span>
                      <span className="perfil__nome">{papel}</span>
                      <span className="perfil__qtd">
                        {privilegiosDoPapel(papel).length}/{PRIVILEGIOS.length}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="campo__dica">{DESCRICAO_PAPEL[form.papel]}</span>
              </div>

              <div className="previa-privilegios">
                <div className="lateral__grupo" style={{ padding: '0 0 8px' }}>
                  Esta pessoa poderá
                </div>
                {PRIVILEGIOS.map((privilegio) => {
                  const tem = privilegio.papeis.includes(form.papel);
                  return (
                    <div key={privilegio.chave} className={`priv ${tem ? '' : 'priv--nao'}`}>
                      <span className="priv__marca">{tem ? '✓' : '✕'}</span>
                      <span>{privilegio.rotulo}</span>
                    </div>
                  );
                })}
              </div>

              <div className="campo" style={{ marginTop: 16 }}>
                <label htmlFor="senha">Senha inicial</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input id="senha" value={form.senha} className="mono" maxLength={200}
                         onChange={(evento) => setForm({ ...form, senha: evento.target.value })} />
                  <button className="btn btn--sm" type="button"
                          onClick={() => setForm({ ...form, senha: gerarSenha() })}>
                    ↻ Gerar
                  </button>
                </div>
                <span className="campo__dica">
                  Exibida uma única vez após criar — o banco guarda só o hash.
                </span>
              </div>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setCriando(false)}>Cancelar</button>
                <button className="btn btn--primario"
                        disabled={ocupado || form.nome.trim().length < 3
                          || !form.email.includes('@') || form.senha.length < 8}
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
            <header className="modal__topo"><h2>Guarde esta senha agora</h2></header>
            <div className="modal__corpo">
              <p className="dim" style={{ marginBottom: 16 }}>
                Ela não aparece de novo. Se perder, é só redefinir por aqui.
              </p>

              <div className="senha-caixa">
                <div className="dim" style={{ fontSize: 12 }}>{senhaGerada.email}</div>
                <div className="senha-caixa__valor">{senhaGerada.senha}</div>
                <button className="btn btn--sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(senhaGerada.senha);
                          setCopiado(true);
                        }}>
                  {copiado ? '✓ Copiado' : 'Copiar senha'}
                </button>
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

      {/* ---------- painel de detalhes ---------- */}
      {detalhe && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setDetalhe(null)} />
          <aside className="painel-lateral" role="dialog" aria-modal="true"
                 aria-label={`Gerenciar ${detalhe.nome}`}>
            <header className="modal__topo">
              <div className="flex">
                <span className="avatar">{detalhe.nome.slice(0, 2).toUpperCase()}</span>
                <div>
                  <h2 style={{ fontSize: 15 }}>{detalhe.nome}</h2>
                  <p className="dim" style={{ fontSize: 12 }}>{detalhe.email}</p>
                </div>
              </div>
              <button className="btn btn--sm btn--fantasma" style={{ marginLeft: 'auto' }}
                      onClick={() => setDetalhe(null)} aria-label="Fechar">✕</button>
            </header>

            <div className="modal__corpo">
              <div className="flex" style={{ gap: 8, marginBottom: 20 }}>
                <span className={`selo selo--${COR_PAPEL[detalhe.papel]}`}>
                  {ICONE_PAPEL[detalhe.papel]} {detalhe.papel}
                </span>
                <span className={`selo selo--${detalhe.ativo ? 'verde' : 'cinza'}`}>
                  {detalhe.ativo ? 'ativo' : 'bloqueado'}
                </span>
                <span className="dim" style={{ fontSize: 12, marginLeft: 'auto' }}>
                  desde {dataCurta(detalhe.created_at)}
                </span>
              </div>

              <div className="campo">
                <label>Trocar perfil</label>
                <div className="perfis">
                  {PAPEIS.map((papel) => (
                    <button key={papel} type="button"
                            className={`perfil ${detalhe.papel === papel ? 'perfil--ativo' : ''}`}
                            disabled={detalhe.id === meuId || ocupado}
                            onClick={() => void editar({ papel })}
                            aria-pressed={detalhe.papel === papel}>
                      <span className="perfil__icone">{ICONE_PAPEL[papel]}</span>
                      <span className="perfil__nome">{papel}</span>
                    </button>
                  ))}
                </div>
                {detalhe.id === meuId && (
                  <span className="campo__dica">
                    Você não pode mudar o próprio perfil — é o que impede perder o acesso por engano.
                  </span>
                )}
              </div>

              <div className="previa-privilegios" style={{ marginTop: 18 }}>
                <div className="lateral__grupo" style={{ padding: '0 0 8px' }}>
                  Privilégios deste perfil
                </div>
                {PRIVILEGIOS.map((privilegio) => {
                  const tem = privilegio.papeis.includes(detalhe.papel);
                  return (
                    <div key={privilegio.chave} className={`priv ${tem ? '' : 'priv--nao'}`}>
                      <span className="priv__marca">{tem ? '✓' : '✕'}</span>
                      <div>
                        <div>{privilegio.rotulo}</div>
                        <div className="dim" style={{ fontSize: 11 }}>{privilegio.descricao}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lateral__grupo" style={{ paddingLeft: 0 }}>Ações</div>
              <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn--sm" disabled={ocupado}
                        onClick={() => void redefinirSenha(detalhe)}>
                  🔑 Redefinir senha
                </button>
                {detalhe.id !== meuId && (
                  <button className={`btn btn--sm ${detalhe.ativo ? 'btn--perigo' : ''}`}
                          disabled={ocupado}
                          onClick={() => void editar({ ativo: !detalhe.ativo })}>
                    {detalhe.ativo ? '🚫 Bloquear acesso' : '✓ Reativar acesso'}
                  </button>
                )}
              </div>

              <p className="dim" style={{ fontSize: 11.5, marginTop: 14 }}>
                Bloquear não apaga nada: o histórico da pessoa continua, ela só deixa de conseguir entrar.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ---------- matriz completa ---------- */}
      {verMatriz && (
        <div className="modal">
          <div className="modal__fundo" onClick={() => setVerMatriz(false)} />
          <div className="modal__caixa modal__caixa--largo" role="dialog" aria-modal="true">
            <header className="modal__topo">
              <h2>O que cada perfil pode fazer</h2>
              <button className="btn btn--sm btn--fantasma" style={{ marginLeft: 'auto' }}
                      onClick={() => setVerMatriz(false)} aria-label="Fechar">✕</button>
            </header>
            <div className="modal__corpo">
              <div className="tabela-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Privilégio</th>
                      {PAPEIS.map((papel) => (
                        <th key={papel} className="num">{ICONE_PAPEL[papel]} {papel}</th>
                      ))}
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

              <p className="dim" style={{ fontSize: 12, marginTop: 16 }}>
                Estes privilégios são verificados <strong>no servidor</strong>, em cada rota da API.
                Esconder um botão não impede nada: quem chamar a API sem o perfil correto
                recebe <code>403</code>.
              </p>

              <div className="modal__rodape">
                <button className="btn" onClick={() => setVerMatriz(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
