/**
 * Cliente HTTP da API. Centraliza URL base, JSON, e a tradução de
 * erros do backend em Error com `detalhes` — assim cada tela só
 * precisa dar try/catch e mostrar a mensagem.
 */
const BASE = '/api';

async function requisitar(rota, { metodo = 'GET', corpo, query } = {}) {
  const url = new URL(BASE + rota, location.origin);
  if (query) {
    for (const [chave, valor] of Object.entries(query)) {
      if (valor !== '' && valor !== null && valor !== undefined) url.searchParams.set(chave, valor);
    }
  }

  const resposta = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.erro ?? `Falha na requisição (${resposta.status})`);
    erro.detalhes = dados.detalhes ?? [];
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

const crud = (recurso) => ({
  listar: (query) => requisitar(`/${recurso}`, { query }),
  obter: (id) => requisitar(`/${recurso}/${id}`).then((r) => r.data),
  criar: (corpo) => requisitar(`/${recurso}`, { metodo: 'POST', corpo }).then((r) => r.data),
  atualizar: (id, corpo) => requisitar(`/${recurso}/${id}`, { metodo: 'PUT', corpo }).then((r) => r.data),
  remover: (id) => requisitar(`/${recurso}/${id}`, { metodo: 'DELETE' }),
});

export const api = {
  health: () => requisitar('/health').then((r) => r.data),
  dashboard: () => requisitar('/dashboard').then((r) => r.data),

  clientes: { ...crud('clientes'), ufs: () => requisitar('/clientes/ufs').then((r) => r.data) },

  produtos: {
    ...crud('produtos'),
    categorias: () => requisitar('/produtos/categorias').then((r) => r.data),
    imagens: () => requisitar('/produtos/imagens').then((r) => r.data),
    ajustarEstoque: (id, ajuste) =>
      requisitar(`/produtos/${id}/estoque`, { metodo: 'PATCH', corpo: { ajuste } }).then((r) => r.data),
  },

  pedidos: {
    ...crud('pedidos'),
    alterarStatus: (id, status) =>
      requisitar(`/pedidos/${id}/status`, { metodo: 'PATCH', corpo: { status } }).then((r) => r.data),
  },

  atendimentos: {
    listar: (query) => requisitar('/atendimentos', { query }),
    obter: (id) => requisitar(`/atendimentos/${id}`).then((r) => r.data),
    iniciar: (canal) => requisitar('/atendimentos', { metodo: 'POST', corpo: { canal } }).then((r) => r.data),
    responder: (id, entrada) =>
      requisitar(`/atendimentos/${id}/mensagens`, { metodo: 'POST', corpo: { entrada } }).then((r) => r.data),
    estatisticas: () => requisitar('/atendimentos/estatisticas').then((r) => r.data),
  },
};
