'use client';

import Link from 'next/link';
import { useState } from 'react';
import { moeda } from '@/lib/formato';
import { useToast } from '@/components/Toasts';
import { IconeCheck } from '@/components/Icones';

type Forma = 'pix' | 'credito' | 'debito';

interface Cobranca {
  forma: Forma;
  referencia: string;
  numero: number;
  total: number;
  brCode?: string;
  qrcode?: string;
  beneficiario?: string;
  demonstracao?: boolean;
}

const FORMAS: Array<{ id: Forma; rotulo: string; detalhe: string; icone: React.ReactNode }> = [
  {
    id: 'pix',
    rotulo: 'Pix',
    detalhe: 'Aprovação imediata',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.6 21.4 12 12 21.4 2.6 12 12 2.6Z" />
        <path d="M8.4 8.4 12 12l3.6-3.6M8.4 15.6 12 12l3.6 3.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'credito',
    rotulo: 'Cartão de crédito',
    detalhe: 'Em até 10x sem juros',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.4" />
        <path d="M2.6 10h18.8M6.4 14.8h3.4" />
      </svg>
    ),
  },
  {
    id: 'debito',
    rotulo: 'Cartão de débito',
    detalhe: 'Desconto na hora',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.4" />
        <path d="M2.6 10h18.8M15 14.8h3.4" />
      </svg>
    ),
  },
];

export function Pagamento({ pedidoId, numero, total }: {
  pedidoId: string; numero: number; total: number;
}) {
  const { sucesso, erro } = useToast();
  const [forma, setForma] = useState<Forma>('pix');
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setGerando(true);
    try {
      const resposta = await fetch('/api/loja/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, forma }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? 'Não foi possível gerar a cobrança');

      setCobranca(corpo.data as Cobranca);
      setCopiado(false);
    } catch (falha) {
      erro('Falha no pagamento', falha instanceof Error ? falha.message : 'Erro');
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    if (!cobranca?.brCode) return;
    await navigator.clipboard.writeText(cobranca.brCode);
    setCopiado(true);
    sucesso('Código copiado', 'Cole no aplicativo do seu banco');
  }

  /* ---------------------- cobrança gerada ---------------------- */
  if (cobranca) {
    if (cobranca.forma !== 'pix') {
      return (
        <div className="pagamento__resultado">
          <div className="pagamento__selo"><IconeCheck tamanho={22} /></div>
          <h2>Pagamento registrado</h2>
          <p className="dim">
            Pedido <strong>#{cobranca.numero}</strong> · {moeda(cobranca.total)} ·{' '}
            {cobranca.forma === 'credito' ? 'cartão de crédito' : 'cartão de débito'}
          </p>
          <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>
            Referência <span className="mono">{cobranca.referencia}</span>. A captura do cartão
            aconteceria aqui, via provedor de pagamento.
          </p>
          <Link href="/" className="btn btn--primario" style={{ marginTop: 20 }}>
            Voltar à vitrine
          </Link>
        </div>
      );
    }

    return (
      <div className="pagamento__resultado">
        <h2>Pague com Pix</h2>
        <p className="dim">
          Pedido <strong>#{cobranca.numero}</strong> · {moeda(cobranca.total)}
        </p>

        {cobranca.demonstracao && (
          <div className="aviso-demo">
            <strong>Código de demonstração</strong>
            <span>
              Gerado no padrão real do Banco Central, mas com chave de exemplo — nenhum valor é
              transferido. Para usar uma chave real, defina <code>PIX_CHAVE</code> no ambiente.
            </span>
          </div>
        )}

        <div className="pagamento__qr"
             dangerouslySetInnerHTML={{ __html: cobranca.qrcode ?? '' }} />

        <p className="dim" style={{ fontSize: 12.5 }}>
          Beneficiário: <strong>{cobranca.beneficiario}</strong> ·
          referência <span className="mono">{cobranca.referencia}</span>
        </p>

        <div className="pagamento__codigo">
          <code>{cobranca.brCode}</code>
        </div>

        <button className="btn btn--primario btn--bloco" onClick={() => void copiar()}>
          {copiado
            ? <><IconeCheck tamanho={15} /> Código copiado</>
            : 'Copiar código Pix'}
        </button>

        <Link href="/" className="acesso-loja__link" style={{ display: 'block', marginTop: 14 }}>
          Voltar à vitrine
        </Link>
      </div>
    );
  }

  /* ---------------------- escolha da forma ---------------------- */
  return (
    <div className="pagamento">
      <h2 className="acesso-loja__titulo">Como você quer pagar?</h2>
      <p className="acesso-loja__sub">
        Pedido <strong>#{numero}</strong> · total de {moeda(total)}
      </p>

      <div className="formas">
        {FORMAS.map((opcao) => (
          <button key={opcao.id} type="button"
                  className={`forma ${forma === opcao.id ? 'forma--ativa' : ''}`}
                  onClick={() => setForma(opcao.id)}
                  aria-pressed={forma === opcao.id}>
            <span className="forma__icone">{opcao.icone}</span>
            <span className="forma__texto">
              <strong>{opcao.rotulo}</strong>
              <span>{opcao.detalhe}</span>
            </span>
            <span className="forma__marca" aria-hidden="true">
              {forma === opcao.id ? '●' : '○'}
            </span>
          </button>
        ))}
      </div>

      <button className="btn btn--primario btn--bloco" style={{ marginTop: 20 }}
              onClick={() => void gerar()} disabled={gerando}>
        {gerando ? 'Gerando…' : forma === 'pix' ? 'Gerar código Pix' : 'Continuar'}
      </button>
    </div>
  );
}
