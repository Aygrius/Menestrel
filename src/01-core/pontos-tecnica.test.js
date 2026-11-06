/* pontos-tecnica.test.js — orçamento de técnica
   06/11/2026 (usuário): "A quantidade de pontos de técnica deve ser por
   estágio + pontos de intelecto. […] o Ladino terá 8, o Mago terá 1, o
   Guerreiro terá 10, o Sacerdote e o Bardo terão 3, o Rastreador terá 6".
   Por estágio = base + Intelecto (negativo conta 0). Espelho SQL:
   _menestrel_pontos_tecnica_por_estagio(profissao, intelecto). */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

describe('pontosTecnicasPorEstagio', () => {
  it.each([
    ['Guerreiro', 0, 10], ['Ladino', 0, 8], ['Rastreador', 0, 6],
    ['Sacerdote', 0, 3], ['Bardo', 0, 3], ['Mago', 0, 1],
    ['Guerreiro', 2, 12], ['Mago', 3, 4],
  ])('%s Int %i → %i', (p, i, n) => {
    expect(G.pontosTecnicasPorEstagio(p, i)).toBe(n);
  });
  it('Intelecto negativo conta 0', () => {
    expect(G.pontosTecnicasPorEstagio('Ladino', -2)).toBe(8);
  });
  it('(base + Intelecto) × estágio', () => {
    expect(G.pontosTecnicasTotal('Guerreiro', 3, 2)).toBe(36);
  });
});

const GOLPE = { key: 'golpe', nome: 'Golpe', custo: 2 };
const MIRA = { key: 'mira', nome: 'Mira', custo: 1 };
const pj = (x) => ({ profissao: 'Guerreiro', experiencia: 0, intelecto_base: 0, tecnicas: {}, treinos: [], ...x });

describe('bloqueioAprenderTecnica', () => {
  it('Guerreiro estágio 1 (10 pontos) aprende Golpe nível 1', () => {
    expect(G.bloqueioAprenderTecnica(GOLPE, pj(), [GOLPE, MIRA])).toBeNull();
  });
  it('nível 1 na fila: o próximo é 2, acima do estágio 1', () => {
    const r = G.bloqueioAprenderTecnica(GOLPE, pj({ treinos: [{ tipo: 'tecnica', key: 'golpe', nivel: 1 }] }), [GOLPE]);
    expect(r.motivo).toBe('acima_do_estagio');
  });
  it('o gasto conta a fila; o Intelecto entra no total', () => {
    const r = G.bloqueioAprenderTecnica(MIRA, pj({ profissao: 'Mago', intelecto_base: 2,
      treinos: [{ tipo: 'tecnica', key: 'golpe', nivel: 1 }] }), [GOLPE, MIRA]);
    // Mago 1 + Int 2 = 3; Golpe 1 na fila = 2; Mira 1 = 1 → 3 cabe
    expect(r).toBeNull();
    const r2 = G.bloqueioAprenderTecnica(GOLPE, pj({ profissao: 'Mago' }), [GOLPE]);
    expect(r2).toEqual({ motivo: 'pontos_insuficientes', faltam: 1, gasto: 0, total: 1 });
  });
  it('Físico e Agilidade não contam mais', () => {
    const r = G.bloqueioAprenderTecnica(GOLPE, pj({ profissao: 'Mago', fisico_base: 5, agilidade_base: 5 }), [GOLPE]);
    expect(r.motivo).toBe('pontos_insuficientes');
  });
  it('técnica ausente', () => {
    expect(G.bloqueioAprenderTecnica(null, pj(), []).motivo).toBe('tecnica_nao_encontrada');
  });
});
