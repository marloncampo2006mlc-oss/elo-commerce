import { describe, expect, it } from 'vitest';
import { PAGINAS, paginasPermitidas, primeiraPaginaPermitida } from '@/lib/paginas';
import { PRIVILEGIOS, privilegiosDoPapel } from '@/modules/usuarios/usuarios.types';

const privilegiosDe = (papel: Parameters<typeof privilegiosDoPapel>[0]) =>
  privilegiosDoPapel(papel).map((privilegio) => privilegio.chave);

const rotulos = (papel: Parameters<typeof privilegiosDoPapel>[0]) =>
  paginasPermitidas(privilegiosDe(papel)).map((pagina) => pagina.rotulo);

/**
 * Estes testes existem por causa de um bug real: as páginas da gestão
 * eram Server Components que chamavam os serviços diretamente, sem
 * passar pela API — então a verificação que existia nas rotas era
 * contornada, e um atendente abria o BI e via o faturamento.
 */
describe('páginas visíveis por perfil', () => {
  it('atendente não alcança nada de faturamento ou cadastro', () => {
    const vistas = rotulos('atendente');
    expect(vistas).not.toContain('BI / Supervisão');
    expect(vistas).not.toContain('Painel');
    expect(vistas).not.toContain('Produtos');
    expect(vistas).not.toContain('Clientes');
    expect(vistas).not.toContain('Usuários');
  });

  it('atendente alcança atendimento e no-code', () => {
    expect(rotulos('atendente')).toEqual(
      expect.arrayContaining(['Atendimento', 'No-Code']),
    );
  });

  it('somente administrador alcança usuários', () => {
    expect(rotulos('administrador')).toContain('Usuários');
    for (const papel of ['gerente', 'supervisor', 'atendente'] as const) {
      expect(rotulos(papel), papel).not.toContain('Usuários');
    }
  });

  it('supervisor vê indicadores mas não monta chatbot', () => {
    const vistas = rotulos('supervisor');
    expect(vistas).toContain('BI / Supervisão');
    expect(vistas).not.toContain('No-Code');
  });

  it('administrador alcança todas as páginas', () => {
    expect(paginasPermitidas(privilegiosDe('administrador'))).toHaveLength(PAGINAS.length);
  });

  it('todo perfil tem ao menos uma porta de entrada', () => {
    // Sem isso, alguém logaria e cairia direto num bloqueio.
    for (const papel of ['administrador', 'gerente', 'supervisor', 'atendente'] as const) {
      expect(primeiraPaginaPermitida(privilegiosDe(papel)), papel).not.toBeNull();
    }
  });

  it('nenhuma página exige privilégio inexistente', () => {
    const chaves = PRIVILEGIOS.map((privilegio) => privilegio.chave);
    for (const pagina of PAGINAS) {
      expect(chaves, pagina.href).toContain(pagina.privilegio);
    }
  });

  it('sem privilégio nenhum, não há porta de entrada', () => {
    expect(paginasPermitidas([])).toHaveLength(0);
    expect(primeiraPaginaPermitida([])).toBeNull();
  });
});
