export function BarraGestao({ titulo, subtitulo, children }: {
  titulo: string; subtitulo?: string; children?: React.ReactNode;
}) {
  return (
    <header className="barra">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className="barra__acoes">{children}</div>}
    </header>
  );
}
