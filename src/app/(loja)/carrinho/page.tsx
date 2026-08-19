import { PainelCarrinho } from '@/components/PainelCarrinho';
import { clientesService } from '@/modules/clientes/clientes.service';
import { listarClientesSchema } from '@/modules/clientes/clientes.schema';

export const dynamic = 'force-dynamic';

/**
 * Checkout. A lista de clientes vem do servidor porque o projeto ainda
 * não tem login de consumidor — na demonstração se escolhe quem está
 * comprando. É o ponto natural para plugar autenticação de cliente.
 */
export default async function Carrinho() {
  const { itens } = await clientesService.listar(
    listarClientesSchema.parse({ limite: 100, status: 'ativo', ordem: 'nome' }),
  );

  return (
    <PainelCarrinho
      clientes={itens.map((cliente) => ({
        id: cliente.id, nome: cliente.nome, email: cliente.email,
      }))}
    />
  );
}
