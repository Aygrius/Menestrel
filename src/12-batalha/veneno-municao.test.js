/* ============================================================
   veneno-municao.test.js — veneno em arma e flecha, munição do arco
   ============================================================
   "Itens venenosos (Blueta, Leopis, Theonia) podem ser usados em armas e
    flechas, que se tornam (flecha envenenada, espada envenenada, etc). A
    flecha só pode ser usada uma vez, mas a arma aplica o efeito nas próximas
    15 ações (que persiste entre combates diferentes)." (usuário, 28/09/2026)

   Decisões do mesmo dia: 1 dose = 1 flecha; todo ataque com arco gasta uma
   flecha; o veneno só tira EF se o golpe chegar à EF.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });
const M = () => window.MotorBatalha;

const CAT = {
  secrecao_blueta: { slug: 'secrecao_blueta', nome: 'Blueta', grupo: 'Consumíveis',
    efeito_negativo: 'Diminui 5 de Energia Física; aumenta 50 de Doença.' },
  secrecao_theonia: { slug: 'secrecao_theonia', nome: 'Theonia', grupo: 'Consumíveis',
    efeito_negativo: 'Diminui 15 de Energia Física; aumenta 100 de Doença.' },
  espada_longa: { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas', categoria_equip: 'arma', dano: 20 },
  punhal: { slug: 'punhal', nome: 'Punhal', grupo: 'Armas', categoria_equip: 'arma', dano: 12 },
  arco: { slug: 'arco', nome: 'Arco', grupo: 'Armas', categoria_equip: 'arma', dano: 18 },
  flecha: { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S' },
  flecha_envenenada_blueta: { slug: 'flecha_envenenada_blueta', nome: 'Flecha Envenenada (Blueta)',
    grupo: 'Consumíveis', efeito_negativo: 'Diminui 5 de Energia Física.' },
};
let seq = 0;
const novoId = () => 'novo-' + (++seq);

describe('envenenar no inventário', () => {
  it('arma: gasta 1 dose e carrega o veneno por 15 ações', () => {
    const itens = [
      { instanceId: 'v1', slug: 'secrecao_blueta', quantidade: 2 },
      { instanceId: 'e1', slug: 'espada_longa', quantidade: 1, equipado: true, slot: 'mao_d' },
    ];
    const r = window.envenenarNoInventario(itens, 'v1', 'e1', 1, CAT, novoId);
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 'v1').quantidade).toBe(1);
    expect(r.itens.find((x) => x.instanceId === 'e1').veneno)
      .toEqual({ slug: 'secrecao_blueta', nome: 'Blueta', ef: 5, acoes: 15 });
    expect(window.nomeComVeneno('Espada Longa', r.itens.find((x) => x.instanceId === 'e1'))).toBe('Espada Longa envenenada');
    expect(window.nomeComVeneno('Punhal', { veneno: { ef: 5, acoes: 3 } })).toBe('Punhal envenenado');
  });

  it('a última dose some do inventário', () => {
    const itens = [
      { instanceId: 'v1', slug: 'secrecao_blueta', quantidade: 1 },
      { instanceId: 'p1', slug: 'punhal', quantidade: 1 },
    ];
    const r = window.envenenarNoInventario(itens, 'v1', 'p1', 1, CAT, novoId);
    expect(r.itens.some((x) => x.instanceId === 'v1')).toBe(false);
  });

  it('flecha: 1 dose por flecha, na mesma aljava das flechas', () => {
    const itens = [
      { instanceId: 'v1', slug: 'secrecao_blueta', quantidade: 3 },
      { instanceId: 'f1', slug: 'flecha', quantidade: 10, containerId: 'aljava' },
    ];
    const r = window.envenenarNoInventario(itens, 'v1', 'f1', 5, CAT, novoId);
    expect(r.ok).toBe(true);
    expect(r.quantidade).toBe(3);                       // só havia 3 doses
    expect(r.itens.some((x) => x.instanceId === 'v1')).toBe(false);
    expect(r.itens.find((x) => x.instanceId === 'f1').quantidade).toBe(7);
    const env = r.itens.find((x) => x.slug === 'flecha_envenenada_blueta');
    expect(env).toMatchObject({ quantidade: 3, containerId: 'aljava' });
  });

  it('arco não recebe veneno — quem leva é a flecha', () => {
    const itens = [
      { instanceId: 'v1', slug: 'secrecao_blueta', quantidade: 1 },
      { instanceId: 'a1', slug: 'arco', quantidade: 1 },
    ];
    expect(window.envenenarNoInventario(itens, 'v1', 'a1', 1, CAT, novoId).ok).toBe(false);
  });

  it('cada ação gasta 1; na última o veneno sai da arma', () => {
    let itens = [{ instanceId: 'e1', slug: 'espada_longa', veneno: { slug: 'secrecao_blueta', nome: 'Blueta', ef: 5, acoes: 2 } }];
    itens = window.gastarAcaoDoVeneno(itens, 'e1');
    expect(itens[0].veneno.acoes).toBe(1);
    itens = window.gastarAcaoDoVeneno(itens, 'e1');
    expect(itens[0].veneno).toBeUndefined();
  });
});

describe('flechas do arco', () => {
  it('agrupa por tipo, a comum primeiro, com o veneno de cada uma', () => {
    const itens = [
      { instanceId: 'x', slug: 'flecha_envenenada_blueta', quantidade: 2 },
      { instanceId: 'f1', slug: 'flecha', quantidade: 4, containerId: 'aljava' },
      { instanceId: 'f2', slug: 'flecha', quantidade: 1 },
    ];
    expect(window.flechasNoInventario(itens, CAT)).toEqual([
      { slug: 'flecha', nome: 'Flecha', quantidade: 5, venenoEf: 0, venenoNome: null },
      { slug: 'flecha_envenenada_blueta', nome: 'Flecha Envenenada (Blueta)', quantidade: 2, venenoEf: 5, venenoNome: 'Blueta' },
    ]);
  });

  it('gerarAtaques marca o arco e leva o veneno da arma', () => {
    const pj = { inventario: { itens: [
      { instanceId: 'a1', slug: 'arco', equipado: true, slot: 'mao_d' },
      { instanceId: 'e1', slug: 'espada_longa', equipado: true, slot: 'mao_e',
        veneno: { slug: 'secrecao_theonia', nome: 'Theonia', ef: 15, acoes: 4 } },
    ] } };
    const ataques = window.gerarAtaques(pj, CAT, {}, {});
    const arco = ataques.find((a) => a.slug === 'arco');
    const espada = ataques.find((a) => a.slug === 'espada_longa');
    expect(arco.arco).toBe(true);
    expect(espada.arco).toBe(false);
    expect(espada.nome).toBe('Espada Longa envenenada');
    expect(espada.veneno.ef).toBe(15);
    expect(espada.instanceId).toBe('e1');
  });
});

describe('veneno no golpe', () => {
  const alvo = { inst_id: 'a', nome: 'Lobo', ef: 30, eh: 0, ar: 0, status: 'ativo' };

  it('de onde vem: flecha antes da arma; magia não tem', () => {
    expect(M().venenoDoGolpe('arma', { flecha: { venenoEf: 10 }, veneno: { ef: 5 } })).toBe(10);
    expect(M().venenoDoGolpe('arma', { veneno: { ef: 5, acoes: 3 } })).toBe(5);
    expect(M().venenoDoGolpe('magia', { veneno: { ef: 5 } })).toBe(0);
  });

  it('golpe que chegou à EF: o veneno tira mais EF', () => {
    const antes = alvo;
    const next = [{ ...alvo, ef: 20 }];               // o golpe tirou 10 de EF
    const r = M().aplicarVenenoSeChegouEf(next, 0, antes, 5);
    expect(r.aplicado).toBe(5);
    expect(r.next[0].ef).toBe(15);
  });

  it('golpe segurado pela EH ou pela armadura: o veneno não age', () => {
    const antes = { ...alvo, eh: 10 };
    const next = [{ ...alvo, eh: 2 }];                // só a EH perdeu
    const r = M().aplicarVenenoSeChegouEf(next, 0, antes, 15);
    expect(r.aplicado).toBe(0);
    expect(r.next[0].ef).toBe(30);
  });

  it('o arco gasta a flecha disparada no inventário do PJ', async () => {
    const pj = { id: 7, inventario: { itens: [{ instanceId: 'f1', slug: 'flecha_envenenada_blueta', quantidade: 2 }] } };
    const fake = fakeSupabase({ personagens: [pj] });
    globalThis.supabaseClient = fake;
    const catalogos = { pjById: { 7: pj } };
    await M().gastarMunicaoEVeneno({ tipo: 'pj', ref_id: 7 }, { arco: true, flecha: { slug: 'flecha_envenenada_blueta' } }, catalogos);
    expect(catalogos.pjById[7].inventario.itens[0].quantidade).toBe(1);
  });

  it('a arma untada gasta uma ação do veneno', async () => {
    const pj = { id: 7, inventario: { itens: [{ instanceId: 'e1', slug: 'espada_longa',
      veneno: { slug: 'secrecao_blueta', nome: 'Blueta', ef: 5, acoes: 15 } }] } };
    globalThis.supabaseClient = fakeSupabase({ personagens: [pj] });
    const catalogos = { pjById: { 7: pj } };
    await M().gastarMunicaoEVeneno({ tipo: 'pj', ref_id: 7 }, { instanceId: 'e1', veneno: { ef: 5, acoes: 15 } }, catalogos);
    expect(catalogos.pjById[7].inventario.itens[0].veneno.acoes).toBe(14);
  });

  it('a frase da mesa diz o veneno e o dano', () => {
    expect(M().textoVenenoDoGolpe({ flecha: { venenoNome: 'Blueta' } }, 5, false))
      .toBe(' O veneno (Blueta) causou 5 de dano na energia física.');
    expect(M().textoVenenoDoGolpe({ veneno: { nome: 'Leopis' } }, 0, false)).toBe('');
  });
});
