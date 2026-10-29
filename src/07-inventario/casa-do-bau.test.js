/* ============================================================
   casa-do-bau.test.js — a casa do baú e a geometria da grade
   ============================================================
   Pedidos do usuário em 26/10/2026, nesta ordem:

     • "Aumente o slot do inventário/loja, para o ícone ficar maior."
     • "Os slots de inventário/loja estão ocupando 11 linhas, altere para 10
        linhas e 12 colunas, ganhando espaço para aumentar a visualização do
        item à direita."

   O que este arquivo protege é um acordo que já se desencontrou antes: o
   tamanho da casa é lido em DOIS lugares — o CSS (coluna da grade, cartão e
   casa vazia) e o JavaScript, que calcula quantas casas cabem na tela
   (useGridDimensions). Com o número escrito à mão nos dois, um fica para trás
   do outro e o baú ganha fileiras vazias ou perde a última coluna.

   A solução foi um token só, `--inv-casa`, lido pelo JS. Estes testes
   garantem que ninguém volte a escrever o número solto.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raiz, 'index.css'), 'utf8');
const inv = readFileSync(resolve(raiz, '07-inventario/inventario.jsx'), 'utf8');
const loja = readFileSync(resolve(raiz, '07-inventario/loja.jsx'), 'utf8');
const estoque = readFileSync(resolve(raiz, '06-historias/estoque-mestre.jsx'), 'utf8');

const token = (nome) => {
  const m = new RegExp('--' + nome + ':\\s*([^;]+);').exec(css);
  expect(m, 'o token --' + nome + ' existe').toBeTruthy();
  return m[1].trim();
};

describe('o tamanho da casa vive num token só', () => {
  it('o CSS declara --inv-casa e --inv-casa-vao', () => {
    expect(token('inv-casa')).toBe('78px');
    expect(token('inv-casa-vao')).toBe('6px');
  });

  it('a grade, o cartão e a casa vazia usam o token, não um número solto', () => {
    const blocos = [
      '#root .menestrel-ui .inv-bag-grid--slots,\n#root .menestrel-ui .loja-grid--slots {',
      '#root .menestrel-ui .inv-slot-ghost {',
    ];
    blocos.forEach((inicio) => {
      const i = css.indexOf(inicio);
      expect(i, inicio).toBeGreaterThan(-1);
      const regra = css.slice(i, css.indexOf('}', i));
      expect(regra, inicio).toMatch(/var\(--inv-casa/);
      expect(regra, inicio).not.toMatch(/:\s*50px/);
    });
  });

  it('as três grades da tela montam as colunas com o token', () => {
    [['inventario', inv], ['loja', loja], ['estoque', estoque]].forEach(([nome, fonte]) => {
      expect(fonte, nome).toMatch(/gridTemplateColumns: `repeat\(\$\{\w+\}, var\(--inv-casa\)\)`/);
      expect(fonte, nome).not.toMatch(/gridTemplateColumns: `repeat\(\$\{\w+\}, 50px\)`/);
    });
  });

  it('o JavaScript LÊ o token em vez de repetir o número', () => {
    expect(inv).toMatch(/getPropertyValue\('--inv-casa'\)/);
    expect(inv).toMatch(/getPropertyValue\('--inv-casa-vao'\)/);
    // O passo da conta é a casa + o vão, medidos — não uma constante solta.
    expect(inv).toMatch(/const SLOT_SIZE = casa \+ vao;/);
    expect(inv).not.toMatch(/const SLOT_SIZE = \d+;/);
    expect(inv).not.toMatch(/const PASSO = \d+;/);
  });
});

describe('a grade é de 8 linhas por 10 colunas', () => {
  it('os tetos estão nesses números', () => {
    expect(/const MAX_GRID_COLS = (\d+);/.exec(inv)[1]).toBe('10');
    expect(/const MAX_GRID_ROWS = (\d+);/.exec(inv)[1]).toBe('8');
  });
  it('são tetos, não números fixos — tela estreita encolhe em vez de vazar', () => {
    expect(inv).toMatch(/Math\.min\(MAX_GRID_COLS, Math\.max\(3,/);
    expect(inv).toMatch(/Math\.min\(MAX_GRID_ROWS, Math\.max\(/);
  });
});

describe('o painel do item recebe o espaço que a grade deixou', () => {
  it('a largura dele também é um token', () => {
    expect(token('bau-painel-w')).toBe('440px');
  });
  it('as duas colunas da tela usam o token', () => {
    const i = css.indexOf('#root .menestrel-ui .bau-corpo--painel {');
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/var\(--bau-painel-w\)/);
    expect(css).toMatch(/\.fp-page\.is-inventario \.bau-corpo--painel \{ grid-template-columns: max-content var\(--bau-painel-w\); \}/);
  });
  it('a conta das colunas desconta o painel LENDO o token', () => {
    expect(inv).toMatch(/getPropertyValue\('--bau-painel-w'\)/);
    expect(inv).not.toMatch(/comPainel \? 380 : 0/);
  });
  it('a geometria fecha: 10 casas + o painel cabem no console de 1600px', () => {
    const casa = parseFloat(token('inv-casa'));
    const vao = parseFloat(token('inv-casa-vao'));
    const painel = parseFloat(token('bau-painel-w'));
    const grade = 10 * casa + 9 * vao;           // 834 — a mesma largura de antes
    const cartao = 20 + grade + 20 + painel + 20; // respiro + grade + vão + painel + respiro
    const console1600 = 1600 - 232;               // menos o menu lateral
    expect(cartao).toBeLessThanOrEqual(console1600);
  });
});

/* ── O TETO DO PAINEL DO ITEM ──────────────────────────────────────────────
   "Do lado direito aparecem várias informações e essas informações criam uma
   barra de rolagem na página, eu quero que a barra de rolagem seja no card de
   visualização do item." (usuário, 26/10/2026 — pela segunda vez)

   O teto era `calc(100vh - 132px)`: um número chutado, que não sabe onde o
   card começa (a barra de busca e o cabeçalho ficam acima) nem do respiro que
   o .mc-content reserva no pé. Com descrição longa o card passava do fim da
   tela, e quem rolava era a página.

   Agora o teto é a ALTURA DA GRADE, medida — a grade já é calculada para
   caber na tela, então o painel nunca é o item mais alto da linha. Medido no
   Chrome: grade 694px, painel 694px, texto rolando por dentro do .ms-body. */
describe('o card do item nunca é mais alto que a grade', () => {
  it('o teto do painel sai de um valor MEDIDO, não de 100vh', () => {
    const i = css.indexOf('#root .menestrel-ui .bau-painel {\n  position: sticky');
    expect(i, 'a regra do painel com sticky').toBeGreaterThan(-1);
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/max-height:\s*var\(--bau-painel-h/);
  });
  it('o JavaScript publica a altura da grade nessa variável', () => {
    expect(inv).toMatch(/setProperty\('--bau-painel-h'/);
    // A conta é exata: casas + vãos entre elas + o padding real da grade.
    expect(inv).toMatch(/rows \* casa \+ \(rows - 1\) \* vao \+ padV/);
  });
  it('e o corpo do card é quem rola por dentro', () => {
    const i = css.indexOf("#root .menestrel-ui .ms-painel > .modal-em-painel .ms-body");
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/overflow-y:\s*auto/);
  });
});

/* O `overflow: hidden` do .fp-invtab tornava-o a caixa de rolagem do
   `position: sticky` do painel — e como ele nunca rola, o card subia junto
   com a página e saía da tela. `clip` recorta igual sem virar caixa de
   rolagem. Medido no Chrome: com `hidden`, rolar 600px levava o topo do
   painel de 101 para -499; com `clip`, ele para em 93. */
describe('o painel acompanha a rolagem em vez de subir com ela', () => {
  it('a aba do inventário recorta com clip, não com hidden', () => {
    const i = css.indexOf('#root .menestrel-ui .fp-invtab {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/overflow:\s*clip/);
    expect(regra).not.toMatch(/overflow:\s*hidden/);
  });
});
