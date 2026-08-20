import { IconeCaixa, IconeEscudo, IconeHeadset } from './IconesLoja';

/**
 * Ilustração do hero, desenhada em SVG.
 *
 * Isométrica para sugerir "montagem de uma operação" sem depender de
 * foto: escala sem perder nitidez, não pesa no carregamento e usa as
 * cores da marca em vez de brigar com elas.
 */
function IlustracaoHero() {
  return (
    <svg viewBox="0 0 120 120" className="hero__arte" aria-hidden="true">
      <defs>
        <linearGradient id="faceTopo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8ea2ff" stopOpacity=".95" />
          <stop offset="100%" stopColor="#5b7cff" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id="faceEsq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a63d8" stopOpacity=".9" />
          <stop offset="100%" stopColor="#2f3f9e" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id="faceDir" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d8bff" stopOpacity=".85" />
          <stop offset="100%" stopColor="#3d55c4" stopOpacity=".8" />
        </linearGradient>
        <radialGradient id="brilhoArte" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#9fb6ff" stopOpacity=".45" />
          <stop offset="100%" stopColor="#9fb6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="56" r="46" fill="url(#brilhoArte)" />

      {/* caixa isométrica principal */}
      <g>
        <path d="M60 22 L94 40 L60 58 L26 40 Z" fill="url(#faceTopo)" />
        <path d="M26 40 L60 58 L60 96 L26 78 Z" fill="url(#faceEsq)" />
        <path d="M94 40 L94 78 L60 96 L60 58 Z" fill="url(#faceDir)" />
        <path d="M60 22 L94 40 L60 58 L26 40 Z" fill="none"
              stroke="#c3d0ff" strokeWidth="1" strokeOpacity=".55" />
        <path d="M26 40 L26 78 L60 96 L94 78 L94 40" fill="none"
              stroke="#c3d0ff" strokeWidth="1" strokeOpacity=".35" />
      </g>

      {/* elementos flutuantes ao redor, sugerindo integração */}
      <g stroke="#cdd8ff" strokeWidth="1.2" fill="none" strokeOpacity=".75">
        <rect x="14" y="18" width="15" height="11" rx="2.2" transform="rotate(-12 21 23)" />
        <path d="M17.5 30.5 h8" transform="rotate(-12 21 23)" strokeOpacity=".5" />
      </g>
      <g stroke="#cdd8ff" strokeWidth="1.2" fill="none" strokeOpacity=".7">
        <circle cx="99" cy="26" r="6.4" />
        <path d="M96 26h6M99 23v6" strokeOpacity=".6" />
      </g>
      <g stroke="#cdd8ff" strokeWidth="1.2" fill="none" strokeOpacity=".6">
        <path d="M14 92c0-4 3.2-7.2 7.2-7.2S28.4 88 28.4 92" />
        <rect x="17.6" y="92" width="7.2" height="6" rx="1.6" />
      </g>

      {/* linhas de conexão */}
      <g stroke="#a8bcff" strokeWidth="1" strokeOpacity=".4" strokeDasharray="2.5 3">
        <path d="M29 26 L48 36" />
        <path d="M93 32 L78 40" />
        <path d="M28 88 L44 80" />
      </g>
    </svg>
  );
}

const DESTAQUES = [
  { Icone: IconeCaixa,   titulo: 'Catálogo completo',   texto: 'Soluções para sua operação' },
  { Icone: IconeEscudo,  titulo: 'Pronta entrega',      texto: 'Agilidade e confiança' },
  { Icone: IconeHeadset, titulo: 'Suporte inteligente', texto: 'Assistente no canto da tela' },
];

export function HeroLoja() {
  return (
    <section className="hero">
      <div className="hero__arte-caixa">
        <IlustracaoHero />
      </div>

      <div className="hero__texto">
        <h1>Equipe sua operação de ponta a ponta</h1>
        <p>
          Headsets, telefonia IP, redes e videoconferência com pronta entrega.
          <br />
          Precisa de ajuda? Fale com nosso assistente no canto da tela — ele
          consulta seu pedido e busca produtos no catálogo.
        </p>

        <ul className="hero__destaques">
          {DESTAQUES.map(({ Icone, titulo, texto }) => (
            <li key={titulo}>
              <span className="hero__icone"><Icone /></span>
              <span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* onda decorativa da direita */}
      <svg className="hero__onda" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M120 0 C210 60 190 150 260 200 C310 236 360 250 400 258 L400 0 Z"
              fill="#ffffff" fillOpacity=".07" />
        <path d="M180 0 C250 70 240 160 310 210 C348 238 378 250 400 256 L400 0 Z"
              fill="#ffffff" fillOpacity=".05" />
      </svg>
    </section>
  );
}
