'use client';

import { useEffect, useState } from 'react';
import { CHAVE_TEMA, TEMA_PADRAO, ehTema, type Tema } from '@/lib/tema';
import { IconeLua, IconeSol } from './Icones';

/**
 * Alterna entre claro e escuro.
 *
 * O tema aplicado mora no atributo do <html>, escrito antes da primeira
 * pintura. Aqui só lemos esse valor depois que o componente monta: no
 * servidor não existe localStorage, e assumir um valor levaria a um
 * HTML diferente do que o navegador monta — o erro de hidratação.
 *
 * `variante` muda só a aparência: a loja usa o botão redondo do topo, a
 * gestão usa a linha do menu lateral, com rótulo.
 */
export function BotaoTema({ variante = 'icone' }: { variante?: 'icone' | 'menu' }) {
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO);

  useEffect(() => {
    const atual = document.documentElement.dataset.tema;
    setTema(ehTema(atual) ? atual : TEMA_PADRAO);
  }, []);

  function alternar() {
    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = proximo;
    // Modo privado pode recusar a escrita. A troca já aconteceu na tela;
    // perder só a memória entre visitas é melhor que quebrar o clique.
    try { localStorage.setItem(CHAVE_TEMA, proximo); } catch { /* sem persistência */ }
    setTema(proximo);
  }

  const vaiPara = tema === 'escuro' ? 'claro' : 'escuro';
  const rotulo = `Mudar para o tema ${vaiPara}`;
  const icone = tema === 'escuro' ? <IconeSol /> : <IconeLua />;

  if (variante === 'menu') {
    return (
      <button type="button" className="lateral__item" onClick={alternar} title={rotulo}>
        <span className="lateral__icone">{icone}</span>
        {/* O rótulo precisa da classe para sumir junto com os outros
            quando o menu está recolhido — como texto solto ele vazava
            para fora da faixa estreita. */}
        <span className="lateral__rotulo">Tema {vaiPara}</span>
      </button>
    );
  }

  return (
    <button type="button" className="botao-topo" onClick={alternar}
            aria-label={rotulo} title={rotulo}>
      {icone}
    </button>
  );
}
