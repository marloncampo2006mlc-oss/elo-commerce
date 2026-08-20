import Link from 'next/link';
import { botsService } from '@/modules/bots/bots.service';
import { BarraGestao } from '@/components/BarraGestao';
import { NovoBot } from '@/components/nocode/NovoBot';
import { IconeFluxo } from '@/components/Icones';
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
              <div className="vazio__icone"><IconeFluxo tamanho={26} /></div>
              <strong>Nenhum chatbot ainda</strong>
              <p>Crie o primeiro fluxo para o assistente da loja.</p>
            </div>
          </div>
        ) : (
          <div className="grade-bots">
            {bots.map((bot) => (
              <Link key={bot.id} href={`/gestao/no-code/${bot.id}`} className="bot-cartao">
                <div className="bot-cartao__topo">
                  <span className="bot-cartao__icone"><IconeFluxo tamanho={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bot-cartao__nome">{bot.nome}</div>
                    {bot.ativo_na_loja && (
                      <span className="selo selo--verde" style={{ marginTop: 5 }}>
                        atendendo a loja
                      </span>
                    )}
                  </div>
                </div>

                <p className="bot-cartao__desc">{bot.descricao}</p>

                <div className="bot-cartao__selos">
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
