import { redirect } from 'next/navigation';

/**
 * /gestao não é uma tela — é a porta de entrada da área.
 *
 * Sem isto, quem digita apenas "/gestao" recebe 404, que é exatamente o
 * caminho que uma pessoa tenta primeiro.
 */
export default function EntradaGestao() {
  redirect('/gestao/painel');
}
