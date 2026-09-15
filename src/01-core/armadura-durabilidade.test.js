/* ============================================================
   armadura-durabilidade.test.js — arma não soma na armadura
   ============================================================
   Achado ao conferir a absorção da Lirael (14/09/2026): o Arco Élfico
   equipado tem `resistencia` 11 no catálogo — a durabilidade da ARMA — e
   entrava na resistência da armadura (31 em vez de 20). Escudo absorve, então
   continua contando.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './inventario-helpers.jsx';

const CAT = {
  arco_elfico: { slug: 'arco_elfico', categoria_equip: 'arma', resistencia: 11 },
  colete: { slug: 'colete', categoria_equip: 'armadura', absorcao: 4, resistencia: 8 },
  calca: { slug: 'calca', categoria_equip: 'armadura', absorcao: 2, resistencia: 4 },
  escudo_broquel: { slug: 'escudo_broquel', categoria_equip: 'arma', absorcao: 4, resistencia: 8 },
};
const pj = (itens) => ({ inventario: { itens } });
const eq = (slug, slot) => ({ instanceId: slug, slug, slot, equipado: true });

describe('durabilidade da armadura', () => {
  it('arma equipada sem absorção não entra', () => {
    const p = pj([eq('arco_elfico', 'mao_d'), eq('colete', 'peito'), eq('calca', 'pernas')]);
    expect(window.calcResistenciaArmadura(p, CAT)).toBe(12);
    expect(window.pecasDeArmadura(p, CAT).map((x) => x.slug)).toEqual(['colete', 'calca']);
  });

  it('escudo absorve, então conta', () => {
    const p = pj([eq('escudo_broquel', 'mao_e'), eq('colete', 'peito')]);
    expect(window.calcResistenciaArmadura(p, CAT)).toBe(16);
    expect(window.pecasDeArmadura(p, CAT).map((x) => x.slug)).toEqual(['escudo_broquel', 'colete']);
  });
});
