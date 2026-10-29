/* ============================================================
   carga-do-animal.test.js — o peso que o bicho carrega
   ============================================================
   Pedido do usuário (27/10/2026): "adicione também uma barra para mostrar o
   peso que o animal está carregando", com duas decisões dele sobre a regra:

     • a capacidade é "peso do corpo, no máximo 20%";
     • conta "tudo, inclusive o cavaleiro montado nele".

   O espelho desta conta é `calcCarga`, a do personagem: lá o item com
   `animal_id` é PULADO, porque quem carrega é o bicho. Aqui só ele entra. As
   duas não podem divergir sem alguém carregar a sela duas vezes — ou nenhuma.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

let cargaDoAnimal, calcCarga;
beforeAll(() => {
  ({ cargaDoAnimal, calcCarga } = window);
  expect(cargaDoAnimal).toBeTypeOf('function');
});

const CAVALO = { id: 157, nome: 'Cavalo Andaluz', peso: 400, montaria: true };
const AGUIA = { id: 9, nome: 'Águia Real', peso: 6, montaria: true };
const CAT = {
  sela_de_guerra: { slug: 'sela_de_guerra', nome: 'Sela de Guerra', ocupa: 6.5, slot_arreio: 'sela' },
  barda:          { slug: 'barda', nome: 'Barda', ocupa: 12, slot_arreio: 'barda' },
  corda:          { slug: 'corda', nome: 'Corda', ocupa: 2 },
};
const inst = (extra = {}) => ({ instanceId: 'c1', slug: 'cavalo', ...extra });
const noBicho = (slug, extra = {}) => ({ instanceId: slug + '1', slug, quantidade: 1, animal_id: 'c1', ...extra });

describe('a capacidade é 20% do peso do corpo', () => {
  it('um cavalo de 400 leva 80', () => {
    expect(cargaDoAnimal(inst(), CAVALO, [], CAT, 0).capacidade).toBe(80);
  });

  it('e a águia de 6 leva 1,2 — ou seja, não leva nada', () => {
    expect(cargaDoAnimal(inst(), AGUIA, [], CAT, 0).capacidade).toBeCloseTo(1.2);
  });

  /* Sem peso no catálogo não há teto — e sem teto a ficha não desenha barra:
     inventar um máximo seria inventar quanto o bicho aguenta. */
  it('criatura sem peso gravado não tem capacidade', () => {
    expect(cargaDoAnimal(inst(), { nome: 'Bicho' }, [], CAT, 0).capacidade).toBe(0);
    expect(cargaDoAnimal(inst(), null, [], CAT, 0).capacidade).toBe(0);
  });
});

describe('o que pesa é o que está NO bicho', () => {
  it('soma o arreamento e a carga solta do lombo', () => {
    const itens = [noBicho('sela_de_guerra'), noBicho('barda'), noBicho('corda')];
    expect(cargaDoAnimal(inst(), CAVALO, itens, CAT, 0).peso).toBeCloseTo(20.5);
  });

  it('a pilha conta pela quantidade', () => {
    expect(cargaDoAnimal(inst(), CAVALO, [noBicho('corda', { quantidade: 4 })], CAT, 0).peso).toBe(8);
  });

  it('o que NÃO está no bicho não entra', () => {
    const naMochilaDoDono = [{ instanceId: 'x', slug: 'barda', quantidade: 1 }];
    expect(cargaDoAnimal(inst(), CAVALO, naMochilaDoDono, CAT, 0).peso).toBe(0);
    // E o que está em OUTRO bicho também não.
    const noOutro = [{ instanceId: 'y', slug: 'barda', quantidade: 1, animal_id: 'c2' }];
    expect(cargaDoAnimal(inst(), CAVALO, noOutro, CAT, 0).peso).toBe(0);
  });

  /* O ESPELHO: a mesma sela não pode pesar nos dois. */
  it('o que pesa no bicho não pesa no dono', () => {
    const itens = [noBicho('sela_de_guerra'), noBicho('barda')];
    expect(cargaDoAnimal(inst(), CAVALO, itens, CAT, 0).peso).toBeCloseTo(18.5);
    expect(calcCarga(itens, CAT, 3, 3).peso).toBe(0);
  });
});

describe('o cavaleiro montado conta', () => {
  it('soma o peso dele quando está em cima', () => {
    const c = cargaDoAnimal(inst({ montado: true }), CAVALO, [noBicho('sela_de_guerra')], CAT, 72);
    expect(c.cavaleiro).toBe(72);
    expect(c.peso).toBeCloseTo(78.5);
  });

  it('e não soma quando ele desceu', () => {
    const c = cargaDoAnimal(inst({ montado: false }), CAVALO, [noBicho('sela_de_guerra')], CAT, 72);
    expect(c.cavaleiro).toBe(0);
    expect(c.peso).toBeCloseTo(6.5);
  });

  /* O aperto que o Mestre precisa ver: arreado e montado, o cavalo de guerra
     passa do teto. É esse o caso que motivou a barra. */
  it('arreado e montado, o cavalo de 400 passa dos 80', () => {
    const itens = [noBicho('sela_de_guerra'), noBicho('barda')];
    const c = cargaDoAnimal(inst({ montado: true }), CAVALO, itens, CAT, 72);
    expect(c.peso).toBeCloseTo(90.5);
    expect(c.over).toBe(true);
    expect(c.pct).toBe(1);        // a barra enche e para — não vaza do trilho
  });

  it('sem teto não há sobrecarga a declarar', () => {
    expect(cargaDoAnimal(inst({ montado: true }), { nome: 'Bicho' }, [], CAT, 72).over).toBe(false);
  });
});
