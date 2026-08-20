import type { ReactNode } from 'react';

/**
 * Cartão de indicador.
 *
 * Um componente só, em vez do markup repetido em cada tela — assim um
 * ajuste de espaçamento ou de hierarquia vale para o painel, o BI e a
 * gestão de usuários de uma vez.
 */
export function Indicador({ rotulo, valor, nota, icone, tom = 'violeta' }: {
  rotulo: string;
  valor: ReactNode;
  nota?: ReactNode;
  icone: ReactNode;
  tom?: 'violeta' | 'ciano' | 'verde' | 'ambar' | 'vermelho';
}) {
  return (
    <article className={`indicador indicador--${tom}`}>
      <div className="indicador__topo">
        <span className="indicador__rotulo">{rotulo}</span>
        <span className="indicador__icone">{icone}</span>
      </div>
      <div className="indicador__valor">{valor}</div>
      {nota && <div className="indicador__nota">{nota}</div>}
    </article>
  );
}
