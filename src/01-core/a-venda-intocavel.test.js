/* ============================================================
   a-venda-intocavel.test.js — auditoria 13/11/2026, item 35
   ============================================================
   Preparar carne e envenenar flechas mexiam em pilha à venda: gastavam a
   carne ou o veneno anunciado, e somavam o prato ou as flechas envenenadas
   numa pilha anunciada (ou do lombo do animal).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const id = () => 'novo';

describe('preparar carne', () => {
  it('a carne anunciada não se prepara', () => {
    expect(window.prepararCarne([it_('c', 'carne', { quantidade: 3, anuncio_id: 7 })], 'c', 'racao', id)).toBeNull();
  });
  it('nem completa o custo de outra pilha', () => {
    const itens = [it_('c', 'carne', { quantidade: 1 }), it_('v', 'carne', { quantidade: 5, anuncio_id: 7 })];
    // Refeição custa 2: só há 1 livre.
    expect(window.prepararCarne(itens, 'c', 'refeicao', id)).toBeNull();
  });
  it('o prato não vai para a pilha anunciada nem para a do animal', () => {
    const itens = [it_('c', 'carne', { quantidade: 1 }), it_('r1', 'racao', { anuncio_id: 7 }), it_('r2', 'racao', { animal_id: 'cav' })];
    const out = window.prepararCarne(itens, 'c', 'racao', id);
    expect(out.find((x) => x.instanceId === 'r1').quantidade).toBe(1);
    expect(out.find((x) => x.instanceId === 'r2').quantidade).toBe(1);
    expect(out.find((x) => x.instanceId === 'novo')).toMatchObject({ slug: 'racao', quantidade: 1 });
  });
});

describe('envenenar flechas', () => {
  const CAT = {
    secrecao_blueta: { slug: 'secrecao_blueta', nome: 'Secreção de Blueta', grupo: 'Consumíveis', efeito_positivo: null,
      efeito_negativo: 'Reduz 5 de energia física.' },
    flecha: { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis' },
    flecha_envenenada_blueta: { slug: 'flecha_envenenada_blueta', nome: 'Flecha Envenenada (Blueta)', grupo: 'Consumíveis' },
  };
  it('o veneno ou a flecha anunciada é recusada', () => {
    const r1 = window.envenenarNoInventario([it_('v', 'secrecao_blueta', { anuncio_id: 7 }), it_('f', 'flecha', { quantidade: 5 })], 'v', 'f', 1, CAT, id);
    const r2 = window.envenenarNoInventario([it_('v', 'secrecao_blueta'), it_('f', 'flecha', { quantidade: 5, anuncio_id: 7 })], 'v', 'f', 1, CAT, id);
    expect(r1).toMatchObject({ ok: false, motivo: 'a_venda' });
    expect(r2).toMatchObject({ ok: false, motivo: 'a_venda' });
  });
  it('as flechas envenenadas não somam na pilha anunciada', () => {
    const itens = [it_('v', 'secrecao_blueta'), it_('f', 'flecha', { quantidade: 5 }),
      it_('fe', 'flecha_envenenada_blueta', { quantidade: 2, anuncio_id: 7 })];
    const r = window.envenenarNoInventario(itens, 'v', 'f', 1, CAT, id);
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 'fe').quantidade).toBe(2);
    expect(r.itens.find((x) => x.instanceId === 'novo')).toMatchObject({ slug: 'flecha_envenenada_blueta', quantidade: 1 });
  });
});
