/* ============================================================
   cartoes-ambientacao.test.js — 18 cartões, todos do mesmo tamanho
   ============================================================
   Pedido do usuário (04/11/2026): "Nas páginas reinos, cidades, etc, eu
   quero que tenha 18 cards, padronize o tamanho e o espaçamento entre os
   cards." Leitura de fonte: a medida de verdade foi feita no navegador
   (18 cartões de 120px, 14px entre colunas e entre fileiras).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const diario = readFileSync(resolve(__dirname, 'diario.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('os cartões da Ambientação', () => {
  it('dezoito por página, no Mestre e no Diário do Jogador', () => {
    expect(diario).toMatch(/const PAGE_SIZE_FALLBACK = 18;/);
    expect(diario).toMatch(/const POR_PAGINA_CARTOES = 18;/);
  });

  it('fileiras da mesma altura e o mesmo vão nas duas direções', () => {
    expect(css).toMatch(/\.pjs-grid\.diario-cartoes \{ gap: 14px; grid-auto-rows: 1fr; \}/);
  });

  it('nenhum texto quebra: nome e linhas numa linha só, com reticências', () => {
    expect(css).toMatch(/\.diario-cartoes \.pj-name,\s*\n[^{]*\.diario-cartoes \.diario-cartao-meta \{[^}]*text-overflow: ellipsis; white-space: nowrap;/);
  });

  it('o cartão sozinho segue no centro, com a largura de uma coluna', () => {
    expect(css).toMatch(/\.pjs-grid\.diario-cartoes > \.pj-card-wrap:only-child \{ width: calc\(\(100% - 14px\) \/ 2\); \}/);
    expect(css).toMatch(/\.pjs-grid\.diario-cartoes > \.pj-card-wrap:only-child \{ width: calc\(\(100% - 28px\) \/ 3\); \}/);
  });
});

/* AS SEIS FILEIRAS ENCHEM A PÁGINA (04/11/2026, usuário, com print: "abaixo
   de verrogar ainda há muito espaço vazio, e que ali não cabe mais uma
   fileira de cards"). A altura do cartão sai da altura da página. Medido no
   navegador a 1920×911: 18 cartões de 110px sem rolagem; com a página de
   840px, 104px — e a página 2, com 2 cartões, guarda o mesmo tamanho. */
describe('a altura da página dá o tamanho do cartão', () => {
  it('seis fileiras iguais entre o trilho e a paginação, com três colunas', () => {
    expect(css).toMatch(/\.mc-content > \.pjs\.diario-pagina > \.pjs-grid\.diario-cartoes \{\s*flex: 1 1 0; min-height: 0;\s*grid-template-rows: repeat\(6, minmax\(72px, 1fr\)\);/);
  });
  it('sem a altura da Ficha (--pg-altura), a página usa a da janela', () => {
    expect(css).toMatch(/\.mc-content > \.pjs\.diario-pagina \{ min-height: var\(--pg-altura, calc\(100dvh - 34px\)\); \}/);
  });
  it('o retrato acompanha o cartão, na proporção de sempre', () => {
    expect(css).toMatch(/height: 100%; max-height: 98px; width: auto; aspect-ratio: 76 \/ 98;/);
  });
});
