import { FLUXO, detectarIntencao } from './fluxo.js';
import { atendimentosRepository as repo } from './atendimentos.repository.js';

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROTULO_STATUS = {
  rascunho: 'em rascunho',
  aguardando_pagamento: 'aguardando pagamento',
  pago: 'pago e em separação',
  enviado: 'a caminho',
  entregue: 'entregue',
  cancelado: 'cancelado',
};

/**
 * Ações são os únicos pontos do fluxo que tocam o banco. Cada uma
 * devolve o texto que a URA vai "falar" — e, opcionalmente, o cliente
 * identificado, que passa a ficar vinculado ao atendimento.
 */
const ACOES = {
  async consultarPedido(entrada) {
    const numero = Number(String(entrada ?? '').replace(/\D/g, ''));
    if (!numero) {
      return { texto: 'Não entendi o número do pedido. Vamos tentar de novo?', repetir: 'pedido_pergunta' };
    }
    const pedido = await repo.pedidoPorNumero(numero);
    if (!pedido) {
      return { texto: `Não localizei o pedido nº ${numero} na nossa base. Confira o número e tente novamente.`,
               repetir: 'pedido_pergunta' };
    }
    const data = new Date(pedido.created_at).toLocaleDateString('pt-BR');
    return {
      texto: `Pedido nº ${pedido.numero}, feito em ${data} por ${pedido.cliente_nome}: ` +
             `${pedido.qtd_pecas} item(ns), total de ${brl(pedido.total)}. ` +
             `Situação atual: ${ROTULO_STATUS[pedido.status] ?? pedido.status}.`,
    };
  },

  async listarOfertas() {
    const produtos = await repo.ofertas(3);
    if (produtos.length === 0) return { texto: 'No momento não temos itens disponíveis em estoque.' };
    // A URA fala: só texto entra na frase, nunca o caminho da imagem.
    const lista = produtos.map((p) => `${p.nome} por ${brl(p.preco)}`).join('; ');
    return { texto: `Nossas melhores ofertas com pronta entrega: ${lista}. ` +
                    'Você também pode ver o catálogo completo na aba Loja.' };
  },

  async consultarCadastro(entrada) {
    const cpf = String(entrada ?? '').replace(/\D/g, '');
    if (cpf.length !== 11) {
      return { texto: 'O CPF precisa ter 11 dígitos. Pode digitar novamente?', repetir: 'cadastro_pergunta' };
    }
    const cliente = await repo.clientePorCpf(cpf);
    if (!cliente) {
      return { texto: 'Não encontrei esse CPF na nossa base. Talvez o cadastro esteja em outro documento.',
               repetir: 'cadastro_pergunta' };
    }
    return {
      cliente_id: cliente.id,
      texto: `Encontrei seu cadastro, ${cliente.nome.split(' ')[0]}! ` +
             `E-mail ${cliente.email}, cidade ${cliente.cidade ?? 'não informada'}/${cliente.uf ?? '--'}. ` +
             `Você tem ${cliente.total_pedidos} pedido(s) e ${brl(cliente.total_gasto ?? 0)} em compras conosco.`,
    };
  },
};

/** Monta a fala de um nó (mensagem + opções numeradas). */
function renderizarNo(chave) {
  const no = FLUXO[chave];
  return {
    no: chave,
    mensagem: no.mensagem ?? '',
    opcoes: no.opcoes ?? [],
    aguardaTexto: no.entrada === 'texto',
    final: no.final ?? null,
  };
}

/**
 * Núcleo do motor. Dado o nó atual e a entrada do usuário (tecla ou
 * texto), decide o próximo nó, executa a ação e devolve as falas do bot.
 */
export async function processar({ noAtual, entrada, canal }) {
  const no = FLUXO[noAtual] ?? FLUXO.inicio;
  const falas = [];
  let destino = null;
  let clienteIdentificado = null;

  // 1. Nó que espera texto livre: a entrada alimenta a ação do próximo nó.
  if (no.entrada === 'texto') {
    destino = no.destino;
  } else {
    // 2. Nó de menu: tenta a tecla; no chat, cai para linguagem natural.
    const opcao = (no.opcoes ?? []).find((o) => o.tecla === String(entrada ?? '').trim());
    if (opcao) {
      destino = opcao.destino;
    } else if (canal !== 'ura') {
      destino = detectarIntencao(entrada);
    }

    if (!destino) {
      falas.push(canal === 'ura'
        ? 'Opção inválida. Vou repetir as alternativas disponíveis.'
        : 'Ainda não entendi. Posso ajudar com pedidos, ofertas, cadastro ou transferir para um atendente.');
      return { falas: [...falas, ...falarNo(noAtual)], proximoNo: noAtual, status: null, cliente_id: null };
    }
  }

  // 3. Executa a ação do nó de destino, se houver.
  const noDestino = FLUXO[destino];
  if (noDestino?.acao) {
    const resultado = await ACOES[noDestino.acao](entrada);
    falas.push(resultado.texto);
    clienteIdentificado = resultado.cliente_id ?? null;

    if (resultado.repetir) {           // entrada inválida: volta a perguntar
      return { falas: [...falas, ...falarNo(resultado.repetir)], proximoNo: resultado.repetir,
               status: null, cliente_id: clienteIdentificado };
    }
  }

  falas.push(...falarNo(destino));
  return {
    falas,
    proximoNo: destino,
    status: noDestino?.final ?? null,
    cliente_id: clienteIdentificado,
  };
}

/** Converte um nó em uma ou duas falas prontas para exibição. */
function falarNo(chave) {
  const { mensagem, opcoes } = renderizarNo(chave);
  const falas = [];
  if (mensagem) falas.push(mensagem);
  if (opcoes.length) falas.push(opcoes.map((o) => `${o.tecla}. ${o.rotulo}`).join('\n'));
  return falas;
}

export { renderizarNo, falarNo };
