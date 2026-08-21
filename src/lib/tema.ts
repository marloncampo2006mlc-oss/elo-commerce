/**
 * Tema claro/escuro.
 *
 * A preferência vive no localStorage e é aplicada por um script que roda
 * ANTES da primeira pintura. Guardá-la só no React faria a tela nascer
 * no tema padrão e trocar depois da hidratação — o piscar branco que
 * incomoda justamente quem escolheu o escuro.
 *
 * Por isso o valor não é duplicado em estado: o <html> é a fonte, e o
 * botão apenas lê e escreve nele.
 */

export type Tema = 'claro' | 'escuro';

export const TEMA_PADRAO: Tema = 'escuro';
export const CHAVE_TEMA = 'elo-tema';

export const ehTema = (valor: unknown): valor is Tema =>
  valor === 'claro' || valor === 'escuro';

/**
 * Script inline do <head>. Curto de propósito: ele bloqueia a primeira
 * pintura, então tudo que não for essencial custa tempo de tela em
 * branco. O try/catch cobre o modo privado, onde ler o localStorage
 * pode lançar — e um erro aqui derrubaria a página inteira.
 *
 * O atributo é escrito SEMPRE, mesmo sem preferência salva, porque este
 * script é o único dono dele: o <html> não o traz do servidor. Se o JSX
 * também o declarasse, o React o reescreveria na hidratação e desfaria
 * a escolha de quem prefere o claro.
 */
export const SCRIPT_TEMA = `var t;try{t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)})}catch(e){}document.documentElement.dataset.tema=(t==='claro'||t==='escuro')?t:${JSON.stringify(TEMA_PADRAO)};`;
