import type { NextRequest } from 'next/server';
import { usuariosService } from '@/modules/usuarios/usuarios.service';
import { usuarioUpdateSchema } from '@/modules/usuarios/usuarios.schema';
import { exigirPapel } from '@/lib/autorizacao';
import { comTratamentoDeErro } from '@/lib/erros';
import { ok } from '@/lib/api';

type Contexto = { params: Promise<{ id: string }> };

export const PATCH = comTratamentoDeErro(async (request: NextRequest, { params }: Contexto) => {
  const sessao = await exigirPapel('administrador');
  const { id } = await params;
  const dados = usuarioUpdateSchema.parse(await request.json());
  // A sessão vai junto para o serviço barrar a auto-alteração de acesso.
  return ok(await usuariosService.atualizar(id, dados, sessao.id));
});
