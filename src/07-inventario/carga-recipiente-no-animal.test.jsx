/* ============================================================
   carga-recipiente-no-animal.test.jsx — auditoria 13/11/2026, item 31
   ============================================================
   Só a peça no lombo leva `animal_id`; o que vai dentro de um recipiente no
   animal só tem `containerId` — e pesava nas costas do dono. Agora o conteúdo
   (e o conteúdo do conteúdo) pesa no animal, e as duas contas seguem espelho.
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

const CAT = {
  cavalo:  { slug: 'cavalo', nome: 'Cavalo', grupo: 'Transportes', criatura_id: 9, ocupa: 0 },
  alforje: { slug: 'alforje', nome: 'Alforje', grupo: 'Recipientes', tipo: 'S', armazena: 20, ocupa: 2 },
  bolsa:   { slug: 'bolsa', nome: 'Bolsa', grupo: 'Recipientes', tipo: 'S', armazena: 5, ocupa: 1 },
  racao:   { slug: 'racao', nome: 'Ração', grupo: 'Consumíveis', tipo: 'S', ocupa: 1 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const itens = [
  it_('cav', 'cavalo'),
  it_('alf', 'alforje', { animal_id: 'cav', slot_animal: 'mochila' }),
  it_('r1', 'racao', { containerId: 'alf', quantidade: 6 }),
  it_('bol', 'bolsa', { containerId: 'alf' }),
  it_('r2', 'racao', { containerId: 'bol', quantidade: 2 }),
];

describe('animalDeCadaItem', () => {
  it('segue a cadeia: o alforje, o conteúdo e o conteúdo do conteúdo são do cavalo', () => {
    const m = window.animalDeCadaItem(itens);
    expect(['alf', 'r1', 'bol', 'r2'].map((id) => m.get(id))).toEqual(['cav', 'cav', 'cav', 'cav']);
    expect(m.has('cav')).toBe(false);
  });
});

describe('o peso vai para quem carrega', () => {
  it('o dono não sente nada do alforje no cavalo', () => {
    expect(window.calcCarga(itens, CAT, 0, 0).peso).toBe(0);
  });
  it('o cavalo pesa o alforje, a bolsa e as rações', () => {
    const c = window.cargaDoAnimal(itens[0], { peso: 500 }, itens, CAT, 0);
    expect(c.peso).toBe(2 + 6 + 1 + 2);
  });
});
