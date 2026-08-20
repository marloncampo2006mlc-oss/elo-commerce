import type { NextRequest } from 'next/server';
import { usuariosService } from '@/modules/usuarios/usuarios.service';
import { usuarioCreateSchema } from '@/modules/usuarios/usuarios.schema';
import { exigirPapel } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

/**
 * Gestão de pessoas é privilégio exclusivo de administrador — quem
 * controla quem entra controla tudo o mais.
 */
export const GET = comTratamentoDeErro(async () => {
  await exigirPapel('administrador');
  return ok(await usuariosService.listar());
});

export const POST = comTratamentoDeErro(async (request: NextRequest) => {
  await exigirPapel('administrador');
  const dados = usuarioCreateSchema.parse(await request.json());
  return ok(await usuariosService.criar(dados), 201);
});
