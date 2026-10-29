/* ============================================================
   animal-vitalidade.test.js — o animal vivo: barras e comida
   ============================================================
   "Adicione ao feno e a ração animal, a condição de alimentar os animais do
    personagem, e adicione o sistema das barras de vitalidade para o animal."
   (usuário, 05/10/2026)

   O estado do animal mora na INSTÂNCIA do inventário (ele é um item), com a
   mesma forma do estado_atual do personagem: vitalidade { ef, eh } e
   condicoes { fome }. Os máximos saem da criatura ligada; sem nada gravado,
   o animal está inteiro e sem fome.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// Quem escolhe a casa da peça no animal é o mesmo código do bestiário.
import '../09-bestiario/criatura-formulas.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let vitalidadeDoAnimal, comVitalidadeDoAnimal, alimentarAnimal, ehRacaoDeAnimal, fomeQueOItemTira;
beforeAll(() => {
  ({ vitalidadeDoAnimal, comVitalidadeDoAnimal, alimentarAnimal, ehRacaoDeAnimal, fomeQueOItemTira } = window);
  expect(vitalidadeDoAnimal).toBeTypeOf('function');
  expect(alimentarAnimal).toBeTypeOf('function');
});

// Cavalo Andaluz (160), a criatura do Andaluz de Guerra.
const ANDALUZ = { id: 160, nome: 'Cavalo Andaluz', energia_fisica: 40, energia_heroica: 12, montaria: true };
const CAT = {
  cavalo_andaluz_de_guerra: { slug: 'cavalo_andaluz_de_guerra', nome: 'Andaluz de Guerra', grupo: 'Animais', criatura_id: 160 },
  feno: { slug: 'feno', nome: 'Feno', grupo: 'Consumíveis', ocupa: 0.5, efeito_positivo: 'Reduz 5 de Fome.' },
  racao_animal: { slug: 'racao_animal', nome: 'Ração Animal', grupo: 'Consumíveis', ocupa: 0.5, efeito_positivo: 'Reduz 10 de Fome.' },
  racao: { slug: 'racao', nome: 'Ração', grupo: 'Consumíveis', efeito_positivo: 'Reduz 20 de Fome.' },
  espada_longa: { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas' },
};
const cavalo = (extra) => ({ instanceId: 'c1', slug: 'cavalo_andaluz_de_guerra', quantidade: 1, ...(extra || {}) });

describe('as barras do animal', () => {
  it('sem nada gravado, o animal está inteiro e sem condição nenhuma', () => {
    const v = vitalidadeDoAnimal(cavalo(), ANDALUZ);
    expect(v).toMatchObject({ ef: 40, efMax: 40, eh: 12, ehMax: 12, condMax: 100 });
    expect(v.cond).toEqual({ vitalidade: 0, animo: 0, hidratacao: 0, nutricao: 0, frio: 0, calor: 0 });
  });

  it('as condições são as MESMAS do personagem, pelas mesmas chaves', () => {
    expect(window.CONDICOES_ANIMAL.map((c) => c.key))
      .toEqual(['vitalidade', 'animo', 'hidratacao', 'nutricao', 'frio', 'calor']);
  });

  it('o que está gravado manda, sempre dentro do teto', () => {
    const v = vitalidadeDoAnimal(cavalo({
      vitalidade: { ef: 9, eh: 99 },
      condicoes: { nutricao: 180, animo: 30 },
    }), ANDALUZ);
    expect(v.ef).toBe(9);
    expect(v.eh).toBe(12);            // teto da criatura
    expect(v.cond.nutricao).toBe(100); // teto da condição
    expect(v.cond.animo).toBe(30);
  });

  it('frio e calor são os dois lados da termorregulação', () => {
    const frio = vitalidadeDoAnimal(cavalo({ condicoes: { termorregulacao: -60 } }), ANDALUZ);
    expect(frio.cond.frio).toBe(60);
    expect(frio.cond.calor).toBe(0);
    const calor = vitalidadeDoAnimal(cavalo({ condicoes: { termorregulacao: 45 } }), ANDALUZ);
    expect(calor.cond.calor).toBe(45);
    expect(calor.cond.frio).toBe(0);
  });

  it('sem criatura ligada, não há teto nem barra de energia', () => {
    expect(vitalidadeDoAnimal(cavalo(), null)).toMatchObject({ ef: 0, efMax: 0, eh: 0, ehMax: 0 });
  });

  it('gravar uma barra mexe só nela, e só naquele animal', () => {
    const itens = [cavalo(), { instanceId: 'c2', slug: 'cavalo_andaluz_de_guerra', quantidade: 1 }];
    const out = comVitalidadeDoAnimal(itens, 'c1', 'ef', 25, ANDALUZ);
    expect(out[0].vitalidade).toEqual({ ef: 25 });
    expect(out[1].vitalidade).toBeUndefined();
    // Condição vai para condicoes, como no personagem.
    const comFome = comVitalidadeDoAnimal(out, 'c1', 'nutricao', 40, ANDALUZ);
    expect(comFome[0].condicoes).toEqual({ nutricao: 40 });
    expect(comFome[0].vitalidade).toEqual({ ef: 25 });
    // Frio grava o lado negativo da termorregulação.
    expect(comVitalidadeDoAnimal(itens, 'c1', 'frio', 30, ANDALUZ)[0].condicoes).toEqual({ termorregulacao: -30 });
    expect(comVitalidadeDoAnimal(itens, 'c1', 'calor', 30, ANDALUZ)[0].condicoes).toEqual({ termorregulacao: 30 });
    // Chave que não é barra do animal não grava nada.
    expect(comVitalidadeDoAnimal(itens, 'c1', 'karma', 5, ANDALUZ)[0].condicoes).toBeUndefined();
  });

  it('o valor entra dentro do teto, nunca fora', () => {
    const out = comVitalidadeDoAnimal([cavalo()], 'c1', 'ef', 999, ANDALUZ);
    expect(out[0].vitalidade.ef).toBe(40);
    expect(comVitalidadeDoAnimal([cavalo()], 'c1', 'eh', -5, ANDALUZ)[0].vitalidade.eh).toBe(0);
    expect(comVitalidadeDoAnimal([cavalo()], 'c1', 'animo', 500, ANDALUZ)[0].condicoes.animo).toBe(100);
  });
});

describe('o equipamento do animal', () => {
  const sela = { instanceId: 's1', slug: 'capa_simples', quantidade: 1 };
  const CAT_EQ = Object.assign({}, CAT, {
    capa_simples: { slug: 'capa_simples', nome: 'Capa Simples', grupo: 'Vestimentas', slot_equip: 'costas' },
    corda: { slug: 'corda', nome: 'Corda', grupo: 'Itens' },
  });

  it('a peça passa a apontar para o animal, com a casa escolhida', () => {
    const itens = [cavalo(), sela];
    const r = window.equiparNoAnimal(itens, 's1', 'c1', CAT_EQ);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe('costas');
    const peca = r.itens.find((x) => x.instanceId === 's1');
    expect(peca.animal_id).toBe('c1');
    expect(peca.slot_animal).toBe('costas');
    expect(window.itensDoAnimal(r.itens, 'c1').map((x) => x.instanceId)).toEqual(['s1']);
  });

  it('item sem casa própria vai carregado, na mochila do bicho', () => {
    const itens = [cavalo(), { instanceId: 'k1', slug: 'corda', quantidade: 1 }];
    const r = window.equiparNoAnimal(itens, 'k1', 'c1', CAT_EQ);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe('mochila');
  });

  it('pilha de vários se parte: só uma unidade vai para o animal', () => {
    const itens = [cavalo(), { instanceId: 'k1', slug: 'corda', quantidade: 3 }];
    // 5º param = a criatura do alvo (animal_subtipos, 05/10/2026); 6º = novoId.
    const r = window.equiparNoAnimal(itens, 'k1', 'c1', CAT_EQ, ANDALUZ, () => 'novo-1');
    expect(r.itens.find((x) => x.instanceId === 'k1').quantidade).toBe(2);
    expect(r.itens.find((x) => x.instanceId === 'novo-1')).toMatchObject({ quantidade: 1, animal_id: 'c1' });
  });

  it('recusa o que já está em uso, à venda, em outro animal — e outro animal', () => {
    const base = [cavalo(), { instanceId: 'c3', slug: 'cavalo_andaluz_de_guerra', quantidade: 1 }];
    const nega = (extra) => window.equiparNoAnimal(
      base.concat([{ instanceId: 'x1', slug: 'capa_simples', quantidade: 1, ...extra }]),
      'x1', 'c1', CAT_EQ).motivo;
    expect(nega({ equipado: true })).toBe('item_invalido');
    expect(nega({ vestido: true })).toBe('item_invalido');
    expect(nega({ anuncio_id: 7 })).toBe('item_invalido');
    expect(nega({ animal_id: 'c3' })).toBe('item_invalido');
    // Um animal não entra noutro animal.
    expect(window.equiparNoAnimal(base, 'c3', 'c1', CAT_EQ).motivo).toBe('item_invalido');
  });

  it('retirar devolve a peça à mochila do personagem', () => {
    const itens = [cavalo(), { ...sela, animal_id: 'c1', slot_animal: 'costas' }];
    const out = window.desequiparDoAnimal(itens, 's1');
    expect(out.find((x) => x.instanceId === 's1').animal_id).toBeUndefined();
    expect(out.find((x) => x.instanceId === 's1').slot_animal).toBeUndefined();
    expect(window.itensDoAnimal(out, 'c1')).toEqual([]);
  });
});

describe('comida de bicho', () => {
  it('feno e ração animal são ração; o resto não', () => {
    expect(ehRacaoDeAnimal(CAT.feno)).toBe(true);
    expect(ehRacaoDeAnimal(CAT.racao_animal)).toBe(true);
    expect(ehRacaoDeAnimal(CAT.racao)).toBe(false);        // essa é comida de gente
    expect(ehRacaoDeAnimal(CAT.espada_longa)).toBe(false);
    expect(ehRacaoDeAnimal(null)).toBe(false);
  });

  it('quanto cada uma mata de fome sai do catálogo', () => {
    expect(fomeQueOItemTira(CAT.feno)).toBe(5);
    expect(fomeQueOItemTira(CAT.racao_animal)).toBe(10);
    expect(fomeQueOItemTira(CAT.espada_longa)).toBe(0);
  });
});

describe('alimentar o animal', () => {
  const comFome = (nutricao) => cavalo({ condicoes: { nutricao } });

  it('gasta uma unidade e baixa a fome do bicho', () => {
    const itens = [comFome(30), { instanceId: 'r1', slug: 'racao_animal', quantidade: 3 }];
    const r = alimentarAnimal(itens, 'r1', 'c1', CAT, ANDALUZ);
    expect(r.ok).toBe(true);
    expect(r.quanto).toBe(10);
    expect(r.fome).toBe(20);
    expect(r.itens.find((x) => x.instanceId === 'r1').quantidade).toBe(2);
    expect(vitalidadeDoAnimal(r.itens.find((x) => x.instanceId === 'c1'), ANDALUZ).cond.nutricao).toBe(20);
  });

  it('a última unidade some do inventário', () => {
    const itens = [comFome(30), { instanceId: 'f1', slug: 'feno', quantidade: 1 }];
    const r = alimentarAnimal(itens, 'f1', 'c1', CAT, ANDALUZ);
    expect(r.ok).toBe(true);
    expect(r.itens.some((x) => x.instanceId === 'f1')).toBe(false);
    expect(r.fome).toBe(25);
  });

  it('comida demais não deixa a fome negativa', () => {
    const itens = [comFome(3), { instanceId: 'r1', slug: 'racao_animal', quantidade: 1 }];
    const r = alimentarAnimal(itens, 'r1', 'c1', CAT, ANDALUZ);
    expect(r.fome).toBe(0);
    expect(r.quanto).toBe(3);
  });

  it('bicho sem fome não come, e a ração não se gasta', () => {
    const itens = [cavalo(), { instanceId: 'r1', slug: 'racao_animal', quantidade: 2 }];
    const r = alimentarAnimal(itens, 'r1', 'c1', CAT, ANDALUZ);
    expect(r).toEqual({ ok: false, motivo: 'sem_fome' });
  });

  it('recusa o que não é ração e o alvo que não é animal', () => {
    const itens = [comFome(50),
      { instanceId: 'e1', slug: 'espada_longa', quantidade: 1 },
      { instanceId: 'r1', slug: 'racao_animal', quantidade: 1 }];
    expect(alimentarAnimal(itens, 'e1', 'c1', CAT, ANDALUZ).motivo).toBe('nao_e_racao');
    expect(alimentarAnimal(itens, 'r1', 'e1', CAT, ANDALUZ).motivo).toBe('alvo_invalido');
  });

  /* ── O QUE SOME É A COMIDA, E SÓ ELA (29/10/2026) ───────────────────────
     "A última unidade some do inventário" estava escrito como um filtro de
     `quantidade > 0` sobre a LISTA INTEIRA: qualquer instância gravada sem o
     campo `quantidade` desaparecia do inventário por se dar feno ao cavalo. */
  it('não apaga instância sem `quantidade` de tabela', () => {
    const itens = [comFome(30),
      { instanceId: 'f1', slug: 'feno', quantidade: 1 },
      // peça antiga, gravada sem o campo
      { instanceId: 'e1', slug: 'espada_longa', equipado: true, slot: 'mao_d' }];
    const r = alimentarAnimal(itens, 'f1', 'c1', CAT, ANDALUZ);
    expect(r.ok).toBe(true);
    expect(r.itens.some((x) => x.instanceId === 'f1'), 'o feno foi comido').toBe(false);
    expect(r.itens.some((x) => x.instanceId === 'e1'), 'a espada continua lá').toBe(true);
  });
});
