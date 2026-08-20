import { clientesService } from '@/modules/clientes/clientes.service';
import { listarClientesSchema } from '@/modules/clientes/clientes.schema';
import { BarraGestao } from '@/components/BarraGestao';
import { moeda } from '@/lib/formato';
import { SeloStatus } from '@/components/SeloStatus';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

const cpfFormatado = (cpf: string) =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

export default async function ClientesGestao() {
  await exigirAcesso('clientes.ver');

  const pagina = await clientesService.listar(
    listarClientesSchema.parse({ limite: 30, ordem: 'gasto' }),
  );

  return (
    <>
      <BarraGestao titulo="Clientes" subtitulo={`${pagina.total} cadastros na base`} />

      <div className="pagina">
        <div className="cartao">
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>CPF</th><th>Localização</th>
                  <th className="num">Pedidos</th><th className="num">Total gasto</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagina.itens.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <div className="flex">
                        <span className="avatar">{cliente.nome.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <div style={{ fontWeight: 550 }}>{cliente.nome}</div>
                          <div className="dim" style={{ fontSize: 11.5 }}>{cliente.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{cpfFormatado(cliente.cpf)}</td>
                    <td>{cliente.cidade ? `${cliente.cidade}/${cliente.uf}` : <span className="dim">—</span>}</td>
                    <td className="num">{cliente.total_pedidos}</td>
                    <td className="num"><strong>{moeda(cliente.total_gasto)}</strong></td>
                    <td><SeloStatus valor={cliente.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
