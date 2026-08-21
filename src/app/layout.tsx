import type { Metadata } from 'next';
import { SCRIPT_TEMA } from '@/lib/tema';
import './globais.css';

export const metadata: Metadata = {
  title: 'Elo Platform',
  description: 'Loja, gestão, chatbot no-code, atendimento e BI numa plataforma só',
};

/**
 * O <html> não declara `data-tema`.
 *
 * Quem o escreve é o script abaixo, antes da primeira pintura. Declarar
 * o atributo aqui também faria o React reescrevê-lo na hidratação, com
 * o valor que veio do servidor — desfazendo a preferência de quem
 * escolheu o claro. Por isso o `suppressHydrationWarning`: a diferença
 * entre o HTML do servidor e o do navegador é intencional.
 */
export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
