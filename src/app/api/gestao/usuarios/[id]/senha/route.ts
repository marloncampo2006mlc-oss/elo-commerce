import type { NextRequest } from 'next/server';
import { usuariosService } from '@/modules/usuarios/usuarios.service';
import { novaSenhaSchema } from '@/modules/usuarios/usuarios.schema';
import { exigirPrivilegio } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const PUT = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  await exigirPrivilegio('usuarios.gerenciar');
  const { id } = await params;
  const { senha } = novaSenhaSchema.parse(await request.json());
  await usuariosService.definirSenha(id, senha);
  return ok({ redefinida: true });
});
