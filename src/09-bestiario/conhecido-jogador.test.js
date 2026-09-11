/* ============================================================
   conhecido-jogador.test.js — o que o jogador conhece, derivado dos PJs dele
   ============================================================
   Spec: docs/superpowers/specs/2026-09-11-catalogos-visao-jogador-design.md §2
   Cobre só a função pura `conhecidoDoJogador`. O hook (useConhecidoDoJogador)
   é testado indiretamente pelas listas (bestiario.jsx) — ver
   .superpowers/sdd/2026-09-11-catalogos-jogador/fase-a-report.md.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let conhecidoDoJogador;
beforeAll(async () => {
  await import('./conhecido-jogador.jsx');
  conhecidoDoJogador = window.conhecidoDoJogador;
});

describe('conhecidoDoJogador', () => {
  it('lista vazia devolve conjuntos vazios', () => {
    const r = conhecidoDoJogador([]);
    expect(r.magias.size).toBe(0);
    expect(r.tecnicas.size).toBe(0);
    expect(r.habilidades.size).toBe(0);
    expect(r.itens.size).toBe(0);
  });

  it('null/undefined não quebram — tratados como lista vazia', () => {
    expect(conhecidoDoJogador(null).magias.size).toBe(0);
    expect(conhecidoDoJogador(undefined).itens.size).toBe(0);
  });

  it('PJ com colunas jsonb nulas/ausentes não quebra', () => {
    const r = conhecidoDoJogador([{ id: 1, magias: null, tecnicas: undefined, habilidades: null, inventario: null }, null]);
    expect(r.magias.size).toBe(0);
    expect(r.tecnicas.size).toBe(0);
    expect(r.habilidades.size).toBe(0);
    expect(r.itens.size).toBe(0);
  });

  it('une magias, técnicas, habilidades e itens de 2 PJs', () => {
    const pjs = [
      {
        id: 1,
        magias: { 'bola-de-fogo': 2 },
        tecnicas: { 'golpe-duplo': 1 },
        habilidades: { 'faro-apurado': 1 },
        inventario: { moedas: { ouro: 10 }, itens: [{ instanceId: 'a', slug: 'espada-curta', quantidade: 1 }] },
      },
      {
        id: 2,
        magias: { 'cura-leve': 1 },
        tecnicas: { 'aparar': 1 },
        habilidades: { 'coragem': 1 },
        inventario: { moedas: { ouro: 0 }, itens: [{ instanceId: 'b', slug: 'pocao-cura', quantidade: 3 }] },
      },
    ];
    const r = conhecidoDoJogador(pjs);
    expect([...r.magias.keys()].sort()).toEqual(['bola-de-fogo', 'cura-leve']);
    expect(r.tecnicas.has('golpe-duplo')).toBe(true);
    expect(r.tecnicas.has('aparar')).toBe(true);
    expect(r.habilidades.has('faro-apurado')).toBe(true);
    expect(r.habilidades.has('coragem')).toBe(true);
    expect(r.itens.has('espada-curta')).toBe(true);
    expect(r.itens.has('pocao-cura')).toBe(true);
  });

  it('magia repetida entre PJs: vence o MAIOR número de passos', () => {
    const pjs = [
      { id: 1, magias: { 'bola-de-fogo': 2 } },
      { id: 2, magias: { 'bola-de-fogo': 4 } },
    ];
    const r = conhecidoDoJogador(pjs);
    expect(r.magias.get('bola-de-fogo')).toBe(4);
  });

  it('magia repetida — ordem inversa também vence o maior', () => {
    const pjs = [
      { id: 1, magias: { 'bola-de-fogo': 4 } },
      { id: 2, magias: { 'bola-de-fogo': 2 } },
    ];
    const r = conhecidoDoJogador(pjs);
    expect(r.magias.get('bola-de-fogo')).toBe(4);
  });

  it('passos: 0 não conta como conhecida', () => {
    const r = conhecidoDoJogador([{ id: 1, magias: { 'bola-de-fogo': 0 } }]);
    expect(r.magias.has('bola-de-fogo')).toBe(false);
  });

  it('itens sem slug são ignorados, sem quebrar', () => {
    const r = conhecidoDoJogador([
      { id: 1, inventario: { itens: [{ instanceId: 'x' }, { instanceId: 'y', slug: 'tocha' }] } },
    ]);
    expect(r.itens.has('tocha')).toBe(true);
    expect(r.itens.size).toBe(1);
  });

  it('inventário como array puro (formato errado) é tratado como vazio, não lançado erro', () => {
    // personagens.inventario é sempre { moedas, itens }; nunca um array cru.
    const r = conhecidoDoJogador([{ id: 1, inventario: [{ slug: 'nao-deveria-contar' }] }]);
    expect(r.itens.size).toBe(0);
  });
});
