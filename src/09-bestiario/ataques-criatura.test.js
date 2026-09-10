/* ============================================================
   ataques-criatura.test.js — as duas tabelas por trás das fórmulas de dano
   ============================================================
   Cobre src/09-bestiario/ataques-criatura.jsx: a faixa de peso -> dano
   (origem: public/ataques.csv, conferida contra
   scripts/sql/criaturas-garras-dano.sql) e o offset L/M/P por ataque
   (derivado do banco em 10/09/2026 — ver comentário no arquivo fonte).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './ataques-criatura.jsx';

let A;
beforeAll(() => { A = window.AtaquesCriatura; expect(A).toBeDefined(); });

describe('danoPorFaixaDePeso', () => {
  it('cobre as 13 faixas, incluindo as duas bordas de cada uma', () => {
    const casos = [
      [1, 2], [5, 2], [6, 4], [20, 4], [21, 8], [50, 8], [51, 12], [100, 12],
      [101, 16], [200, 16], [201, 20], [350, 20], [351, 24], [500, 24],
      [501, 28], [1000, 28], [1001, 32], [3000, 32], [3001, 36], [4500, 36],
      [4501, 40], [6500, 40], [6501, 44], [9000, 44], [9001, 48],
    ];
    for (const [peso, esperado] of casos) {
      expect(A.danoPorFaixaDePeso(peso), `peso ${peso}`).toBe(esperado);
    }
  });

  // A última faixa (9001+) não tem teto — Dragão Imperial (64.000) e
  // Leviatã (100.000) usam os dois 48, o mesmo da faixa mínima de 9001.
  it('qualquer peso acima de 9000 cai na última faixa (48)', () => {
    expect(A.danoPorFaixaDePeso(9001)).toBe(48);
    expect(A.danoPorFaixaDePeso(64000)).toBe(48);
    expect(A.danoPorFaixaDePeso(100000)).toBe(48);
  });
});

describe('offsetLMP', () => {
  it('bate com os nomes conferidos contra o banco', () => {
    expect(A.offsetLMP('Garras')).toEqual({ l: 3, m: 0, p: -3 });
    expect(A.offsetLMP('Bico')).toEqual({ l: 2, m: -1, p: -4 });
    expect(A.offsetLMP('Hálito Encantado')).toEqual({ l: 1, m: 1, p: 1 });
    expect(A.offsetLMP('Presas')).toEqual({ l: 3, m: 0, p: -3 });
    expect(A.offsetLMP('Patas')).toEqual({ l: 0, m: -1, p: -2 });
  });

  it('nome desconhecido devolve null — não inventa offset', () => {
    expect(A.offsetLMP('Arma Inexistente')).toBeNull();
  });

  // Toque é o único ataque do banco cujo offset NÃO é constante entre
  // criaturas (12 criaturas, valores de 1 a 3) — ver comentário no arquivo
  // fonte. Fica de fora de propósito: uma média inventaria uma regra onde
  // os dados discordam. Este teste trava a ausência — se alguém "corrigir"
  // isso adicionando uma entrada fabricada, o teste pega.
  it('Toque fica FORA da tabela de propósito — offset não é constante no banco', () => {
    expect(A.offsetLMP('Toque')).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(A.OFFSET_LMP_ATAQUE, 'Toque')).toBe(false);
  });
});

describe('NOMES_ATAQUE_CRIATURA', () => {
  // Estar no DROPDOWN e ter OFFSET são coisas separadas — confundi-las foi um
  // erro de instrução. Toque é usado por 12 criaturas do banco, então precisa
  // ser selecionável; só não tem offset, porque nos dados ele varia de 1 a 3.
  it('tem os 30 nomes com offset MAIS os que existem no banco sem offset', () => {
    expect(A.NOMES_ATAQUE_CRIATURA.length).toBe(31);
    expect(A.NOMES_ATAQUE_CRIATURA).toContain('Garras');
    expect(A.NOMES_ATAQUE_CRIATURA).toContain('Hálito Encantado');
    expect(A.NOMES_ATAQUE_CRIATURA, 'Toque é ataque real de 12 criaturas').toContain('Toque');
  });

  it('Toque é selecionável mas NÃO tem offset — o L/M/P dele não auto-calcula', () => {
    expect(A.NOMES_ATAQUE_CRIATURA).toContain('Toque');
    expect(A.offsetLMP('Toque')).toBeNull();
  });

  it('não repete nomes', () => {
    expect(new Set(A.NOMES_ATAQUE_CRIATURA).size).toBe(A.NOMES_ATAQUE_CRIATURA.length);
  });
});
