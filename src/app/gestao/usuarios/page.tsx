import { exigirAcesso } from '@/lib/guardaPagina';
import { usuariosService } from '@/modules/usuarios/usuarios.service';
import { BarraGestao } from '@/components/BarraGestao';
import { GestaoUsuarios } from '@/components/gestao/GestaoUsuarios';

export const dynamic = 'force-dynamic';

/**
 * Gestão de pessoas. A guarda usa o mesmo caminho das outras páginas —
 * quem não tem o privilégio é redirecionado antes de qualquer consulta
 * ao banco.
 */
export default async function UsuariosPagina() {
  const { sessao } = await exigirAcesso('usuarios.gerenciar');
  const usuarios = await usuariosService.listar();

  return (
    <>
      <BarraGestao titulo="Usuários"
                   subtitulo={`${usuarios.length} pessoa(s) com acesso à gestão`} />
      <div className="pagina">
        <GestaoUsuarios usuarios={JSON.parse(JSON.stringify(usuarios))} meuId={sessao.id} />
      </div>
    </>
  );
}
