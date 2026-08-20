import { redirect } from 'next/navigation';
import { lerSessao } from '@/lib/sessao';
import { usuariosService } from '@/modules/usuarios/usuarios.service';
import { BarraGestao } from '@/components/BarraGestao';
import { GestaoUsuarios } from '@/components/gestao/GestaoUsuarios';

export const dynamic = 'force-dynamic';

/**
 * Gestão de pessoas. A checagem acontece antes de renderizar: quem não é
 * administrador nem chega a receber o HTML desta tela.
 */
export default async function UsuariosPagina() {
  const sessao = await lerSessao();
  if (!sessao) redirect('/login');

  if (sessao.papel !== 'administrador') {
    return (
      <>
        <BarraGestao titulo="Usuários" subtitulo="Acesso restrito" />
        <div className="pagina">
          <div className="cartao">
            <div className="vazio">
              <div className="vazio__icone">🔒</div>
              <strong>Somente administradores gerenciam usuários</strong>
              <p style={{ marginTop: 6 }}>
                Seu perfil é <strong>{sessao.papel}</strong>. Peça a um administrador
                para alterar acessos.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

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
