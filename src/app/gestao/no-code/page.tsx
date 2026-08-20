import Link from 'next/link';
import { botsService } from '@/modules/bots/bots.service';
import { BarraGestao } from '@/components/BarraGestao';
import { NovoBot } from '@/components/nocode/NovoBot';
import { exigirAcesso } from '@/lib/guardaPagina';

export const dynamic = 'force-dynamic';

export default async function ListaBots() {
  await exigirAcesso('bots.editar');

  const bots = await botsService.listar();

  return (
    <>
      <BarraGestao titulo="No-Code" subtitulo="Crie e publique fluxos de atendimento sem escrever código">
        <NovoBot />
      </BarraGestao>

      <div className="pagina">
        {bots.length === 0 ? (
          <div className="cartao">
            <div className="vazio">
              <div className="vazio__icone">⬡</div>
              <strong>Nenhum chatbot ainda</strong>
              <p style={{ marginTop: 6 }}>Crie o primeiro fluxo para o assistente da loja.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {bots.map((bot) => (
              <Link key={bot.id} href={`/gestao/no-code/${bot.id}`} className="cartao cartao--pad"
                    style={{ display: 'block' }}>
                <div className="flex entre" style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 15 }}>{bot.nome}</strong>
                  {bot.ativo_na_loja && <span className="selo selo--verde">na loja</span>}
                </div>

                <p className="dim" style={{ fontSize: 12.5, minHeight: 34 }}>{bot.descricao}</p>

                <div className="flex" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {bot.versao_publicada !== null && (
                    <span className="selo selo--violeta">v{bot.versao_publicada} publicada</span>
                  )}
                  {bot.versao_rascunho !== null && (
                    <span className="selo selo--ambar">v{bot.versao_rascunho} rascunho</span>
                  )}
                  <span className="selo selo--cinza">{bot.total_versoes} versões</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
