import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/guardaPagina';
import { primeiraPaginaPermitida } from '@/lib/paginas';

/**
 * /gestao é a porta de entrada, não uma tela.
 *
 * O destino depende do perfil: mandar todo mundo para o painel jogaria
 * um atendente — que não tem `bi.ver` — direto num bloqueio logo após o
 * login.
 */
export default async function EntradaGestao() {
  const { privilegios } = await carregarAcesso();
  redirect(primeiraPaginaPermitida(privilegios) ?? '/gestao/sem-acesso');
}
