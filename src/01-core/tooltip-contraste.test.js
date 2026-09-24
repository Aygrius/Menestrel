/* ============================================================
   tooltip-contraste.test.js — o tooltip não pode sumir no fundo
   ============================================================
   "Preciso de uma decisão de UI/UX sobre os tooltips, pois o fundo está muito
    parecido com o fundo do site." (usuário, 16/09/2026)

   Estava parecido porque era o MESMO: o .mn-tip pintava
   `background: var(--background)`, literalmente o #15120C da página, e o
   NavTooltip do shell pintava #141009 inline — indistinguível a olho nu. Nem um
   nem outro tinha borda ou sombra, então não sobrava nem silhueta.

   Pele escolhida pelo usuário: "painel flutuante" — quase preto, aro castanho e
   sombra funda, a mesma de .at-panel e .cdj-mesa-lista. O balão se separa por
   ficar mais ESCURO que a página, não mais claro, e por isso continua legível
   também sobre um card.

   "O background de todos os tooltips não pode ter transparência." (usuário,
   17/09/2026) — o fundo era rgba(18,13,6,0.94) com blur, e sobre um retrato ou
   um card claro os 6% que passavam deixavam o texto de trás borrar as letras.
   #120D06 é a mesma cor que aquele rgba resolvia sobre a página: o tom não
   mudou, só parou de vazar. O blur saiu junto — sem nada a atravessar o vidro,
   ele não tinha o que fazer.

   O projeto tem DUAS famílias de tooltip (o .mn-tip do CSS e o NavTooltip com
   estilo inline), e o usuário não sabe — nem deve saber — qual está vendo. O
   que este arquivo protege é justamente que as duas andem juntas: foi a
   segunda que passou despercebida da primeira vez.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raiz, 'index.css'), 'utf8');
const shell = readFileSync(resolve(raiz, '10-shell/shell.jsx'), 'utf8');

// O bloco compartilhado por .mn-tip e .fp-item-tip.
const blocoTip = (() => {
  const i = css.indexOf('#root .menestrel-ui .mn-tip,\n#root .menestrel-ui .fp-item-tip {');
  expect(i, 'não achei a regra base do tooltip').toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
})();

// O corpo do NavTooltip (shell.jsx), que estiliza inline.
const blocoNav = (() => {
  const i = shell.indexOf('function NavTooltip(');
  expect(i).toBeGreaterThan(-1);
  return shell.slice(i, shell.indexOf('\n}', i));
})();

describe('o tooltip do CSS deixou de usar a cor da página', () => {
  it('não pinta mais var(--background)', () => {
    expect(blocoTip).not.toMatch(/background:\s*var\(--background\)/);
  });

  it('veste o fundo escuro translúcido do painel flutuante', () => {
    expect(blocoTip).toMatch(/--tip-fundo:\s*#120D06/i);
    expect(blocoTip).toMatch(/background:\s*var\(--tip-fundo\)/);
  });

  it('e o fundo é OPACO — nada de rgba nem de blur por trás dele', () => {
    expect(blocoTip).not.toMatch(/--tip-fundo:\s*rgba/);
    expect(blocoTip).not.toMatch(/backdrop-filter/);
  });

  it('as outras duas coisas que davam a silhueta ficaram: aro e sombra', () => {
    expect(blocoTip).toMatch(/border:\s*1px solid var\(--tip-aro\)/);
    expect(blocoTip).toMatch(/box-shadow:/);
  });

  /* Com o balão emoldurado, uma seta de uma camada só sai sem aro e corta a
     borda ao meio — por isso ::before (contorno) + ::after (miolo). */
  it('a seta tem contorno e miolo, nas cores do balão', () => {
    const i = css.indexOf('#root .menestrel-ui .mn-tip::before,');
    expect(i, 'a seta de contorno não existe').toBeGreaterThan(-1);
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/border-top-color:\s*var\(--tip-fundo\)/);
    // E nenhuma seta pode continuar apontando para a cor do fundo do site.
    expect(css.slice(i, i + 1200)).not.toMatch(/border-(top|bottom)-color:\s*var\(--background\)/);
  });
});

describe('o NavTooltip do shell veste a MESMA pele', () => {
  /* A busca é por #141009 PINTANDO algo — o comentário do componente cita a
     cor velha de propósito, para registrar de onde se veio. */
  it('não pinta mais o #141009 quase igual à página', () => {
    expect(blocoNav).not.toMatch(/background:\s*'#141009'/);
    expect(blocoNav).not.toMatch(/borderColor:\s*'[^']*#141009/);
  });

  it('usa as mesmas duas cores do .mn-tip', () => {
    expect(blocoNav).toMatch(/TIP_FUNDO\s*=\s*'#120D06'/i);
    expect(blocoNav).toMatch(/TIP_ARO\s*=\s*'rgba\(106,85,48,0\.35\)'/);
  });

  it('e o fundo dele também é opaco, sem blur', () => {
    expect(blocoNav).not.toMatch(/TIP_FUNDO\s*=\s*'rgba/);
    expect(blocoNav).not.toMatch(/backdropFilter/);
  });

  it('e também ganha aro e sombra', () => {
    expect(blocoNav).toMatch(/border:\s*'1px solid '\s*\+\s*TIP_ARO/);
    expect(blocoNav).toMatch(/boxShadow:/);
  });

  it('a seta dele também é contorno + miolo', () => {
    expect(blocoNav).toMatch(/borderWidth:\s*6[\s\S]*?TIP_ARO/);
    expect(blocoNav).toMatch(/borderWidth:\s*5[\s\S]*?TIP_FUNDO/);
  });
});

describe('as duas famílias não podem divergir', () => {
  /* É o defeito que aconteceu: o .mn-tip foi corrigido e o NavTooltip ficou
     para trás — e era justamente o NavTooltip que o pill do clima usava. */
  it('o mesmo par fundo/aro aparece nos dois arquivos', () => {
    for (const cor of ['#120D06', 'rgba(106,85,48,0.35)']) {
      expect(css, 'falta ' + cor + ' no CSS do tooltip').toContain(cor);
      expect(blocoNav, 'falta ' + cor + ' no NavTooltip').toContain(cor);
    }
  });

  it('o fundo do tooltip é mais escuro que o fundo do site', () => {
    // --background: #15120C. O balão é #120D06 — abaixo em cada canal.
    const m = css.match(/--background:\s*#([0-9A-Fa-f]{6})/);
    expect(m, 'não achei o token --background').toBeTruthy();
    const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const pagina = hex(m[1]);
    const t = blocoTip.match(/--tip-fundo:\s*#([0-9A-Fa-f]{6})/);
    expect(t, 'o fundo do balão tem que ser um hex opaco').toBeTruthy();
    const balao = hex(t[1]);
    expect(balao.every((c, i) => c < pagina[i]), `balão ${balao} não é mais escuro que ${pagina}`).toBe(true);
  });
});
