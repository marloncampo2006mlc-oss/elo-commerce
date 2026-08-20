import type { Metadata } from 'next';
import './globais.css';

export const metadata: Metadata = {
  title: 'Elo Platform',
  description: 'Loja, gestão, chatbot no-code, atendimento e BI numa plataforma só',
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="escuro">
      <body>{children}</body>
    </html>
  );
}
