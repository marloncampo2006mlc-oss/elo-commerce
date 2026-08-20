import { describe, expect, it } from 'vitest';
import {
  PAPEIS, PRIVILEGIOS, podeFazer, privilegiosDoPapel, privilegiosEfetivos,
  temPersonalizacao, temPrivilegio,
} from '@/modules/usuarios/usuarios.types';

/**
 * A matriz de privilégios é exibida ao administrador como promessa do que
 * cada perfil pode fazer. Estes testes garantem que a promessa não se
 * desfaça silenciosamente quando alguém editar a tabela.
 */
describe('matriz de privilégios', () => {
  it('administrador tem todos os privilégios', () => {
    expect(privilegiosDoPapel('administrador')).toHaveLength(PRIVILEGIOS.length);
  });

  it('somente administrador gerencia usuários', () => {
    expect(temPrivilegio('administrador', 'usuarios.gerenciar')).toBe(true);
    for (const papel of PAPEIS.filter((p) => p !== 'administrador')) {
      expect(temPrivilegio(papel, 'usuarios.gerenciar'), papel).toBe(false);
    }
  });

  it('somente administrador exclui produtos', () => {
    expect(temPrivilegio('administrador', 'catalogo.excluir')).toBe(true);
    expect(temPrivilegio('gerente', 'catalogo.excluir')).toBe(false);
  });

  it('atendente atende, mas não edita catálogo nem vê BI', () => {
    expect(temPrivilegio('atendente', 'atendimento.atender')).toBe(true);
    expect(temPrivilegio('atendente', 'catalogo.editar')).toBe(false);
    expect(temPrivilegio('atendente', 'bi.ver')).toBe(false);
  });

  it('supervisor vê BI e avança pedidos, mas não publica chatbot', () => {
    expect(temPrivilegio('supervisor', 'bi.ver')).toBe(true);
    expect(temPrivilegio('supervisor', 'pedidos.avancar')).toBe(true);
    expect(temPrivilegio('supervisor', 'bots.publicar')).toBe(false);
  });

  it('todo perfil enxerga menos ou igual ao administrador', () => {
    for (const papel of PAPEIS) {
      expect(privilegiosDoPapel(papel).length).toBeLessThanOrEqual(PRIVILEGIOS.length);
    }
  });

  it('nenhum privilégio fica sem dono', () => {
    for (const privilegio of PRIVILEGIOS) {
      expect(privilegio.papeis.length, privilegio.chave).toBeGreaterThan(0);
    }
  });

  it('não há chaves duplicadas na matriz', () => {
    const chaves = PRIVILEGIOS.map((privilegio) => privilegio.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('privilégios individuais', () => {
  it('sem lista própria, herda exatamente o pacote do papel', () => {
    const usuario = { papel: 'atendente' as const, privilegios: null };
    expect(privilegiosEfetivos(usuario))
      .toEqual(privilegiosDoPapel('atendente').map((p) => p.chave));
    expect(temPersonalizacao(usuario)).toBe(false);
  });

  it('com lista própria, ela substitui o papel por inteiro', () => {
    const usuario = { papel: 'atendente' as const, privilegios: ['catalogo.editar'] };
    // ganhou o que o papel não dava...
    expect(podeFazer(usuario, 'catalogo.editar')).toBe(true);
    // ...e perdeu o que o papel dava, porque a lista é exata, não soma
    expect(podeFazer(usuario, 'atendimento.atender')).toBe(false);
    expect(temPersonalizacao(usuario)).toBe(true);
  });

  it('lista vazia é tratada como ausência, não como "sem nada"', () => {
    // Evita o acidente de gravar [] e a pessoa perder todo o acesso
    // sem que ninguém tenha decidido isso.
    const usuario = { papel: 'gerente' as const, privilegios: [] };
    expect(privilegiosEfetivos(usuario).length).toBeGreaterThan(0);
    expect(temPersonalizacao(usuario)).toBe(false);
  });

  it('personalização não escapa da matriz conhecida', () => {
    const chaves = PRIVILEGIOS.map((p) => p.chave);
    const usuario = { papel: 'atendente' as const, privilegios: ['catalogo.ver', 'bi.ver'] };
    for (const chave of privilegiosEfetivos(usuario)) {
      expect(chaves, chave).toContain(chave);
    }
  });
});
