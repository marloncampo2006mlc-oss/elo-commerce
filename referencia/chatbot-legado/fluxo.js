/**
 * =====================================================================
 * FLUXO CONVERSACIONAL (URA / chatbot)
 * ---------------------------------------------------------------------
 * O fluxo é DADO, não código: cada nó descreve o que dizer, as opções
 * de discagem (DTMF) e para onde ir. Um nó pode ter uma `acao`, que é o
 * único ponto onde consultamos o banco. Trocar o atendimento inteiro
 * significa editar este objeto — nenhuma regra de navegação fica
 * espalhada pelo motor.
 * =====================================================================
 */
export const FLUXO = {
  inicio: {
    mensagem:
      'Olá! Você ligou para a Elo Commerce. Para agilizar, escolha uma opção:',
    opcoes: [
      { tecla: '1', rotulo: 'Consultar meus pedidos', destino: 'pedido_pergunta' },
      { tecla: '2', rotulo: 'Ofertas e catálogo',     destino: 'catalogo' },
      { tecla: '3', rotulo: 'Consultar meu cadastro', destino: 'cadastro_pergunta' },
      { tecla: '4', rotulo: 'Falar com um atendente', destino: 'transferir' },
      { tecla: '0', rotulo: 'Encerrar atendimento',   destino: 'encerrar' },
    ],
  },

  pedido_pergunta: {
    mensagem: 'Digite o número do seu pedido (somente dígitos) e confirme.',
    entrada: 'texto',
    destino: 'pedido_resposta',
    voltar: 'inicio',
  },

  pedido_resposta: {
    acao: 'consultarPedido',
    opcoes: [
      { tecla: '1', rotulo: 'Consultar outro pedido', destino: 'pedido_pergunta' },
      { tecla: '9', rotulo: 'Voltar ao menu inicial', destino: 'inicio' },
      { tecla: '4', rotulo: 'Falar com um atendente', destino: 'transferir' },
    ],
  },

  catalogo: {
    acao: 'listarOfertas',
    opcoes: [
      { tecla: '9', rotulo: 'Voltar ao menu inicial', destino: 'inicio' },
      { tecla: '0', rotulo: 'Encerrar atendimento',   destino: 'encerrar' },
    ],
  },

  cadastro_pergunta: {
    mensagem: 'Por favor, informe seu CPF (somente números).',
    entrada: 'texto',
    destino: 'cadastro_resposta',
    voltar: 'inicio',
  },

  cadastro_resposta: {
    acao: 'consultarCadastro',
    opcoes: [
      { tecla: '1', rotulo: 'Consultar meus pedidos', destino: 'pedido_pergunta' },
      { tecla: '9', rotulo: 'Voltar ao menu inicial', destino: 'inicio' },
    ],
  },

  transferir: {
    mensagem:
      'Certo! Estou transferindo você para um de nossos especialistas. ' +
      'O protocolo deste atendimento já está registrado no seu histórico.',
    final: 'transferido',
  },

  encerrar: {
    mensagem: 'Obrigado por falar com a Elo Commerce. Tenha um ótimo dia!',
    final: 'resolvido',
  },
};

/**
 * Intenções para o canal de chat (linguagem natural). O usuário digita
 * "cadê meu pedido" e caímos no mesmo nó que a tecla 1 da URA — mesmo
 * fluxo, duas portas de entrada.
 */
export const INTENCOES = [
  { destino: 'pedido_pergunta',   termos: ['pedido', 'compra', 'entrega', 'rastrear', 'rastreio', 'chegou', 'encomenda'] },
  { destino: 'catalogo',          termos: ['oferta', 'promo', 'produto', 'catalogo', 'catálogo', 'comprar', 'preco', 'preço'] },
  { destino: 'cadastro_pergunta', termos: ['cadastro', 'cpf', 'meus dados', 'conta', 'perfil'] },
  { destino: 'transferir',        termos: ['atendente', 'humano', 'pessoa', 'falar com alguem', 'falar com alguém', 'suporte'] },
  { destino: 'encerrar',          termos: ['sair', 'encerrar', 'tchau', 'obrigado', 'obrigada', 'valeu'] },
];

const normalizar = (texto) =>
  String(texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Casa o texto livre com uma intenção; devolve null se nada bater. */
export function detectarIntencao(texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  for (const intencao of INTENCOES) {
    if (intencao.termos.some((t) => alvo.includes(normalizar(t)))) return intencao.destino;
  }
  return null;
}
