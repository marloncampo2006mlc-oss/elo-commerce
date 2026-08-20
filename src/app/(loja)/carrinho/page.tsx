import { PainelCarrinho } from '@/components/PainelCarrinho';
import { lerSessaoCliente } from '@/lib/sessaoCliente';

export const dynamic = 'force-dynamic';

/**
 * Checkout. A sessão do cliente é lida no servidor: sem ela, o painel
 * mostra o acesso em vez do botão de finalizar — e a rota de criação do
 * pedido recusa de qualquer forma, então esconder aqui é experiência,
 * não a proteção em si.
 */
export default async function Carrinho() {
  const cliente = await lerSessaoCliente();
  return <PainelCarrinho cliente={cliente} />;
}
