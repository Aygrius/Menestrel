/* pontos-tecnica.test.js — orçamento de técnica (22/10/2026)
   Por estágio = base + Físico + Agilidade (atributo negativo conta 0), sem
   regra de base zero. Base: Guerreiro 4, Ladino 2, Rastreador 3, Sacerdote 3,
   Bardo 2, Mago 1. Espelho SQL: _menestrel_pontos_tecnica_por_estagio. */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

describe('pontosTecnicasPorEstagio', () => {
  it.each([
    ['Guerreiro', 2, 1, 7], ['Ladino', 0, 5, 7], ['Rastreador', 2, 4, 9],
    ['Sacerdote', 3, 1, 7], ['Bardo', 0, 2, 4], ['Mago', 0, 0, 1],
  ])('%s Fís %i Agi %i → %i', (p, f, a, n) => {
    expect(G.pontosTecnicasPorEstagio(p, f, a)).toBe(n);
  });
  it('atributo negativo conta 0', () => {
    expect(G.pontosTecnicasPorEstagio('Mago', -2, 2)).toBe(3);
  });
  it('total × estágio', () => {
    expect(G.pontosTecnicasTotal('Guerreiro', 9, 3, 1)).toBe(72);
  });
});

const GOLPE = { key: 'golpe', nome: 'Golpe', custo: 2 };
const MIRA = { key: 'mira', nome: 'Mira', custo: 1 };
const pj = (x) => ({ profissao: 'Guerreiro', experiencia: 0, fisico_base: 2, agilidade_base: 1, tecnicas: {}, treinos: [], ...x });

describe('bloqueioAprenderTecnica', () => {
  it('Guerreiro estágio 1 (7 pontos) aprende Golpe nível 1', () => {
    expect(G.bloqueioAprenderTecnica(GOLPE, pj(), [GOLPE, MIRA])).toBeNull();
  });
  it('nível 1 na fila: o próximo é 2, acima do estágio 1', () => {
    const r = G.bloqueioAprenderTecnica(GOLPE, pj({ treinos: [{ tipo: 'tecnica', key: 'golpe', nivel: 1 }] }), [GOLPE]);
    expect(r.motivo).toBe('acima_do_estagio');
  });
  it('o gasto conta a fila', () => {
    const r = G.bloqueioAprenderTecnica(MIRA, pj({ fisico_base: 0, agilidade_base: 0,
      treinos: [{ tipo: 'tecnica', key: 'golpe', nivel: 1 }] }), [GOLPE, MIRA]);
    // 4 pontos; Golpe 1 na fila = 2; Mira 1 = 1 → 3 cabe
    expect(r).toBeNull();
    const r2 = G.bloqueioAprenderTecnica(GOLPE, pj({ profissao: 'Mago', fisico_base: 0, agilidade_base: 0 }), [GOLPE]);
    expect(r2).toEqual({ motivo: 'pontos_insuficientes', faltam: 1, gasto: 0, total: 1 });
  });
  it('técnica ausente', () => {
    expect(G.bloqueioAprenderTecnica(null, pj(), []).motivo).toBe('tecnica_nao_encontrada');
  });
});
