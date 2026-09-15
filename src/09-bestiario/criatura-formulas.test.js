/* ============================================================
   criatura-formulas.test.js — as fórmulas derivadas de criatura
   ============================================================
   Reforma de 14/09/2026 (usuário):
     EF: 2*(SQRT(Peso))+Físico
     EH: (12+Aura)*(Estágio)
     RF: Estágio+Físico
     RM: Estágio+Aura
     VB: (Físico+Agilidade)*Estágio
   e Ataque, Tipo de Armadura, Absorção, Defesa, L, M, P e Dano 100% vindos do
   EQUIPAMENTO, com a conta do personagem.

   A fixture de EF são os dragões reais do banco (a fórmula de EF não mudou e
   batia em todos). As peças de equipamento são cópias de linhas reais de
   `itens` (leitura de 14/09/2026).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './criatura-formulas.jsx';

let F;
beforeAll(() => { F = window.CriaturaFormulas; expect(F).toBeDefined(); });

// nome, estagio, peso, fisico e energia_fisica REAIS do banco.
const DRAGOES = [
  { nome: 'Dradenar',        estagio: 15, peso:   6000, fisico: 4, ef: 159 },
  { nome: 'Hydra',           estagio: 21, peso:   7000, fisico: 5, ef: 173 },
  { nome: 'Draquae',         estagio: 18, peso:   7200, fisico: 5, ef: 175 },
  { nome: 'Wyvern',          estagio: 22, peso:   8500, fisico: 5, ef: 190 },
  { nome: 'Drake',           estagio: 19, peso:   9000, fisico: 4, ef: 194 },
  { nome: 'Dragão',          estagio: 25, peso:  42000, fisico: 5, ef: 415 },
  { nome: 'Dragão Imperial', estagio: 30, peso:  64000, fisico: 5, ef: 511 },
  { nome: 'Leviatã',         estagio: 50, peso: 100000, fisico: 5, ef: 638 },
];

// Linhas reais de `itens`, só com as colunas que a conta lê.
const CAT = {
  espada_longa:     { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas', slot_equip: 'maos', dano: 28, dano_l: -4, dano_m: 0, dano_p: 4, ajuste_atributo: 'FOR', maos_outras: 1 },
  arco:             { slug: 'arco', nome: 'Arco', grupo: 'Armas', slot_equip: 'maos', dano: 18, dano_l: -2, dano_m: 0, dano_p: -2, ajuste_atributo: 'PER', maos_outras: 2 },
  adaga:            { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', slot_equip: 'maos', dano: 10, dano_l: 0, dano_m: -2, dano_p: -4, ajuste_atributo: 'AGI', maos_outras: 1 },
  escudo_broquel:   { slug: 'escudo_broquel', nome: 'Escudo Broquel', grupo: 'Armaduras', slot_equip: 'maos', categoria_equip: 'arma', absorcao: 2, defesa: 1, tipo_armadura: 'L' },
  peitoral_de_aco:  { slug: 'peitoral_de_aco', nome: 'Peitoral de Aço', grupo: 'Armaduras', slot_equip: 'peito', absorcao: 8, defesa: 3, tipo_armadura: 'P' },
  calca_de_couro:   { slug: 'calca_de_couro', nome: 'Calça de Couro', grupo: 'Armaduras', slot_equip: 'pernas', absorcao: 2, defesa: 1, tipo_armadura: 'L' },
  elmo_armet:       { slug: 'elmo_armet', nome: 'Elmo Armet', grupo: 'Armaduras', slot_equip: 'cabeca', absorcao: 4, defesa: 2, tipo_armadura: 'P' },
};

describe('energiaFisica — 2·√Peso + Físico', () => {
  it('bate com os 8 dragões do banco', () => {
    for (const d of DRAGOES) expect(F.energiaFisica(d), d.nome).toBe(d.ef);
  });
  it('arredonda pra cima', () => {
    expect(F.energiaFisica({ peso: 2, fisico: 0 })).toBe(3);   // 2·1,414 = 2,83
  });
  it('peso zero ou ausente não quebra', () => {
    expect(F.energiaFisica({ fisico: 3 })).toBe(3);
    expect(F.energiaFisica({ peso: -5, fisico: 1 })).toBe(1);
  });
});

describe('energiaHeroica — (12 + Aura) × Estágio', () => {
  it('não depende mais do coletivo', () => {
    expect(F.energiaHeroica({ aura: 3, estagio: 15 })).toBe(225);
    expect(F.energiaHeroica({ aura: 3, estagio: 15, coletivo: 'Solitário' })).toBe(225);
    expect(F.energiaHeroica({ aura: -2, estagio: 4 })).toBe(40);
  });
});

describe('RF, RM e VB', () => {
  it('RF = Estágio + Físico · RM = Estágio + Aura', () => {
    expect(F.resistenciaFisica({ estagio: 10, fisico: 3 })).toBe(13);
    expect(F.resistenciaMagica({ estagio: 10, aura: -1 })).toBe(9);
  });
  it('VB = (Físico + Agilidade) × Estágio', () => {
    expect(F.velocidade({ fisico: 2, agilidade: 3, estagio: 4 })).toBe(20);
    expect(F.velocidade({ fisico: 5, agilidade: 6, estagio: 15 })).toBe(165);
  });
});

describe('slotParaPeca — onde a peça entra', () => {
  it('arma vai para a mão direita, depois a esquerda, depois não cabe', () => {
    expect(F.slotParaPeca(CAT.adaga, [], CAT)).toEqual({ slot: 'mao_d' });
    expect(F.slotParaPeca(CAT.adaga, [{ slug: 'adaga', slot: 'mao_d' }], CAT)).toEqual({ slot: 'mao_e' });
    expect(F.slotParaPeca(CAT.escudo_broquel,
      [{ slug: 'adaga', slot: 'mao_d' }, { slug: 'adaga', slot: 'mao_e' }], CAT)).toEqual({ motivo: 'maos_ocupadas' });
  });
  it('arma de duas mãos precisa das duas livres, e depois ocupa as duas', () => {
    expect(F.slotParaPeca(CAT.arco, [{ slug: 'adaga', slot: 'mao_d' }], CAT)).toEqual({ motivo: 'maos_ocupadas' });
    expect(F.slotParaPeca(CAT.adaga, [{ slug: 'arco', slot: 'mao_d' }], CAT)).toEqual({ motivo: 'maos_ocupadas' });
  });
  it('armadura vai no próprio slot, uma por slot', () => {
    expect(F.slotParaPeca(CAT.peitoral_de_aco, [], CAT)).toEqual({ slot: 'peito' });
    expect(F.slotParaPeca(CAT.peitoral_de_aco, [{ slug: 'peitoral_de_aco', slot: 'peito' }], CAT))
      .toEqual({ motivo: 'slot_ocupado' });
  });
});

describe('derivadosDoEquipamento — a conta do personagem', () => {
  const at = { forca: 4, agilidade: 2, percepcao: 3, aura: 1 };

  it('sem nada equipado: sem ataque, Absorção 0, Defesa = Agilidade, Leve', () => {
    expect(F.derivadosDoEquipamento({ equipamento: [], catalogoBySlug: CAT, atributos: at })).toEqual({
      ataque: null, armadura: 'L', absorcao: 0, defesa: 2,
      dano_l: null, dano_m: null, dano_p: null, dano_100: null, danos_100: [],
    });
  });

  it('arma: L/M/P da arma + atributo de ajuste; Dano 100% = dano + Força', () => {
    const r = F.derivadosDoEquipamento({ equipamento: [{ slug: 'espada_longa', slot: 'mao_d' }], catalogoBySlug: CAT, atributos: at });
    expect(r).toMatchObject({ ataque: 'Espada Longa', dano_l: 0, dano_m: 4, dano_p: 8, dano_100: 32 });
    const arco = F.derivadosDoEquipamento({ equipamento: [{ slug: 'arco', slot: 'mao_d' }], catalogoBySlug: CAT, atributos: at });
    expect(arco).toMatchObject({ ataque: 'Arco', dano_l: 1, dano_m: 3, dano_p: 1, dano_100: 22 });   // PER 3
  });

  it('a mão direita manda no ataque; escudo não é ataque', () => {
    const r = F.derivadosDoEquipamento({
      equipamento: [{ slug: 'escudo_broquel', slot: 'mao_d' }, { slug: 'adaga', slot: 'mao_e' }],
      catalogoBySlug: CAT, atributos: at,
    });
    expect(r.ataque).toBe('Adaga');
  });

  it('armadura: soma absorção e defesa de todas as peças; tipo do peitoral', () => {
    const r = F.derivadosDoEquipamento({
      equipamento: [
        { slug: 'peitoral_de_aco', slot: 'peito' },
        { slug: 'calca_de_couro', slot: 'pernas' },
        { slug: 'escudo_broquel', slot: 'mao_e' },
      ],
      catalogoBySlug: CAT, atributos: at,
    });
    expect(r).toMatchObject({ armadura: 'P', absorcao: 12, defesa: 2 + 5 });
  });

  it('sem peitoral o tipo é Leve, mesmo com elmo pesado', () => {
    const r = F.derivadosDoEquipamento({ equipamento: [{ slug: 'elmo_armet', slot: 'cabeca' }], catalogoBySlug: CAT, atributos: at });
    expect(r).toMatchObject({ armadura: 'L', absorcao: 4, defesa: 4 });
  });

  // "o 'dano 100%' deve aparecer para todos os tipos de equipamentos de
  // ataque que a criatura tiver" (usuário, 14/09/2026)
  it('Dano 100% de cada arma, a direita primeiro; escudo fica de fora', () => {
    const r = F.derivadosDoEquipamento({
      equipamento: [{ slug: 'adaga', slot: 'mao_e' }, { slug: 'espada_longa', slot: 'mao_d' }],
      catalogoBySlug: CAT, atributos: at,
    });
    expect(r.danos_100.map((d) => d.slug)).toEqual(['espada_longa', 'adaga']);
    expect(r.danos_100[0].dano_100).toBe(r.dano_100);
    expect(r.danos_100[1].dano_100).toBe(Number(CAT.adaga.dano) + 4);
    const comEscudo = F.derivadosDoEquipamento({
      equipamento: [{ slug: 'escudo_broquel', slot: 'mao_d' }, { slug: 'adaga', slot: 'mao_e' }],
      catalogoBySlug: CAT, atributos: at,
    });
    expect(comEscudo.danos_100.map((d) => d.slug)).toEqual(['adaga']);
  });

  it('peça fora do catálogo é ignorada', () => {
    const r = F.derivadosDoEquipamento({ equipamento: [{ slug: 'sumiu', slot: 'mao_d' }], catalogoBySlug: CAT, atributos: at });
    expect(r.ataque).toBeNull();
  });
});

describe('derivadosDaCriatura — tudo junto', () => {
  it('atributos + equipamento → as colunas, com os tiers do Dano 100%', () => {
    const c = {
      estagio: 5, peso: 100, fisico: 2, aura: 1, agilidade: 3, forca: 4, percepcao: 1,
      equipamento: [{ slug: 'espada_longa', slot: 'mao_d' }, { slug: 'peitoral_de_aco', slot: 'peito' }],
    };
    expect(F.derivadosDaCriatura(c, CAT)).toEqual({
      energia_fisica: 22, energia_heroica: 65, resistencia_fisica: 7, resistencia_magica: 6, velocidade: 25,
      ataque: 'Espada Longa', armadura: 'P', absorcao: 8, defesa: 6,
      dano_l: 0, dano_m: 4, dano_p: 8, dano_100: 32, dano_25: 8, dano_50: 16, dano_75: 24,
      danos_100: [{ slug: 'espada_longa', nome: 'Espada Longa', dano_100: 32 }],
    });
  });

  it('sem arma, os tiers também ficam vazios', () => {
    const r = F.derivadosDaCriatura({ estagio: 1, peso: 1, equipamento: [] }, CAT);
    expect([r.dano_100, r.dano_25, r.dano_50, r.dano_75]).toEqual([null, null, null, null]);
  });
});

/* ataquesDaCriatura (14/09/2026) — a ficha dos animais do PJ mostra TODOS os
   ataques, um por arma, com a mesma conta de derivadosDoEquipamento. */
describe('ataquesDaCriatura — um ataque por arma', () => {
  it('lista as duas mãos, a direita primeiro, com L/M/P e tiers de cada', () => {
    const c = { forca: 3, agilidade: 2, equipamento: [
      { slug: 'adaga', slot: 'mao_e' }, { slug: 'espada_longa', slot: 'mao_d' },
    ] };
    const r = F.ataquesDaCriatura(c, CAT);
    expect(r.map((a) => a.nome)).toEqual(['Espada Longa', 'Adaga']);
    expect(r[0]).toMatchObject({ dano_l: -1, dano_m: 3, dano_p: 7, dano_100: 31, dano_75: 24, dano_50: 16, dano_25: 8 });
    expect(r[1]).toMatchObject({ dano_l: 2, dano_m: 0, dano_p: -2, dano_100: 13 });
  });

  it('escudo e armadura não viram ataque', () => {
    const c = { forca: 0, equipamento: [{ slug: 'escudo_broquel', slot: 'mao_e' }, { slug: 'peitoral_de_aco', slot: 'peito' }] };
    expect(F.ataquesDaCriatura(c, CAT)).toEqual([]);
  });

  it('criatura antiga sem equipamento cai no ataque das colunas', () => {
    const c = { ataque: 'Coice', dano_l: 5, dano_m: 6, dano_p: 7, dano_100: 20, dano_75: 15, dano_50: 10, dano_25: 5 };
    expect(F.ataquesDaCriatura(c, CAT)).toEqual([{ slug: null, nome: 'Coice',
      dano_l: 5, dano_m: 6, dano_p: 7, dano_100: 20, dano_75: 15, dano_50: 10, dano_25: 5 }]);
  });
});
