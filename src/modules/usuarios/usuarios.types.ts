import type { PapelUsuario } from '@/lib/sessao';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  ultimo_acesso: Date | null;
  created_at: Date;
}

/**
 * O que cada perfil pode fazer.
 *
 * Esta tabela é a fonte única: a interface a usa para explicar os
 * privilégios ao administrador, e os guards do servidor derivam dela.
 * Antes, o que cada papel podia fazer estava implícito, espalhado em
 * chamadas de exigirPapel() — para descobrir era preciso ler o código.
 */
export interface Privilegio {
  chave: string;
  rotulo: string;
  descricao: string;
  papeis: PapelUsuario[];
}

export const PRIVILEGIOS: Privilegio[] = [
  {
    chave: 'catalogo.ver',
    rotulo: 'Ver catálogo',
    descricao: 'Consultar produtos, preços e estoque',
    papeis: ['administrador', 'gerente', 'supervisor', 'atendente'],
  },
  {
    chave: 'catalogo.editar',
    rotulo: 'Editar catálogo',
    descricao: 'Cadastrar produtos e ajustar estoque',
    papeis: ['administrador', 'gerente'],
  },
  {
    chave: 'catalogo.excluir',
    rotulo: 'Excluir produtos',
    descricao: 'Remover itens do catálogo definitivamente',
    papeis: ['administrador'],
  },
  {
    chave: 'pedidos.ver',
    rotulo: 'Ver pedidos',
    descricao: 'Consultar pedidos e seus itens',
    papeis: ['administrador', 'gerente', 'supervisor', 'atendente'],
  },
  {
    chave: 'pedidos.avancar',
    rotulo: 'Avançar pedidos',
    descricao: 'Mudar o status na máquina de estados',
    papeis: ['administrador', 'gerente', 'supervisor'],
  },
  {
    chave: 'atendimento.atender',
    rotulo: 'Atender clientes',
    descricao: 'Assumir conversas da fila e responder',
    papeis: ['administrador', 'gerente', 'supervisor', 'atendente'],
  },
  {
    chave: 'bots.editar',
    rotulo: 'Editar chatbots',
    descricao: 'Montar fluxos no No-Code e salvar rascunhos',
    papeis: ['administrador', 'gerente'],
  },
  {
    chave: 'bots.publicar',
    rotulo: 'Publicar chatbots',
    descricao: 'Colocar um fluxo no ar para os clientes da loja',
    papeis: ['administrador', 'gerente'],
  },
  {
    chave: 'bi.ver',
    rotulo: 'Ver BI',
    descricao: 'Acessar indicadores e relatórios da operação',
    papeis: ['administrador', 'gerente', 'supervisor'],
  },
  {
    chave: 'usuarios.gerenciar',
    rotulo: 'Gerenciar usuários',
    descricao: 'Cadastrar pessoas, trocar perfis e bloquear acessos',
    papeis: ['administrador'],
  },
];

export const DESCRICAO_PAPEL: Record<PapelUsuario, string> = {
  administrador: 'Acesso completo, incluindo gestão de usuários',
  gerente: 'Opera a loja e os chatbots, mas não gerencia pessoas',
  supervisor: 'Acompanha indicadores e atende, sem alterar o catálogo',
  atendente: 'Atende clientes na fila e consulta informações',
};

export const PAPEIS: PapelUsuario[] = ['administrador', 'gerente', 'supervisor', 'atendente'];

/** Quantos privilégios um perfil concentra — usado para ordenar e exibir. */
export const privilegiosDoPapel = (papel: PapelUsuario): Privilegio[] =>
  PRIVILEGIOS.filter((privilegio) => privilegio.papeis.includes(papel));

export const temPrivilegio = (papel: PapelUsuario, chave: string): boolean =>
  PRIVILEGIOS.find((privilegio) => privilegio.chave === chave)?.papeis.includes(papel) ?? false;
