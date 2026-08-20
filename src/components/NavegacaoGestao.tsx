'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { SessaoUsuario } from '@/lib/sessao';

const SECOES = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/gestao/painel',   icone: '◈', rotulo: 'Painel' },
      { href: '/gestao/produtos', icone: '▤', rotulo: 'Produtos' },
      { href: '/gestao/pedidos',  icone: '▦', rotulo: 'Pedidos' },
      { href: '/gestao/clientes', icone: '◍', rotulo: 'Clientes' },
    ],
  },
  {
    titulo: 'Atendimento',
    itens: [
      { href: '/gestao/no-code',     icone: '⬡', rotulo: 'No-Code' },
      { href: '/gestao/atendimento', icone: '◐', rotulo: 'Atendimento' },
    ],
  },
  {
    titulo: 'Análise',
    itens: [{ href: '/gestao/bi', icone: '◔', rotulo: 'BI / Supervisão' }],
  },
  {
    titulo: 'Administração',
    itens: [{ href: '/gestao/usuarios', icone: '◍', rotulo: 'Usuários' }],
  },
];

export function NavegacaoGestao({ usuario }: { usuario: SessaoUsuario }) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="lateral">
      <Link href="/gestao/painel" className="lateral__marca">
        <span className="avatar" aria-hidden="true">◆</span>
        <span>
          <strong>Elo Platform</strong>
          <span>gestão</span>
        </span>
      </Link>

      <nav className="lateral__nav" aria-label="Navegação da gestão">
        {SECOES.map((secao) => (
          <div key={secao.titulo}>
            <div className="lateral__grupo">{secao.titulo}</div>
            {secao.itens.map((item) => {
              const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}
                      className={`lateral__item ${ativo ? 'lateral__item--ativo' : ''}`}
                      aria-current={ativo ? 'page' : undefined}>
                  <span className="lateral__icone" aria-hidden="true">{item.icone}</span>
                  {item.rotulo}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="lateral__rodape">
        <Link href="/" className="lateral__item">
          <span className="lateral__icone" aria-hidden="true">◉</span>
          Ver a loja
        </Link>

        <div style={{ padding: '8px 11px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{usuario.nome}</div>
          <div className="dim" style={{ fontSize: 11 }}>{usuario.papel}</div>
        </div>

        <button className="btn btn--sm" onClick={() => void sair()}>Sair</button>
      </div>
    </aside>
  );
}
