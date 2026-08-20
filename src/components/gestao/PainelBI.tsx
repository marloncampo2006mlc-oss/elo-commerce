'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { moeda } from '@/lib/formato';
import { NumeroAnimado } from '@/components/NumeroAnimado';
import { Indicador } from './Indicador';
import { IconeClientes, IconeDinheiro, IconePedidos, IconeRobo } from '@/components/Icones';
import { ROTULOS } from '@/components/SeloStatus';
import { PERIODOS, type Periodo } from '@/modules/indicadores/indicadores.schema';

const CORES = ['#6d4aff', '#17c4e0', '#16a34a', '#d97706', '#db2777', '#8b5cf6'];

/** O tooltip do Recharts entrega o valor como unknown — normalizamos aqui. */
const comoMoeda = (valor: unknown): string => moeda(Number(valor ?? 0));

const NOME_PERIODO: Record<Periodo, string> = {
  hoje: 'Hoje', ontem: 'Ontem', '7dias': '7 dias',
  '30dias': '30 dias', mes: 'Mês atual', tudo: 'Tudo',
};

interface Dados {
  resumo: {
    faturamento: number; pedidos: number; ticket_medio: number; itens_vendidos: number;
    cancelados: number; clientes_novos: number; clientes_total: number;
    atendimentos: number; resolvidos_bot: number; transferidos: number;
  };
  serie: Array<{ dia: string; faturamento: number; pedidos: number }>;
  canais: Array<{ rotulo: string; valor: number; quantidade: number }>;
  status: Array<{ rotulo: string; valor: number; quantidade: number }>;
  produtos: Array<{ nome: string; categoria: string; unidades: number; receita: number }>;
  clientes: Array<{ nome: string; pedidos: number; total: number }>;
  atendimentoCanais: Array<{ rotulo: string; quantidade: number }>;
}

export function PainelBI({ dados, periodo }: { dados: Dados; periodo: Periodo }) {
  const router = useRouter();
  const parametros = useSearchParams();
  // useTransition marca a navegação como não urgente: a tela anterior
  // continua visível e interativa enquanto os novos dados chegam, em vez
  // de piscar em branco.
  const [carregando, iniciarTransicao] = useTransition();

  const trocarPeriodo = (novo: Periodo) => {
    const query = new URLSearchParams(parametros.toString());
    query.set('periodo', novo);
    iniciarTransicao(() => router.replace(`/gestao/bi?${query.toString()}`));
  };

  const { resumo } = dados;
  const taxaBot = resumo.atendimentos > 0
    ? Math.round((resumo.resolvidos_bot / resumo.atendimentos) * 100) : 0;

  const eixo = { stroke: 'var(--texto-3)', fontSize: 11 };
  const tooltipEstilo = {
    background: 'var(--fundo-2)', border: '1px solid var(--borda-forte)',
    borderRadius: 10, fontSize: 12, color: 'var(--texto)',
  };

  return (
    <>
      {/* filtro de período */}
      <div className="flex" style={{ gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {PERIODOS.map((opcao) => (
          <button key={opcao}
                  className={`btn btn--sm ${periodo === opcao ? 'btn--primario' : ''}`}
                  onClick={() => trocarPeriodo(opcao)}
                  aria-pressed={periodo === opcao}>
            {NOME_PERIODO[opcao]}
          </button>
        ))}
        {carregando && <span className="dim" style={{ fontSize: 12 }}>atualizando…</span>}
      </div>

      <section className={`kpis ${carregando ? 'atualizando' : ''}`}>
        <Indicador
          rotulo="Faturamento" tom="violeta" icone={<IconeDinheiro />}
          valor={<NumeroAnimado valor={resumo.faturamento} formatar={moeda} />}
          nota={`ticket médio ${moeda(resumo.ticket_medio)}`} />

        <Indicador
          rotulo="Pedidos" tom="ciano" icone={<IconePedidos tamanho={20} />}
          valor={<NumeroAnimado valor={resumo.pedidos} formatar={(v) => Math.round(v).toString()} />}
          nota={`${resumo.itens_vendidos} itens · ${resumo.cancelados} cancelados`} />

        <Indicador
          rotulo="Clientes novos" tom="verde" icone={<IconeClientes tamanho={20} />}
          valor={<NumeroAnimado valor={resumo.clientes_novos} formatar={(v) => Math.round(v).toString()} />}
          nota={`${resumo.clientes_total} na base total`} />

        <Indicador
          rotulo="Resolvido pelo bot" tom={taxaBot >= 50 ? 'verde' : 'ambar'} icone={<IconeRobo />}
          valor={<NumeroAnimado valor={taxaBot} formatar={(v) => `${Math.round(v)}%`} />}
          nota={`${resumo.atendimentos} atendimentos · ${resumo.transferidos} transferidos`} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="cartao">
          <div className="cartao__topo"><div><h3>Faturamento ao longo do tempo</h3></div></div>
          <div style={{ padding: '16px 12px 8px', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados.serie}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d4aff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6d4aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" vertical={false} />
                <XAxis dataKey="dia" {...eixo} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis {...eixo} tickLine={false} axisLine={false}
                       tickFormatter={(valor: number) => `${(valor / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipEstilo}
                         formatter={(valor) => [comoMoeda(valor), 'Faturamento']} />
                <Area type="monotone" dataKey="faturamento" stroke="#6d4aff" strokeWidth={2}
                      fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cartao">
          <div className="cartao__topo"><div><h3>Faturamento por canal</h3></div></div>
          <div style={{ padding: 14, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados.canais} dataKey="valor" nameKey="rotulo"
                     innerRadius={52} outerRadius={82} paddingAngle={2}>
                  {dados.canais.map((_, indice) => (
                    <Cell key={indice} fill={CORES[indice % CORES.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipEstilo}
                         formatter={(valor) => comoMoeda(valor)} />
                <Legend formatter={(valor: string) => ROTULOS[valor] ?? valor}
                        wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="cartao">
          <div className="cartao__topo"><div><h3>Pedidos por dia</h3></div></div>
          <div style={{ padding: '16px 12px 8px', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" vertical={false} />
                <XAxis dataKey="dia" {...eixo} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis {...eixo} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipEstilo} cursor={{ fill: 'var(--superficie-2)' }} />
                <Bar dataKey="pedidos" fill="#17c4e0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cartao">
          <div className="cartao__topo"><div><h3>Pedidos por status</h3></div></div>
          <div style={{ padding: '16px 12px 8px', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.status} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" horizontal={false} />
                <XAxis type="number" {...eixo} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="rotulo" {...eixo} width={110}
                       tickLine={false} axisLine={false}
                       tickFormatter={(valor: string) => ROTULOS[valor] ?? valor.replace(/_/g, ' ')} />
                <Tooltip contentStyle={tooltipEstilo} cursor={{ fill: 'var(--superficie-2)' }} />
                <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                  {dados.status.map((_, indice) => (
                    <Cell key={indice} fill={CORES[indice % CORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        <div className="cartao">
          <div className="cartao__topo"><div><h3>Produtos mais vendidos</h3></div></div>
          <div className="lista">
            {dados.produtos.length === 0
              ? <p className="dim" style={{ padding: 18 }}>Sem vendas no período.</p>
              : dados.produtos.map((produto) => (
                <div key={produto.nome} className="lista__item">
                  <div className="lista__txt">
                    <strong>{produto.nome}</strong>
                    <span>{produto.unidades} un. · {produto.categoria}</span>
                    <div className="barra-prog">
                      <i style={{ width: `${(produto.receita / dados.produtos[0]!.receita) * 100}%` }} />
                    </div>
                  </div>
                  <span className="lista__valor">{moeda(produto.receita)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="cartao">
          <div className="cartao__topo"><div><h3>Clientes recorrentes</h3></div></div>
          <div className="lista">
            {dados.clientes.map((cliente) => (
              <div key={cliente.nome} className="lista__item">
                <span className="avatar">{cliente.nome.slice(0, 2).toUpperCase()}</span>
                <div className="lista__txt">
                  <strong>{cliente.nome}</strong>
                  <span>{cliente.pedidos} pedidos</span>
                </div>
                <span className="lista__valor">{moeda(cliente.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cartao">
          <div className="cartao__topo"><div><h3>Atendimentos por canal</h3></div></div>
          <div className="lista">
            {dados.atendimentoCanais.length === 0
              ? <p className="dim" style={{ padding: 18 }}>Nenhum atendimento no período.</p>
              : dados.atendimentoCanais.map((canal, indice) => (
                <div key={canal.rotulo} className="lista__item">
                  <span style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: CORES[indice % CORES.length],
                  }} />
                  <div className="lista__txt">
                    <strong>{ROTULOS[canal.rotulo] ?? canal.rotulo}</strong>
                  </div>
                  <span className="lista__valor">{canal.quantidade}</span>
                </div>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}
