/* ============================================================
   criatura-mochila.test.js — Ataque, peças vestidas e mochila
   ============================================================
   Pedido do usuário (25/09/2026): "Adicione um novo campo abaixo de
   equipamento, que vai se chamar Ataque, para englobar as armas de ataque. E
   em Equipamento ficará apenas os demais itens que a criatura possui
   (inclusive itens comuns disponíveis no catálogo)."

   Tudo continua em criaturas.equipamento. Três partes:
     ataque   armas (slot 'arma' e as antigas 'mao_d'/'mao_e')
     vestido  armaduras e escudo, uma por parte do corpo
     mochila  qualquer item, com quantidade — { slug, slot: 'mochila', qtd }
   A mochila não entra em conta nenhuma (absorção, defesa, ataque).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './criatura-formulas.jsx';

let F;
beforeAll(() => { F = window.CriaturaFormulas; expect(F).toBeDefined(); });

const ESPADA = { slug: 'espada', nome: 'Espada', grupo: 'Armas', slot_equip: 'maos', dano: 28, dano_l: -4, dano_m: 0, dano_p: 4, ajuste_atributo: 'FOR' };
const ARCO = { slug: 'arco', nome: 'Arco', grupo: 'Armas', slot_equip: 'maos', dano: 18, dano_l: 0, dano_m: 0, dano_p: 0, ajuste_atributo: 'PER' };
const ESCUDO = { slug: 'escudo', nome: 'Escudo', grupo: 'Armaduras', slot_equip: 'maos', absorcao: 2, defesa: 1 };
const PEITORAL = { slug: 'peitoral', nome: 'Peitoral', grupo: 'Armaduras', slot_equip: 'peito', absorcao: 8, defesa: 3, tipo_armadura: 'P' };
const PEITORAL2 = { slug: 'peitoral2', nome: 'Peitoral Extra', grupo: 'Armaduras', slot_equip: 'peito', absorcao: 5, defesa: 2, tipo_armadura: 'M' };
const CORDA = { slug: 'corda', nome: 'Corda', grupo: 'Itens' };
const RACAO = { slug: 'racao', nome: 'Ração', grupo: 'Consumíveis' };
const CAT = { espada: ESPADA, arco: ARCO, escudo: ESCUDO, peitoral: PEITORAL, peitoral2: PEITORAL2, corda: CORDA, racao: RACAO };

describe('partesDoEquipamento', () => {
  it('separa ataque, vestido e mochila — inclusive arma antiga em mão', () => {
    const eq = [
      { slug: 'espada', slot: 'mao_d' }, { slug: 'arco', slot: 'arma' },
      { slug: 'escudo', slot: 'mao_e' }, { slug: 'peitoral', slot: 'peito' },
      { slug: 'corda', slot: 'mochila', qtd: 2 },
    ];
    const p = F.partesDoEquipamento(eq, CAT);
    expect(p.ataque.map((e) => e.slug)).toEqual(['espada', 'arco']);
    expect(p.vestido.map((e) => e.slug)).toEqual(['escudo', 'peitoral']);
    expect(p.mochila).toEqual([{ slug: 'corda', slot: 'mochila', qtd: 2 }]);
  });
});

describe('slotParaPeca por parte', () => {
  it('Ataque aceita só arma', () => {
    expect(F.slotParaPeca(ESPADA, [], CAT, 'ataque')).toEqual({ slot: 'arma' });
    expect(F.slotParaPeca(PEITORAL, [], CAT, 'ataque')).toEqual({ motivo: 'nao_e_arma' });
    expect(F.slotParaPeca(CORDA, [], CAT, 'ataque')).toEqual({ motivo: 'nao_e_arma' });
  });

  it('Equipamento veste a peça no lugar livre', () => {
    expect(F.slotParaPeca(PEITORAL, [], CAT, 'itens')).toEqual({ slot: 'peito' });
    expect(F.slotParaPeca(ESCUDO, [], CAT, 'itens')).toEqual({ slot: 'escudo' });
  });

  it('peça com o lugar ocupado vai para a mochila, não é recusada', () => {
    const eq = [{ slug: 'peitoral', slot: 'peito' }];
    expect(F.slotParaPeca(PEITORAL2, eq, CAT, 'itens')).toEqual({ slot: 'mochila' });
  });

  it('item comum e arma reserva vão para a mochila', () => {
    expect(F.slotParaPeca(CORDA, [], CAT, 'itens')).toEqual({ slot: 'mochila' });
    expect(F.slotParaPeca(ESPADA, [], CAT, 'itens')).toEqual({ slot: 'mochila' });
  });

  it('sem parte, a regra antiga segue igual', () => {
    expect(F.slotParaPeca(CORDA, [], CAT)).toEqual({ motivo: 'sem_slot' });
    expect(F.slotParaPeca(ESPADA, [], CAT)).toEqual({ slot: 'arma' });
  });
});

describe('guardarNaMochila', () => {
  it('soma na pilha que já existe', () => {
    const eq = [{ slug: 'corda', slot: 'mochila', qtd: 2 }];
    expect(F.guardarNaMochila(eq, 'corda', 3)).toEqual([{ slug: 'corda', slot: 'mochila', qtd: 5 }]);
  });
  it('cria a pilha quando não existe', () => {
    expect(F.guardarNaMochila([], 'racao', 1)).toEqual([{ slug: 'racao', slot: 'mochila', qtd: 1 }]);
  });
});

describe('a mochila não entra na conta', () => {
  it('absorção, defesa e ataque ignoram a mochila', () => {
    const base = { forca: 2, agilidade: 1, equipamento: [{ slug: 'peitoral', slot: 'peito' }] };
    const comMochila = { ...base, equipamento: [...base.equipamento,
      { slug: 'peitoral2', slot: 'mochila', qtd: 1 }, { slug: 'espada', slot: 'mochila', qtd: 1 }] };
    const a = F.derivadosDaCriatura(base, CAT);
    const b = F.derivadosDaCriatura(comMochila, CAT);
    expect(b.absorcao).toBe(a.absorcao);
    expect(b.defesa).toBe(a.defesa);
    expect(b.armadura).toBe('P');
    expect(b.ataque).toBeNull();
    expect(F.ataquesDaCriatura(comMochila, CAT)).toEqual(F.ataquesDaCriatura(base, CAT));
  });
});

describe('saque: o que sobra na criatura derrotada', () => {
  const eq = [
    { slug: 'espada', slot: 'arma' }, { slug: 'peitoral', slot: 'peito' },
    { slug: 'corda', slot: 'mochila', qtd: 3 }, { slug: 'espada', slot: 'mochila', qtd: 1 },
  ];
  it('junta por item: a espada empunhada e a de reserva são 2 Espadas', () => {
    expect(F.saqueDisponivel(eq, {})).toEqual([
      { slug: 'espada', qtd: 2 }, { slug: 'peitoral', qtd: 1 }, { slug: 'corda', qtd: 3 },
    ]);
  });
  it('desconta o que já foi saqueado, e some o que acabou', () => {
    expect(F.saqueDisponivel(eq, { espada: 2, corda: 1 })).toEqual([
      { slug: 'peitoral', qtd: 1 }, { slug: 'corda', qtd: 2 },
    ]);
  });
});
