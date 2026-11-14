/* ============================================================
   restaurar-treino-armadura.test.js — auditoria 13/11/2026, item 28
   ============================================================
   O Restaurar do treino enchia só a `res` agregada: a peça quebrada seguia
   quebrada, e a absorção, a defesa e o bônus de conjunto que ela levou ao
   quebrar não voltavam. Agora o PJ volta à armadura da entrada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

beforeAll(() => { expect(window.restaurarPoolsDoTreino).toBeTypeOf('function'); });

const peca = (id, res, res_max, extra) => ({ instanceId: id, slug: id, res, res_max, abs: 3, def: 1, ...extra });
const entrada = {
  ar_max: 6, defesa_valor: 4, conjunto_bonus: { conjunto: 'malha', abs: 2, def: 1 },
  armadura_pecas: [peca('elmo', 5, 5, { conjunto: 'malha' }), peca('peitoral', 3, 8, { conjunto: 'malha' })],
};

describe('Restaurar no treino devolve a armadura da entrada', () => {
  it('a peça que quebrou na luta volta inteira, com a absorção, a defesa e o conjunto', () => {
    const naLuta = {
      tipo: 'pj', ef: 2, ef_max: 20, eh: 0, eh_max: 10, karma: 0, karma_max: 5,
      ar: 1, ar_max: 1, defesa_valor: 2, conjunto_bonus: null, res: 0,
      armadura_pecas: [peca('elmo', 0, 5, { quebrada: true }), peca('peitoral', 0, 8)],
      armadura_entrada: entrada,
    };
    const [r] = window.restaurarPoolsDoTreino([naLuta]);
    expect(r.armadura_pecas.every((pc) => !pc.quebrada)).toBe(true);
    expect(r.armadura_pecas.map((pc) => pc.res)).toEqual([5, 8]);
    expect(r.res).toBe(13);
    expect(r).toMatchObject({ ar: 6, ar_max: 6, defesa_valor: 4, conjunto_bonus: entrada.conjunto_bonus });
    expect(r).toMatchObject({ ef: 20, eh: 10, karma: 5 });
  });
  it('a peça que JÁ entrou quebrada segue quebrada (o treino não conserta a ficha)', () => {
    const ent = { ...entrada, armadura_pecas: [peca('elmo', 0, 5, { quebrada: true })] };
    const [r] = window.restaurarPoolsDoTreino([{ tipo: 'pj', ar: 0, ar_max: 0, res: 0,
      armadura_pecas: [peca('elmo', 0, 5, { quebrada: true })], armadura_entrada: ent }]);
    expect(r.armadura_pecas[0].quebrada).toBe(true);
  });
  it('a criatura (sem peças) volta a absorção ao máximo', () => {
    const [r] = window.restaurarPoolsDoTreino([{ tipo: 'criatura', ar: 1, ar_max: 4, res: 0, res_max: 6 }]);
    expect(r).toMatchObject({ ar: 4, res: 6 });
  });
});
