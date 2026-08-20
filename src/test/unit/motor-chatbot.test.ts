import { describe, expect, it } from 'vitest';
import { executarTurno, validarFluxo } from '@/chatbot/motor';
import type { DependenciasExecutor, Fluxo } from '@/chatbot/tipos';

/** Dependências falsas: o motor é testado sem tocar no banco. */
const deps: DependenciasExecutor = {
  buscarProdutos: async (termo) =>
    termo === 'vazio' ? [] : [{ nome: 'Headset HD 4200', preco: 459.9, categoria: 'Áudio' }],
  consultarPedido: async (numero) =>
    numero === 42
      ? { numero: 42, status: 'enviado', total: 1200, criadoEm: new Date('2026-08-01'), clienteNome: 'Ana' }
      : null,
};

const no = (id: string, tipo: string, dados: object = {}) =>
  ({ id, tipo, posicao: { x: 0, y: 0 }, dados }) as Fluxo['nodes'][number];

const aresta = (origem: string, destino: string, saida?: string) =>
  ({ id: `${origem}-${destino}-${saida ?? ''}`, origem, destino, saida: saida ?? null });

describe('motor do chatbot', () => {
  it('executa bloco de mensagem e encadeia até esperar resposta', async () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('m', 'mensagem', { texto: 'Olá!' }),
              no('p', 'pergunta', { texto: 'Qual seu nome?', variavel: 'nome' })],
      edges: [aresta('i', 'm'), aresta('m', 'p')],
    };

    const turno = await executarTurno({ fluxo, noAtual: null, entrada: null, contexto: {}, deps });

    expect(turno.falas.map((f) => f.texto)).toEqual(['Olá!', 'Qual seu nome?']);
    expect(turno.noAtual).toBe('p');
    expect(turno.aguardandoEntrada).toBe(true);
  });

  it('grava a resposta da pergunta no contexto', async () => {
    const fluxo: Fluxo = {
      nodes: [no('p', 'pergunta', { texto: 'Nome?', variavel: 'nome' }),
              no('m', 'mensagem', { texto: 'Prazer, {{nome}}!' })],
      edges: [aresta('p', 'm')],
    };

    const turno = await executarTurno({ fluxo, noAtual: 'p', entrada: 'Marlon', contexto: {}, deps });

    expect(turno.contexto.nome).toBe('Marlon');
    expect(turno.falas[0]?.texto).toBe('Prazer, Marlon!');
  });

  it('segue a aresta correta da opção escolhida no menu', async () => {
    const fluxo: Fluxo = {
      nodes: [
        no('menu', 'menu', { texto: 'O que deseja?', opcoes: [
          { id: 'o1', rotulo: 'Pedidos' }, { id: 'o2', rotulo: 'Produtos' },
        ]}),
        no('a', 'mensagem', { texto: 'Caminho de pedidos' }),
        no('b', 'mensagem', { texto: 'Caminho de produtos' }),
      ],
      edges: [aresta('menu', 'a', 'o1'), aresta('menu', 'b', 'o2')],
    };

    const porNumero = await executarTurno({ fluxo, noAtual: 'menu', entrada: '2', contexto: {}, deps });
    expect(porNumero.falas[0]?.texto).toBe('Caminho de produtos');

    const porTexto = await executarTurno({ fluxo, noAtual: 'menu', entrada: 'pedidos', contexto: {}, deps });
    expect(porTexto.falas[0]?.texto).toBe('Caminho de pedidos');
  });

  it('repete o menu quando a opção não existe', async () => {
    const fluxo: Fluxo = {
      nodes: [no('menu', 'menu', { opcoes: [{ id: 'o1', rotulo: 'Pedidos' }] }),
              no('a', 'mensagem', { texto: 'ok' })],
      edges: [aresta('menu', 'a', 'o1')],
    };

    const turno = await executarTurno({ fluxo, noAtual: 'menu', entrada: 'xyz', contexto: {}, deps });

    expect(turno.noAtual).toBe('menu');
    expect(turno.aguardandoEntrada).toBe(true);
    expect(turno.falas[0]?.texto).toContain('Não entendi');
  });

  it('desvia pela condição conforme o contexto', async () => {
    const fluxo: Fluxo = {
      nodes: [
        no('c', 'condicao', { variavel: 'status', operador: 'igual', valor: 'vip' }),
        no('sim', 'mensagem', { texto: 'Atendimento VIP' }),
        no('nao', 'mensagem', { texto: 'Atendimento padrão' }),
      ],
      edges: [aresta('c', 'sim', 'sim'), aresta('c', 'nao', 'nao')],
    };

    const vip = await executarTurno({ fluxo, noAtual: 'c', entrada: null, contexto: { status: 'vip' }, deps });
    expect(vip.falas[0]?.texto).toBe('Atendimento VIP');

    const comum = await executarTurno({ fluxo, noAtual: 'c', entrada: null, contexto: { status: 'novo' }, deps });
    expect(comum.falas[0]?.texto).toBe('Atendimento padrão');
  });

  it('consulta pedido real pelas dependências injetadas', async () => {
    const fluxo: Fluxo = {
      nodes: [no('cp', 'consultar_pedido', { termo: '{{pedido}}' })],
      edges: [],
    };

    const achou = await executarTurno({ fluxo, noAtual: 'cp', entrada: null, contexto: { pedido: '42' }, deps });
    expect(achou.falas[0]?.texto).toContain('nº 42');
    expect(achou.contexto.pedido_encontrado).toBe('sim');

    const naoAchou = await executarTurno({ fluxo, noAtual: 'cp', entrada: null, contexto: { pedido: '999' }, deps });
    expect(naoAchou.contexto.pedido_encontrado).toBe('nao');
  });

  it('sinaliza transferência para atendimento humano', async () => {
    const fluxo: Fluxo = { nodes: [no('t', 'transferir', {})], edges: [] };
    const turno = await executarTurno({ fluxo, noAtual: 't', entrada: null, contexto: {}, deps });
    expect(turno.desfecho).toBe('transferir');
  });

  it('interrompe fluxo em ciclo em vez de travar', async () => {
    const fluxo: Fluxo = {
      nodes: [no('a', 'mensagem', { texto: 'a' }), no('b', 'mensagem', { texto: 'b' })],
      edges: [aresta('a', 'b'), aresta('b', 'a')],
    };

    const turno = await executarTurno({ fluxo, noAtual: 'a', entrada: null, contexto: {}, deps });

    expect(turno.falas.at(-1)?.texto).toContain('limite de passos');
    expect(turno.falas.length).toBeLessThan(30);
  });
});

describe('validação de fluxo antes de publicar', () => {
  it('aceita um fluxo bem formado', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('m', 'mensagem', { texto: 'oi' }), no('f', 'finalizar', {})],
      edges: [aresta('i', 'm'), aresta('m', 'f')],
    };
    expect(validarFluxo(fluxo)).toEqual([]);
  });

  it('recusa fluxo sem bloco de início', () => {
    const fluxo: Fluxo = { nodes: [no('m', 'mensagem', { texto: 'oi' })], edges: [] };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('Início'))).toBe(true);
  });

  it('aponta menu com opção desconectada', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'),
              no('menu', 'menu', { opcoes: [{ id: 'o1', rotulo: 'A' }, { id: 'o2', rotulo: 'B' }] }),
              no('a', 'finalizar', {})],
      edges: [aresta('i', 'menu'), aresta('menu', 'a', 'o1')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('"B"'))).toBe(true);
  });

  it('aponta bloco inalcançável', () => {
    const fluxo: Fluxo = {
      nodes: [no('i', 'inicio'), no('m', 'finalizar', {}), no('orfao', 'mensagem', { texto: 'x' })],
      edges: [aresta('i', 'm')],
    };
    expect(validarFluxo(fluxo).some((p) => p.mensagem.includes('não é alcançável'))).toBe(true);
  });
});
