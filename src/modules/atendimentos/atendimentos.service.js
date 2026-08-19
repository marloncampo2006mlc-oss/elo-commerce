import { atendimentosRepository as repo } from './atendimentos.repository.js';
import { processar, falarNo } from './atendimentos.engine.js';
import { NotFound, Conflict } from '../../shared/errors.js';

const agora = () => new Date().toISOString();
const fala = (autor, texto) => ({ autor, texto, em: agora() });

export const atendimentosService = {
  listar: (filtros) => repo.listar(filtros),

  async obter(id) {
    const atendimento = await repo.buscarPorId(id);
    if (!atendimento) throw NotFound('Atendimento');
    return atendimento;
  },

  /** Abre a sessão e já devolve a saudação + menu inicial. */
  async iniciar({ canal, cliente_id }) {
    const protocolo = await repo.proximoProtocolo();
    const criado = await repo.criar({ protocolo, canal, cliente_id: cliente_id ?? null });
    const mensagens = falarNo('inicio').map((t) => fala('bot', t));
    return repo.registrar(criado.id, { no_atual: 'inicio', mensagens });
  },

  /** Um turno da conversa: grava a entrada, roda o motor, grava a saída. */
  async responder(id, entrada) {
    const atendimento = await atendimentosService.obter(id);
    if (atendimento.status !== 'em_andamento') {
      throw Conflict('Este atendimento já foi finalizado. Inicie um novo para continuar.');
    }

    const resultado = await processar({
      noAtual: atendimento.no_atual,
      entrada,
      canal: atendimento.canal,
    });

    const mensagens = [
      fala('cliente', entrada),
      ...resultado.falas.map((t) => fala('bot', t)),
    ];

    return repo.registrar(id, {
      mensagens,
      no_atual: resultado.proximoNo,
      status: resultado.status,
      cliente_id: resultado.cliente_id,
    });
  },

  async encerrar(id) {
    await atendimentosService.obter(id);
    return repo.registrar(id, {
      mensagens: [fala('sistema', 'Atendimento encerrado pelo operador.')],
      status: 'abandonado',
    });
  },

  estatisticas: () => repo.estatisticas(),
};
