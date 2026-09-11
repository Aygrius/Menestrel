/* ============================================================
   pagina-lista.test.js — o tamanho da página não depende da rolagem
   ============================================================
   Bug relatado pelo usuário em 11/09/2026: "ao navegar pela lista de itens,
   magias, etc, ao clicar na magia, a navegação é afetada e aparece muitos
   itens por página."

   Causa: linhasQueCabem recebia `top` de getBoundingClientRect(), que é
   relativo à VIEWPORT e fica negativo com a página rolada. A conta
   `innerHeight - top` então CRESCIA com a rolagem, e a lista passava a
   "caber" dezenas de linhas.

   Por que aparecia no clique e não na rolagem: a conta só refaz quando algo
   re-renderiza. Rolar não re-renderiza; expandir uma linha sim. A rolagem
   ficava represada e estourava no clique seguinte — junto com a navegação
   pulando pra página 1, porque totalPages cai pra 1 quando a página incha.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './bestiario.jsx';

let linhasQueCabem;
beforeAll(() => {
  linhasQueCabem = window.linhasQueCabem;
  expect(linhasQueCabem).toBeTypeOf('function');
});

// Medidas de uma janela comum, lista logo abaixo de um cabeçalho.
const base = { innerHeight: 900, top: 200, reserved: 96, headH: 40, rowH: 42, min: 3 };

describe('linhasQueCabem', () => {
  it('no topo da página, cabe o que cabe na área visível', () => {
    // (900 - 200 - 96 - 40) / 42 = 13.4 -> 13
    expect(linhasQueCabem(base)).toBe(13);
  });

  it('ROLAGEM NÃO AUMENTA A PÁGINA — era o bug', () => {
    const rolado = { ...base, top: -1200 };
    expect(linhasQueCabem(rolado), 'top negativo não pode inflar').toBe(linhasQueCabem({ ...base, top: 0 }));
  });

  it('quanto mais rolado, nem por isso maior: os três dão o mesmo', () => {
    const tamanhos = [-50, -600, -5000].map((top) => linhasQueCabem({ ...base, top }));
    expect(new Set(tamanhos).size, 'o tamanho não pode variar com a rolagem').toBe(1);
  });

  it('a conta antiga inflava mesmo — controle negativo', () => {
    // Reproduz a fórmula de antes pra provar que o teste acima pega o bug.
    const antiga = (m) => Math.max(m.min, Math.floor((m.innerHeight - m.top - m.reserved - m.headH) / m.rowH));
    expect(antiga({ ...base, top: -1200 })).toBe(46);
    expect(antiga({ ...base, top: -1200 })).toBeGreaterThan(linhasQueCabem({ ...base, top: -1200 }));
  });

  it('janela baixa demais ainda devolve o mínimo, nunca 0 nem negativo', () => {
    expect(linhasQueCabem({ ...base, innerHeight: 150 })).toBe(3);
    expect(linhasQueCabem({ ...base, innerHeight: 0 })).toBe(3);
  });

  it('linha mais alta, menos linhas', () => {
    expect(linhasQueCabem({ ...base, rowH: 84 })).toBe(6);
  });
});
