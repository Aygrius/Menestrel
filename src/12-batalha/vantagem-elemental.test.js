/* ============================================================
   vantagem-elemental.test.js — elementos no dano (26/09/2026)
   ============================================================
   "O elemento fogo causa 10% mais dano no elemento ar. O ar causa 10% mais
    dano na terra. A água causa 10% mais dano no fogo. A terra causa 10% mais
    dano na água. A luz causa 15% mais dano na escuridão. A escuridão causa 5%
    mais dano no fogo, ar, água e terra."
   "Sacerdotes são do elemento luz. Rastreadores, terra. Guerreiros, fogo.
    Magos, escuridão. Bardos, água. Ladinos, ar." (usuário)
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

describe('bonusElemental — a tabela', () => {
  const b = (g, a) => window.bonusElemental(g, a);
  it.each([
    ['Fogo', 'Ar', 10], ['Ar', 'Terra', 10], ['Água', 'Fogo', 10], ['Terra', 'Água', 10],
    ['Luz', 'Escuridão', 15],
    ['Escuridão', 'Fogo', 5], ['Escuridão', 'Ar', 5], ['Escuridão', 'Água', 5], ['Escuridão', 'Terra', 5],
  ])('%s contra %s: +%i%%', (g, a, pct) => { expect(b(g, a)).toBe(pct); });

  it('não é recíproca e não existe entre os demais pares', () => {
    expect(b('Ar', 'Fogo')).toBe(0);
    expect(b('Escuridão', 'Luz')).toBe(0);
    expect(b('Fogo', 'Fogo')).toBe(0);
    expect(b(null, 'Ar')).toBe(0);
  });

  it('com vários elementos, vale a MELHOR vantagem — não soma', () => {
    expect(b('Fogo, Luz', 'Ar, Escuridão')).toBe(15);
  });

  it('aceita a grafia da magia (minúscula, sem acento)', () => {
    expect(b('agua', 'Fogo')).toBe(10);
  });
});

describe('o elemento de cada profissão', () => {
  it.each([
    ['Sacerdote', 'Luz'], ['Rastreador', 'Terra'], ['Guerreiro', 'Fogo'],
    ['Mago', 'Escuridão'], ['Bardo', 'Água'], ['Ladino', 'Ar'],
  ])('%s é %s', (prof, el) => { expect(window.elementoDaProfissao(prof)).toBe(el); });
});

describe('danoFinal aplica a vantagem', () => {
  const lutador = (elemento) => ({ status_temp: [], elemento });

  it('Guerreiro (fogo) em criatura de ar: 20 vira 22', () => {
    expect(M.danoFinal(20, lutador('Fogo'), lutador('Ar'), null)).toBe(22);
  });

  it('sem vantagem, o número não muda', () => {
    expect(M.danoFinal(20, lutador('Ar'), lutador('Fogo'), null)).toBe(20);
  });

  it('a magia leva o PRÓPRIO elemento, não o de quem conjura', () => {
    // Mago (escuridão) lança magia de fogo num alvo de ar: vale fogo > ar, 10%.
    expect(M.danoFinal(20, lutador('Escuridão'), lutador('Ar'), 'fogo')).toBe(22);
  });

  it('luz em escuridão: +15%, arredondado para cima', () => {
    expect(M.danoFinal(10, lutador('Luz'), lutador('Escuridão'), null)).toBe(12);
  });
});
