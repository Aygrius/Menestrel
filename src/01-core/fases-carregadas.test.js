/* ============================================================
   fases-carregadas.test.js — todo módulo de 01-core entra no main.tsx
   ============================================================
   Achado em 06/10/2026, trabalhando no pedido da fabricação: `fabricacao.jsx`
   e `efeito-temporario.jsx` existiam, estavam testados e NÃO estavam no
   main.tsx. Os testes passavam porque cada um importa o que usa; o app, não —
   nada tinha chamado `Object.assign(window, …)`, e `emConstrucao`, que o
   inventário chama sem prefixo, era ReferenceError ao abrir a mochila.

   É uma classe de erro que não dá sintoma nenhum na suíte: o arquivo novo
   funciona isolado e o app quebra. Por isso a conferência é do ÍNDICE, não do
   comportamento — todo módulo de 01-core tem de aparecer na lista de imports
   do main.tsx, que é o único lugar onde as fases são carregadas (não há glob:
   ver vite.config.js).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MAIN = readFileSync(resolve(AQUI, '..', 'main.tsx'), 'utf8');

const modulos = readdirSync(AQUI)
  .filter((f) => f.endsWith('.jsx') && !f.includes('.test.'));

/* Carregar PELO main.tsx vale direto ou por tabela: inventario-casas.jsx e
   inventario-concorrencia.jsx, por exemplo, entram por um `import` dentro de
   inventario-helpers.jsx — e isso basta, o módulo roda. O fechamento abaixo é
   o que separa "chega no app" de "não chega". */
const carregados = (() => {
  const vistos = new Set(modulos.filter((f) => MAIN.includes(`./01-core/${f}`)));
  const fila = [...vistos];
  while (fila.length) {
    const fonte = readFileSync(resolve(AQUI, fila.pop()), 'utf8');
    modulos.forEach((f) => {
      if (vistos.has(f) || !fonte.includes(`'./${f}'`)) return;
      vistos.add(f);
      fila.push(f);
    });
  }
  return vistos;
})();

describe('main.tsx carrega as fases', () => {
  it('conhece os módulos de 01-core', () => {
    // Guarda contra a pasta vazia ou um filtro quebrado dando "tudo certo".
    expect(modulos.length).toBeGreaterThan(5);
  });

  modulos.forEach((f) => {
    it(`01-core/${f} chega no app`, () => {
      expect(carregados.has(f)).toBe(true);
    });
  });
});
