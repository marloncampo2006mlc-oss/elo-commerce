import { notFound } from 'next/navigation';
import { botsService } from '@/modules/bots/bots.service';
import { lerSessao } from '@/lib/sessao';
import { EditorFluxo } from '@/components/nocode/EditorFluxo';
import { BarraGestao } from '@/components/BarraGestao';
import type { Fluxo } from '@/chatbot/tipos';

export const dynamic = 'force-dynamic';

export default async function EditorPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await lerSessao();

  const bot = await botsService.obter(id).catch(() => null);
  if (!bot) notFound();

  // Sempre editamos um rascunho: versão publicada é imutável.
  const rascunho = await botsService.rascunho(bot.id, sessao?.id ?? null);
  const versoes = await botsService.versoes(bot.id);
  const publicada = versoes.find((versao) => versao.status === 'publicada');

  return (
    <>
      <BarraGestao titulo={bot.nome}
                   subtitulo={publicada
                     ? `v${publicada.versao} no ar · editando v${rascunho.versao}`
                     : `editando v${rascunho.versao} — ainda não publicado`} />

      <EditorFluxo
        botId={bot.id}
        botNome={bot.nome}
        versaoId={rascunho.id}
        versao={rascunho.versao}
        fluxoInicial={rascunho.fluxo as Fluxo}
        publicada={Boolean(publicada)}
      />
    </>
  );
}
