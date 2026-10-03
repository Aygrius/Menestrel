/* ============================================================
   inventario-casas.test.js — itens soltos em qualquer casa
   ============================================================
   "Tanto no inventário, como nos itens que armazenam outros itens, eu quero
    que o usuário possa mover os objetos livremente, podendo deixá-los
    espalhados em qualquer slot." (usuário, 02/10/2026)

   Cada item guarda `casa`: a posição na grade do LUGAR onde está — o
   inventário solto (containerId null) ou o interior de um recipiente.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './inventario-casas.jsx';

const P = (...a) => window.posicionarCasas(...a);
const MOV = (...a) => window.moverParaCasa(...a);
const it_ = (instanceId, extra) => ({ instanceId, slug: instanceId, quantidade: 1, containerId: null, ...extra });
const casas = (itens) => Object.fromEntries(itens.map((x) => [x.instanceId, x.casa]));

describe('posicionarCasas', () => {
  it('item sem casa vai para a primeira casa livre do seu lugar', () => {
    const out = P([it_('a', { casa: 0 }), it_('b', { casa: 2 }), it_('c')]);
    expect(casas(out)).toEqual({ a: 0, b: 2, c: 1 });
  });

  it('cada recipiente tem a sua própria grade', () => {
    const out = P([
      it_('mochila', { casa: 0 }),
      it_('x', { containerId: 'mochila' }),
      it_('y', { containerId: 'mochila' }),
      it_('solto'),
    ]);
    expect(casas(out)).toEqual({ mochila: 0, x: 0, y: 1, solto: 1 });
  });

  it('duas na mesma casa: a segunda vai para a próxima livre', () => {
    const out = P([it_('a', { casa: 3 }), it_('b', { casa: 3 })]);
    expect(casas(out)).toEqual({ a: 3, b: 0 });
  });

  it('casa inválida (negativa, fracionada, texto) é tratada como sem casa', () => {
    const out = P([it_('a', { casa: -1 }), it_('b', { casa: 1.5 }), it_('c', { casa: '2' })]);
    expect(casas(out)).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('nada a mudar devolve o MESMO array (o autosave não entra em laço)', () => {
    const itens = [it_('a', { casa: 0 }), it_('b', { casa: 5 })];
    expect(P(itens)).toBe(itens);
  });

  it('não mexe em quem já tem casa válida', () => {
    const a = it_('a', { casa: 4 });
    const out = P([a, it_('b')]);
    expect(out[0]).toBe(a);
  });
});

describe('moverParaCasa', () => {
  it('casa vazia: o item vai para lá', () => {
    const out = MOV([it_('a', { casa: 0 }), it_('b', { casa: 1 })], 'a', 7);
    expect(casas(out)).toEqual({ a: 7, b: 1 });
  });

  it('casa ocupada no mesmo lugar: os dois trocam', () => {
    const out = MOV([it_('a', { casa: 0 }), it_('b', { casa: 4 })], 'a', 4);
    expect(casas(out)).toEqual({ a: 4, b: 0 });
  });

  it('a casa ocupada em OUTRO lugar não conta', () => {
    const out = MOV([it_('a', { casa: 0 }), it_('x', { casa: 3, containerId: 'm' })], 'a', 3);
    expect(casas(out)).toEqual({ a: 3, x: 3 });
  });

  it('mesma casa ou item inexistente: devolve o mesmo array', () => {
    const itens = [it_('a', { casa: 2 })];
    expect(MOV(itens, 'a', 2)).toBe(itens);
    expect(MOV(itens, 'zzz', 1)).toBe(itens);
  });

  it('casa inválida é recusada', () => {
    const itens = [it_('a', { casa: 2 })];
    expect(MOV(itens, 'a', -1)).toBe(itens);
    expect(MOV(itens, 'a', 1.5)).toBe(itens);
  });
});
