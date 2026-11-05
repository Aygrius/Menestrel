/* ============================================================
   capitulos-padrao.test.js — os capítulos no padrão dos cartões
   ============================================================
   Pedido do usuário (04/11/2026): "Quando o jogador clica em mesa, porque os
   cards dos capítulos não está seguindo o padrão [...] que criamos para
   diário?" Medido na prévia (Cena, 13 capítulos a 1920px): três colunas de
   cartões de 422 × 110px, 14px de vão, sem rolagem.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hist = readFileSync(resolve(__dirname, 'historias.jsx'), 'utf8');
const convites = readFileSync(resolve(__dirname, '../05-convites/convites.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('os capítulos da Cena e da Mesa', () => {
  it('18 por página, como o Diário', () => {
    expect(hist).toMatch(/const CENA_POR_PAGINA = 18;/);
    expect(hist).toMatch(/<div className="pjs-grid cena-grade">/);
  });
  it('a Mesa do Jogador não abre mais um capítulo por vez', () => {
    expect(hist).not.toMatch(/umPorVez = false/);
    expect(convites).not.toMatch(/umPorVez/);
    expect(css).not.toMatch(/\.cena-um\b/);
  });
  it('o mesmo padrão de cartão: altura igual, vão de 14px, texto numa linha', () => {
    expect(css).toMatch(/\.pjs-grid\.cena-grade \{ gap: 14px; grid-auto-rows: 1fr; \}/);
    expect(css).toMatch(/\.cena-grade \.pj-meta \{\s*min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/);
    expect(css).toMatch(/\.pjs\.cena-cartoes > \.pjs-grid\.cena-grade \{\s*flex: 1 1 0; min-height: 0;\s*grid-template-rows: repeat\(6, minmax\(72px, 1fr\)\);/);
  });
});

/* "A energia roxa, efeito dos cards de condição está bugado" (usuário,
   04/11/2026): o efeito era em pixels de um medalhão de 86px, e o medalhão
   cresceu para 94px. Agora é proporcional (fração do raio e cqw). */
describe('a energia das condições acompanha o medalhão', () => {
  it('o medalhão é contêiner, e o canal e o líquido se medem pelo raio', () => {
    expect(css).toMatch(/\.fp-medalhao \{ width: 86px; height: 86px; position: relative; border-radius: 50%; outline: none; container-type: size; \}/);
    expect(css).toMatch(/radial-gradient\(circle closest-side, transparent 77\.9%, #000 79\.1%, #000 93%, transparent 94\.2%\)/);
    expect(css).toMatch(/radial-gradient\(circle closest-side, #24103F 77\.9%, #5E2FA0 82\.8%, #9A74D8 86%, #5E2FA0 89\.3%, #24103F 94\.2%\)/);
    expect(css).toMatch(/translateX\(42\.3cqw\)/);
    expect(css).toMatch(/\.fp-medalhao-face \{ position: absolute; inset: 11\.63%;/);
  });
  it('nenhuma medida em pixel sobrou no efeito', () => {
    const i = css.indexOf('#root .menestrel-ui .fp-medalhao-canal {');
    const trecho = css.slice(i, css.indexOf('#root .menestrel-ui .fp-medalhao-face {', i));
    expect(trecho).not.toMatch(/\d+(\.\d+)?px,|translateX\(\d+(\.\d+)?px\)/);
  });
});
