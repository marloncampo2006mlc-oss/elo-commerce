import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { consultarUm, executar } from '@/lib/db';
import { NaoAutorizado, NaoProcessavel } from '@/lib/erros';

/**
 * Recuperação de senha do cliente da loja.
 *
 * Três passos: pedir o código, conferir o código, gravar a senha nova.
 *
 * O passo do código existe porque, sem ele, saber o e-mail de alguém
 * bastaria para trocar a senha daquela pessoa — e e-mail não é segredo.
 * O código é o que prova que quem pede é quem recebe.
 *
 * ATENÇÃO, E ESTÁ ASSIM DE PROPÓSITO: não há serviço de e-mail
 * configurado neste projeto, então o código volta na resposta e a tela o
 * exibe. Em produção ele iria para a caixa de entrada e a resposta diria
 * apenas "enviado". É a única peça que falta — o resto do fluxo (código
 * com prazo, uso único, limite de tentativas) já é o de verdade.
 */

/** Curto porque é digitado à mão, e o prazo curto compensa o tamanho. */
const DIGITOS = 6;
const VALIDADE_MINUTOS = 15;

/** Erro de digitação acontece; força bruta em 6 dígitos, não. */
const MAX_TENTATIVAS = 5;

interface PedidoAberto {
  id: string;
  cliente_id: string;
  codigo_hash: string;
  tentativas: number;
}

const gerarCodigo = (): string =>
  String(randomInt(0, 10 ** DIGITOS)).padStart(DIGITOS, '0');

async function clientePorEmail(email: string) {
  return consultarUm<{ id: string; nome: string; senha_hash: string | null; status: string }>(
    'SELECT id, nome, senha_hash, status FROM clientes WHERE email = $1', [email]);
}

export const recuperacaoService = {
  /**
   * Passo 1 — pede o código.
   *
   * Recusa em voz alta quando o e-mail não tem conta. Numa loja aberta
   * isso revela quais e-mails são clientes, e o normal seria responder
   * sempre a mesma coisa. Aqui a escolha é outra de propósito: sem
   * serviço de e-mail, uma resposta genérica deixaria a pessoa esperando
   * uma mensagem que nunca chega, sem entender por quê.
   */
  async solicitar(email: string): Promise<{ codigo: string; nome: string }> {
    const cliente = await clientePorEmail(email);

    if (!cliente) {
      throw NaoProcessavel('Não encontramos uma conta com esse e-mail.');
    }
    if (cliente.status === 'inativo') {
      throw NaoProcessavel('Esta conta está inativa. Fale com o suporte.');
    }
    if (!cliente.senha_hash) {
      throw NaoProcessavel(
        'Esta conta entra pelo Google e não tem senha. Use "Entrar com Google".');
    }

    // Pedir de novo invalida o anterior: dois códigos válidos ao mesmo
    // tempo dobrariam a chance de acerto de quem estivesse chutando.
    await executar(
      `UPDATE recuperacoes_senha SET usado_em = NOW()
        WHERE cliente_id = $1 AND usado_em IS NULL`, [cliente.id]);

    const codigo = gerarCodigo();

    await executar(
      `INSERT INTO recuperacoes_senha (cliente_id, codigo_hash, expira_em)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
      [cliente.id, await bcrypt.hash(codigo, 10), String(VALIDADE_MINUTOS)]);

    return { codigo, nome: cliente.nome };
  },

  /**
   * Passo 2 e 3 — confere o código e grava a senha nova.
   *
   * Os dois acontecem na mesma chamada porque separá-los exigiria um
   * segundo segredo para ligar uma etapa à outra — e esse segredo teria
   * exatamente o mesmo valor do código. Duas idas ao servidor com a
   * mesma prova não protegem mais do que uma.
   */
  async redefinir(email: string, codigo: string, senhaNova: string): Promise<{ nome: string }> {
    const cliente = await clientePorEmail(email);
    if (!cliente) throw NaoAutorizado('Código inválido ou expirado.');

    const pedido = await consultarUm<PedidoAberto>(
      `SELECT id, cliente_id, codigo_hash, tentativas
         FROM recuperacoes_senha
        WHERE cliente_id = $1 AND usado_em IS NULL AND expira_em > NOW()
        ORDER BY created_at DESC LIMIT 1`,
      [cliente.id]);

    if (!pedido) {
      throw NaoAutorizado('Código inválido ou expirado. Peça um novo.');
    }

    if (pedido.tentativas >= MAX_TENTATIVAS) {
      await executar('UPDATE recuperacoes_senha SET usado_em = NOW() WHERE id = $1', [pedido.id]);
      throw NaoAutorizado('Muitas tentativas. Peça um novo código.');
    }

    if (!await bcrypt.compare(codigo, pedido.codigo_hash)) {
      // Contar a tentativa é o que dá sentido ao limite: sem isso, o
      // atacante teria as dez mil combinações à disposição.
      await executar(
        'UPDATE recuperacoes_senha SET tentativas = tentativas + 1 WHERE id = $1', [pedido.id]);
      throw NaoAutorizado('Código incorreto.');
    }

    await executar(
      `UPDATE clientes
          SET senha_hash = $2, metodo_login = 'senha', status = 'ativo'
        WHERE id = $1`,
      [cliente.id, await bcrypt.hash(senhaNova, 10)]);

    // Queimar o código é o que impede que a mesma mensagem sirva de
    // chave para uma segunda troca depois.
    await executar('UPDATE recuperacoes_senha SET usado_em = NOW() WHERE id = $1', [pedido.id]);

    return { nome: cliente.nome };
  },
};
