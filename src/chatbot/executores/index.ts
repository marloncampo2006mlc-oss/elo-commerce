import type { Executor, TipoNo } from '../tipos';
import { inicio } from './inicio';
import { mensagem } from './mensagem';
import { pergunta } from './pergunta';
import { menu } from './menu';
import { condicao } from './condicao';
import { buscarProdutos } from './buscar-produtos';
import { consultarPedido } from './consultar-pedido';
import { transferir } from './transferir';
import { finalizar } from './finalizar';

/**
 * Registro de executores. Adicionar um bloco novo ao No-Code é criar um
 * arquivo aqui e registrá-lo — o motor não muda.
 */
export const EXECUTORES: Record<TipoNo, Executor> = {
  inicio,
  mensagem,
  pergunta,
  menu,
  condicao,
  buscar_produtos: buscarProdutos,
  consultar_pedido: consultarPedido,
  transferir,
  finalizar,
};
