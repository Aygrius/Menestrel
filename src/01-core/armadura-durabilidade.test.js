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

/* ============================================================
   Reforma das armaduras (30/10/2026)
   ============================================================
   "Sagração passa a dar resistência para as armaduras também" (o mesmo valor
   do bônus); a peça que só defende também é armadura e quebra; quebrada, não
   absorve nem defende; o conjunto completo e idêntico dá bônus; o kit se
   desmonta nas peças; o desgaste da luta volta para o item.
   ============================================================ */
describe('reforma das armaduras', () => {
  const CAT2 = {
    galea: { slug: 'galea', grupo: 'Armaduras', categoria_equip: 'armadura', slot_equip: 'cabeca',
      absorcao: 1, defesa: 3, resistencia: 1, tipo_armadura: 'L', conjunto: 'leve-calco' },
    ombreira: { slug: 'ombreira', grupo: 'Armaduras', categoria_equip: 'armadura', slot_equip: 'ombro',
      absorcao: 0, defesa: 2, resistencia: 0, tipo_armadura: 'L', conjunto: 'leve-calco' },
    kit: { slug: 'kit', grupo: 'Armaduras', conjunto: 'leve-calco', tipo_armadura: 'L' },
    anel: { slug: 'anel', grupo: 'Vestimentas', slot_equip: 'dedo' },
  };

  it('a Sagração soma o mesmo valor na resistência da peça', () => {
    const p = pj([{ ...eq('galea', 'cabeca'), bonus: 3 }]);
    expect(window.calcResistenciaArmadura(p, CAT2)).toBe(4);
    expect(window.pecasDeArmadura(p, CAT2)[0]).toMatchObject({ res: 4, res_max: 4, abs: 4, def: 3 });
  });

  it('a peça que só defende entra na lista (ela quebra), com resistência 0', () => {
    const p = pj([eq('ombreira', 'ombro')]);
    expect(window.pecasDeArmadura(p, CAT2)).toEqual([
      expect.objectContaining({ slug: 'ombreira', res: 0, res_max: 0, abs: 0, def: 2 }),
    ]);
  });

  it('peça quebrada não absorve, não dura e sai da lista do combate', () => {
    const p = pj([{ ...eq('galea', 'cabeca'), quebrada: true, res: 0 }]);
    expect(window.calcArmadura(p, CAT2)).toBe(0);
    expect(window.calcResistenciaArmadura(p, CAT2)).toBe(0);
    expect(window.pecasDeArmadura(p, CAT2)).toEqual([]);
    expect(window.durabilidadeDaPeca(p.inventario.itens[0], CAT2.galea)).toEqual({ max: 1, atual: 0, quebrada: true });
  });

  it('gravar a durabilidade conserta a peça quebrada', () => {
    const it0 = { ...eq('galea', 'cabeca'), quebrada: true, res: 0 };
    const r = window.comResistencia(it0, CAT2.galea, 5);
    expect(r.res).toBe(1);
    expect(r.quebrada).toBeUndefined();
  });

  it('conjunto completo e inteiro dá o bônus da classe; faltando ou quebrada, não', () => {
    const completo = [eq('galea', 'cabeca'), eq('ombreira', 'ombro')];
    expect(window.bonusDeConjunto(completo, CAT2)).toEqual({ conjunto: 'leve-calco', tipo: 'L', abs: 2, def: 4 });
    expect(window.calcArmadura(pj(completo), CAT2)).toBe(1 + 2);
    expect(window.bonusDeConjunto([eq('galea', 'cabeca')], CAT2)).toBeNull();
    expect(window.bonusDeConjunto([eq('galea', 'cabeca'), { ...eq('ombreira', 'ombro'), quebrada: true }], CAT2)).toBeNull();
  });

  it('o kit se desmonta nas peças, no mesmo recipiente, e some uma unidade', () => {
    const itens = [{ instanceId: 'k1', slug: 'kit', quantidade: 2, containerId: 'mochila' }];
    const r = window.desmontarKit(itens, 'k1', CAT2);
    expect(r[0]).toMatchObject({ instanceId: 'k1', quantidade: 1 });
    expect(r.slice(1).map((x) => [x.slug, x.containerId])).toEqual([['galea', 'mochila'], ['ombreira', 'mochila']]);
    expect(window.desmontarKit(itens, 'k1', { ...CAT2, kit: { ...CAT2.kit, slot_equip: 'dorso' } }), 'não é kit').toBe(itens);
  });

  it('o desgaste da luta volta para a instância; nada mudou = mesmo inventário', () => {
    const inv = { itens: [{ instanceId: 'g', slug: 'galea', res: 1 }, { instanceId: 'a', slug: 'anel' }] };
    expect(window.inventarioComDesgaste(inv, [{ instanceId: 'g', res: 1 }])).toBe(inv);
    const r = window.inventarioComDesgaste(inv, [{ instanceId: 'g', res: 0, quebrada: true }]);
    expect(r.itens[0]).toMatchObject({ res: 0, quebrada: true });
    expect(r.itens[1]).toBe(inv.itens[1]);
  });
});
