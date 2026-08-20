import type { Fluxo } from '../chatbot/tipos.js';

/**
 * Fluxo inicial do assistente da loja.
 *
 * É a conversão do fluxo da URA da versão anterior — que vivia como
 * objeto no código — para o formato nodes/edges do No-Code. Vive num
 * módulo próprio porque tanto o seed local quanto o bootstrap de
 * produção precisam dele, e duplicar significaria dois fluxos iniciais
 * divergindo com o tempo.
 */

const no = (id: string, tipo: string, x: number, y: number, dados: object) =>
  ({ id, tipo, posicao: { x, y }, dados }) as Fluxo['nodes'][number];

const liga = (origem: string, destino: string, saida?: string) => ({
  id: `e-${origem}-${destino}${saida ? `-${saida}` : ''}`,
  origem,
  destino,
  saida: saida ?? null,
});

export const FLUXO_INICIAL: Fluxo = {
  nodes: [
    no('inicio', 'inicio', 40, 300, { titulo: 'Início' }),

    no('saudacao', 'mensagem', 240, 300, {
      titulo: 'Saudação',
      texto: 'Olá! Aqui é o assistente da Elo Store. 👋',
    }),

    no('menu', 'menu', 470, 300, {
      titulo: 'Menu principal',
      texto: 'Como posso ajudar você hoje?',
      opcoes: [
        { id: 'pedido',    rotulo: 'Consultar meu pedido' },
        { id: 'produtos',  rotulo: 'Ver ofertas e produtos' },
        { id: 'atendente', rotulo: 'Falar com um atendente' },
        { id: 'sair',      rotulo: 'Encerrar' },
      ],
    }),

    // --- caminho: consultar pedido ---
    no('pede_numero', 'pergunta', 760, 60, {
      titulo: 'Número do pedido',
      texto: 'Certo! Qual é o número do seu pedido?',
      variavel: 'pedido',
    }),
    no('busca_pedido', 'consultar_pedido', 1010, 60, {
      titulo: 'Consultar pedido',
      termo: '{{pedido}}',
    }),
    no('achou_pedido', 'condicao', 1250, 60, {
      titulo: 'Encontrou?',
      variavel: 'pedido_encontrado',
      operador: 'igual',
      valor: 'sim',
    }),
    no('pedido_ok', 'mensagem', 1500, -20, {
      titulo: 'Pedido localizado',
      texto: 'Posso ajudar em mais alguma coisa?',
    }),
    no('pedido_nao', 'mensagem', 1500, 140, {
      titulo: 'Não localizado',
      texto: 'Se preferir, posso te transferir para um atendente conferir isso com você.',
    }),

    // --- caminho: produtos ---
    no('pede_termo', 'pergunta', 760, 300, {
      titulo: 'O que procura',
      texto: 'O que você está procurando? (ex.: headset, monitor)',
      variavel: 'termo',
    }),
    no('busca_produtos', 'buscar_produtos', 1010, 300, {
      titulo: 'Buscar no catálogo',
      termo: '{{termo}}',
      limite: 4,
    }),
    no('pos_produtos', 'mensagem', 1250, 300, {
      titulo: 'Convite à loja',
      texto: 'Você encontra todos eles na nossa loja. Posso ajudar em mais alguma coisa?',
    }),

    // --- caminho: atendente ---
    no('transferir', 'transferir', 760, 520, {
      titulo: 'Transferir',
      texto: 'Claro! Vou te encaminhar para um atendente humano. Um momento, por favor. 🎧',
    }),

    // --- encerramento ---
    no('fim', 'finalizar', 760, 660, {
      titulo: 'Encerrar',
      texto: 'Obrigado por falar com a Elo Store. Tenha um ótimo dia! 👋',
    }),

    no('volta_menu', 'menu', 1760, 160, {
      titulo: 'Mais alguma coisa?',
      texto: 'Deseja mais alguma coisa?',
      opcoes: [
        { id: 'voltar',    rotulo: 'Voltar ao menu' },
        { id: 'atendente', rotulo: 'Falar com um atendente' },
        { id: 'sair',      rotulo: 'Não, obrigado' },
      ],
    }),
  ],
  edges: [
    liga('inicio', 'saudacao'),
    liga('saudacao', 'menu'),

    liga('menu', 'pede_numero', 'pedido'),
    liga('menu', 'pede_termo', 'produtos'),
    liga('menu', 'transferir', 'atendente'),
    liga('menu', 'fim', 'sair'),

    liga('pede_numero', 'busca_pedido'),
    liga('busca_pedido', 'achou_pedido'),
    liga('achou_pedido', 'pedido_ok', 'sim'),
    liga('achou_pedido', 'pedido_nao', 'nao'),
    liga('pedido_ok', 'volta_menu'),
    liga('pedido_nao', 'volta_menu'),

    liga('pede_termo', 'busca_produtos'),
    liga('busca_produtos', 'pos_produtos'),
    liga('pos_produtos', 'volta_menu'),

    liga('volta_menu', 'menu', 'voltar'),
    liga('volta_menu', 'transferir', 'atendente'),
    liga('volta_menu', 'fim', 'sair'),
  ],
};
