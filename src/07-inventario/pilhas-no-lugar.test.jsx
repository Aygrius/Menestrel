/* ============================================================
   pilhas-no-lugar.test.jsx — auditoria 13/11/2026, item 12
   ============================================================
   normalizarPilhas fundia a pilha solta acumulável só pelo slug. A carga do
   animal (animal_id/slot_animal) se juntava com a mochila do dono — e quem
   ficava com as marcas era a pilha que viesse primeiro: ou a carga do bicho
   voltava para o dono, ou a do dono subia no bicho. A poção no saque rápido
   sumia do saque do mesmo jeito. E uma pilha não acumulável no saque explodia
   em várias unidades, todas na mesma casa.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';

const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const CAT = {
  racao:  { slug: 'racao', nome: 'Ração', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
  pocao:  { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
  espada: { slug: 'espada', nome: 'Espada', grupo: 'Armas', tipo: 'S', ocupa: 1 },
  cavalo: { slug: 'cavalo', nome: 'Cavalo', grupo: 'Transportes', tipo: 'S', criatura_id: 9 },
};
const NO_CAVALO = { animal_id: 'cav1', slot_animal: 'mochila' };
const norm = (itens) => window.normalizarPilhas(itens, CAT);

describe('a carga do animal não se mistura com a do dono', () => {
  it('a do dono vindo primeiro: a do cavalo continua no cavalo', () => {
    const out = norm([it_('cav1', 'cavalo'), it_('a', 'racao', { quantidade: 3 }), it_('b', 'racao', { quantidade: 5, ...NO_CAVALO })]);
    expect(out.find((x) => x.instanceId === 'a').quantidade).toBe(3);
    expect(out.find((x) => x.instanceId === 'b')).toMatchObject({ quantidade: 5, animal_id: 'cav1' });
  });
  it('a do cavalo vindo primeiro: a do dono não sobe no cavalo', () => {
    const out = norm([it_('cav1', 'cavalo'), it_('b', 'racao', { quantidade: 5, ...NO_CAVALO }), it_('a', 'racao', { quantidade: 3 })]);
    expect(out.find((x) => x.instanceId === 'a').animal_id).toBeUndefined();
    expect(out.find((x) => x.instanceId === 'b').quantidade).toBe(5);
  });
  it('duas pilhas no MESMO cavalo continuam fundindo', () => {
    const out = norm([it_('b', 'racao', { quantidade: 5, ...NO_CAVALO }), it_('c', 'racao', { quantidade: 2, ...NO_CAVALO })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ quantidade: 7, animal_id: 'cav1' });
  });
  it('cavalos diferentes não fundem', () => {
    const out = norm([it_('b', 'racao', { ...NO_CAVALO }), it_('c', 'racao', { animal_id: 'cav2', slot_animal: 'mochila' })]);
    expect(out).toHaveLength(2);
  });
});

describe('o saque rápido guarda a sua pilha', () => {
  it('a poção no saque não se funde com as soltas', () => {
    const out = norm([it_('a', 'pocao', { quantidade: 4 }), it_('s', 'pocao', { quantidade: 2, slot: 'saque_d' })]);
    expect(out).toHaveLength(2);
    expect(out.find((x) => x.slot === 'saque_d').quantidade).toBe(2);
    expect(out.find((x) => x.instanceId === 'a').quantidade).toBe(4);
  });
  it('soltas no mesmo lugar seguem fundindo, como antes', () => {
    const out = norm([it_('a', 'pocao', { quantidade: 4 }), it_('b', 'pocao', { quantidade: 1 })]);
    expect(out).toHaveLength(1);
    expect(out[0].quantidade).toBe(5);
  });
  it('a espada ×2 no saque: uma fica na casa, a outra volta para a mochila', () => {
    const out = norm([it_('e', 'espada', { quantidade: 2, slot: 'saque_e' })]);
    expect(out).toHaveLength(2);
    expect(out.filter((x) => x.slot === 'saque_e')).toHaveLength(1);
    expect(out.find((x) => x.slot === 'saque_e').instanceId).toBe('e');
    expect(out.find((x) => x.slot !== 'saque_e').slot).toBeNull();
  });
  it('nada mudou: devolve o MESMO array (o autosave depende disso)', () => {
    const itens = [it_('a', 'pocao', { quantidade: 4 }), it_('s', 'pocao', { quantidade: 2, slot: 'saque_d' })];
    expect(norm(itens)).toBe(itens);
  });
});

/* Auditoria item 13 (14/11/2026): dentro do recipiente, a fusão olhava só
   slug, recipiente e bônus — o estado da primeira instância passava para a
   pilha inteira. */
describe('o estado de uma instância não contamina a pilha', () => {
  const CAT2 = { ...CAT, bau: { slug: 'bau', nome: 'Baú', grupo: 'Recipientes', tipo: 'S', armazena: 100, casas: 20 } };
  const normB = (itens) => window.normalizarPilhas(itens, CAT2);
  const noBau = (id, slug, extra) => it_(id, slug, { containerId: 'b1', ...extra });
  const bau = it_('b1', 'bau');

  it('a espada quebrada não se funde com as inteiras (nem quebra as outras)', () => {
    const out = normB([bau, noBau('a', 'espada', { quantidade: 4 }), noBau('q', 'espada', { quebrada: true, res: 0 })]);
    const espadas = out.filter((x) => x.slug === 'espada');
    expect(espadas).toHaveLength(2);
    expect(espadas.find((x) => x.quebrada).quantidade).toBe(1);
    expect(espadas.find((x) => !x.quebrada).quantidade).toBe(4);
  });
  it('a gasta (res) e a untada (veneno) ficam cada uma na sua', () => {
    const out = normB([bau, noBau('a', 'espada', { quantidade: 2 }), noBau('g', 'espada', { res: 3 }),
      noBau('v', 'espada', { veneno: { slug: 'secrecao_blueta', ef: 5, acoes: 15 } })]);
    expect(out.filter((x) => x.slug === 'espada')).toHaveLength(3);
  });
  it('o mesmo estado, em qualquer ordem de chaves, funde', () => {
    const out = normB([bau,
      noBau('v1', 'espada', { veneno: { slug: 's', ef: 5, acoes: 15 } }),
      noBau('v2', 'espada', { veneno: { acoes: 15, ef: 5, slug: 's' } })]);
    const espadas = out.filter((x) => x.slug === 'espada');
    expect(espadas).toHaveLength(1);
    expect(espadas[0].quantidade).toBe(2);
  });
  it('anotação e lugar não contam: observação diferente, casa e origem da loja seguem fundindo', () => {
    const out = normB([bau, noBau('a', 'pocao', { quantidade: 2, casa: 0, origem_loja: 3 }),
      noBau('b', 'pocao', { quantidade: 5, casa: 4, observacao: 'do mercado' })]);
    const pocoes = out.filter((x) => x.slug === 'pocao');
    expect(pocoes).toHaveLength(1);
    expect(pocoes[0].quantidade).toBe(7);
  });
  it('vazio é igual a ausente: quebrada false funde com a sem a marca', () => {
    const out = normB([bau, noBau('a', 'espada', { quebrada: false }), noBau('b', 'espada')]);
    expect(out.filter((x) => x.slug === 'espada')).toHaveLength(1);
  });
  it('vale também para a pilha solta acumulável', () => {
    const out = norm([it_('a', 'pocao', { quantidade: 2 }), it_('b', 'pocao', { vitalidade: { ef: 3 } })]);
    expect(out).toHaveLength(2);
  });
  it('guardar no baú cheio: a peça de outro estado não "se soma" sem casa livre', () => {
    // Porte pequeno = 3 casas, as três ocupadas por pilhas diferentes.
    const cheio = { ...CAT2, bau: { ...CAT2.bau, porte: 'pequeno' } };
    const lotado = [bau, noBau('a', 'espada', { casa: 0 }), noBau('p', 'pocao', { casa: 1 }), noBau('r', 'racao', { casa: 2 })];
    expect(window.guardarNoRecipiente([...lotado, it_('q', 'espada', { quebrada: true })], 'q', 'b1', cheio))
      .toMatchObject({ ok: false, motivo: 'sem_casa' });
    // A inteira, sim, soma na pilha que já está lá.
    expect(window.guardarNoRecipiente([...lotado, it_('n', 'espada')], 'n', 'b1', cheio).ok).toBe(true);
  });
});
