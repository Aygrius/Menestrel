/* ============================================================
   tiers-criatura.test.js — tiers 25/50/75% da criatura
   ============================================================
   danoNoTier lia as colunas dano_25/dano_50/dano_75 da linha da
   criatura. Mas o formulário de criatura (13-diario, NovaCriatura)
   grava só `dano_100` — nunca os três tiers. Toda criatura criada
   pelo app entra com esses campos NULL e causa 0 de dano nos
   resultados Fraco/Médio/Difícil, mesmo com dano_100 > 0.

   Evidência que autoriza derivar em vez de ler a coluna: nas 185
   criaturas do banco com dano_100 > 0, os três tiers batem com
   ceil(dano_100 × n/4) em 185 — ZERO divergências. As colunas não
   carregam informação própria, são cópia da mesma regra que
   danoNoTier já aplica pras ARMAS.

   NÃO mexido de propósito: E (125%) e A (150%) da criatura seguem
   com floor, diferente do ceil das armas. É divergência de regra
   pré-existente, congelada por teste em motor-batalha.test.js —
   mudar isso é decisão de jogo, não conserto de bug.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Valores REAIS do banco: as linhas com dano_100 > 0 têm exatamente estes tiers.
const REAIS = [
  { nome: 'Lobo Adulto',  dano_100: 11, F: 3,  M: 6,  D: 9  },
  { nome: 'Lobo Alfa',    dano_100: 13, F: 4,  M: 7,  D: 10 },
  { nome: 'Águia',        dano_100: 6,  F: 2,  M: 3,  D: 5  },
  { nome: 'Abominação',   dano_100: 37, F: 10, M: 19, D: 28 },
  { nome: 'Águia Real',   dano_100: 53, F: 14, M: 27, D: 40 },
];

describe('danoNoTier — criatura, tiers 25/50/75%', () => {
  it('deriva do dano_100 quando as colunas não vêm (criatura criada pelo app)', () => {
    const semTiers = { fonte: 'criatura', dano_100: 11 };   // sem dano_25/50/75
    expect(M.danoNoTier(semTiers, 'F')).toBe(3);
    expect(M.danoNoTier(semTiers, 'M')).toBe(6);
    expect(M.danoNoTier(semTiers, 'D')).toBe(9);
    expect(M.danoNoTier(semTiers, 'MD')).toBe(11);
  });

  it('reproduz os valores REAIS do bestiário a partir só do dano_100', () => {
    for (const c of REAIS) {
      const arma = { fonte: 'criatura', dano_100: c.dano_100 };
      expect([c.nome, M.danoNoTier(arma, 'F')]).toEqual([c.nome, c.F]);
      expect([c.nome, M.danoNoTier(arma, 'M')]).toEqual([c.nome, c.M]);
      expect([c.nome, M.danoNoTier(arma, 'D')]).toEqual([c.nome, c.D]);
    }
  });

  it('mesma regra de arredondamento das ARMAS (ceil) nos tiers 25/50/75', () => {
    const criatura = { fonte: 'criatura', dano_100: 11 };
    const arma     = { fonte: 'arma',     dano: 11 };
    for (const cod of ['F', 'M', 'D', 'MD']) {
      expect(M.danoNoTier(criatura, cod)).toBe(M.danoNoTier(arma, cod));
    }
  });

  it('dano_100 zerado continua 0 — sem dado de origem não há o que derivar', () => {
    const semDano = { fonte: 'criatura', dano_100: 0 };
    for (const cod of ['F', 'M', 'D', 'MD', 'E', 'A']) {
      expect(M.danoNoTier(semDano, cod)).toBe(0);
    }
  });

  it('E/A da criatura seguem com floor (regra pré-existente, não tocada)', () => {
    const c = { fonte: 'criatura', dano_100: 11 };
    expect(M.danoNoTier(c, 'E')).toBe(Math.floor(11 * 1.25));  // 13
    expect(M.danoNoTier(c, 'A')).toBe(Math.floor(11 * 1.5));   // 16
  });
});
