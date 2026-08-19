/**
 * Gráficos em SVG puro — sem biblioteca externa. Cada função recebe
 * dados e devolve markup; o CSS cuida das cores via currentColor/vars.
 */
import { brl, esc } from './ui.js';

/** Gráfico de área com grade, usado para o faturamento diário. */
export function areaChart(pontos, { altura = 210 } = {}) {
  if (!pontos.length) return '';
  const L = 1000;
  const H = altura;
  const padTopo = 14;
  const padBase = 26;
  const maximo = Math.max(...pontos.map((p) => Number(p.valor)), 1);

  const x = (i) => (i / Math.max(1, pontos.length - 1)) * L;
  const y = (v) => padTopo + (1 - Number(v) / maximo) * (H - padTopo - padBase);

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = `${linha} L${L},${H - padBase} L0,${H - padBase} Z`;

  const grade = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const py = padTopo + f * (H - padTopo - padBase);
    return `<line x1="0" y1="${py}" x2="${L}" y2="${py}" stroke="var(--borda)" stroke-width="1" />`;
  }).join('');

  const marcadores = pontos.map((p, i) =>
    `<circle class="ponto" cx="${x(i).toFixed(1)}" cy="${y(p.valor).toFixed(1)}" r="8" fill="transparent">
       <title>${esc(p.rotulo)} · ${brl(p.valor)}</title>
     </circle>`).join('');

  const rotulos = pontos
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % Math.ceil(pontos.length / 6) === 0)
    .map(({ p, i }) =>
      `<text x="${x(i).toFixed(1)}" y="${H - 6}" fill="var(--texto-3)" font-size="17"
             text-anchor="${i === 0 ? 'start' : 'middle'}">${esc(p.rotulo)}</text>`).join('');

  return `<svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" style="width:100%;height:${altura}px;overflow:visible">
    <defs>
      <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c5cff" stop-opacity=".45" />
        <stop offset="100%" stop-color="#7c5cff" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="grad-linha" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7c5cff" /><stop offset="100%" stop-color="#22d3ee" />
      </linearGradient>
    </defs>
    ${grade}
    <path d="${area}" fill="url(#grad-area)" />
    <path d="${linha}" fill="none" stroke="url(#grad-linha)" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    ${marcadores}${rotulos}
  </svg>`;
}

/** Donut para distribuição por canal/status. */
export function donutChart(fatias, { tamanho = 168 } = {}) {
  const total = fatias.reduce((acc, f) => acc + Number(f.valor), 0);
  if (!total) return '<p class="dim texto-centro">Sem dados ainda</p>';

  const R = 60;
  const espessura = 18;
  const circunferencia = 2 * Math.PI * R;
  let acumulado = 0;

  const aneis = fatias.map((f) => {
    const fracao = Number(f.valor) / total;
    const traco = `${(fracao * circunferencia).toFixed(2)} ${circunferencia.toFixed(2)}`;
    const offset = (-acumulado * circunferencia).toFixed(2);
    acumulado += fracao;
    return `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${f.cor}" stroke-width="${espessura}"
              stroke-dasharray="${traco}" stroke-dashoffset="${offset}" transform="rotate(-90 80 80)">
              <title>${esc(f.rotulo)}: ${(fracao * 100).toFixed(1)}%</title>
            </circle>`;
  }).join('');

  const legenda = fatias.map((f) => `
    <div class="flex entre" style="font-size:12.5px;padding:3px 0">
      <span class="flex" style="gap:7px">
        <i style="width:9px;height:9px;border-radius:3px;background:${f.cor};display:inline-block"></i>
        ${esc(f.rotulo)}
      </span>
      <b style="font-variant-numeric:tabular-nums">${((Number(f.valor) / total) * 100).toFixed(0)}%</b>
    </div>`).join('');

  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px">
    <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 160 160">
      ${aneis}
      <text x="80" y="76" text-anchor="middle" fill="var(--texto)" font-size="21" font-weight="700">${fatias.length}</text>
      <text x="80" y="94" text-anchor="middle" fill="var(--texto-3)" font-size="11">canais</text>
    </svg>
    <div style="width:100%">${legenda}</div>
  </div>`;
}

export const CORES_GRAFICO = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#818cf8'];
