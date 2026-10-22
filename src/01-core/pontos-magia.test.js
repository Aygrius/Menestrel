/* ============================================================
   pontos-magia.test.js — orçamento de magia e o porquê do "Aprender"
   ============================================================
   Pedido do usuário (22/10/2026): "Magos e Bardos possuem pontos-base alto
   por nível, escalado por intelecto e aura. Rastreadores e Sacerdotes
   pontos-base medianos [...] Guerreiros e Ladinos pontos-base baixo".
   Base 8 / 5 / 1; "Personagem com Aura negativa tem base 0."
   Espelho SQL: _menestrel_pontos_magia_por_estagio (Task 2 do plano).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

describe('pontosMagiasPorEstagio', () => {
  it.each([
    ['Mago', 2, 1, 11], ['Bardo', 0, 0, 8],
    ['Rastreador', 2, 1, 8], ['Sacerdote', 0, 3, 8],
    ['Guerreiro', 0, 0, 1], ['Ladino', 1, 1, 3],
  ])('%s Int %i Aura %i → %i', (prof, int, aura, esperado) => {
    expect(G.pontosMagiasPorEstagio(prof, int, aura)).toBe(esperado);
  });
  it('Aura negativa zera a base e conta 0', () => {
    expect(G.pontosMagiasPorEstagio('Mago', 3, -1)).toBe(3);
  });
  it('Intelecto negativo conta 0', () => {
    expect(G.pontosMagiasPorEstagio('Sacerdote', -2, 1)).toBe(6);
  });
  it('profissão desconhecida tem base 0', () => {
    expect(G.pontosMagiasPorEstagio('Nada', 1, 1)).toBe(2);
  });
});

describe('pontosMagiasTotal', () => {
  it('multiplica pelo estágio', () => {
    expect(G.pontosMagiasTotal('Mago', 5, 2, 1)).toBe(55);
    expect(G.pontosMagiasTotal('Guerreiro', 5, 0, 0)).toBe(5);
  });
});

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const SONETO = { key: 'soneto', nome: 'Soneto', custo: 3, tipo: 'Perdida', nivel_1: 'só o 1' };
const DB = [BOLA, SONETO];
// experiencia alta = estágio alto, salvo onde o teste diz.
const pj = (extra) => ({ profissao: 'Mago', experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, ...extra });

describe('bloqueioAprenderMagia — um motivo por vez', () => {
  it('pode aprender: null', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj(), DB)).toBeNull();
  });
  it('qualquer profissão aprende (não há permissão)', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ profissao: 'Guerreiro' }), DB)).toBeNull();
  });
  it('magia ausente → magia_nao_encontrada', () => {
    expect(G.bloqueioAprenderMagia(null, pj(), DB).motivo).toBe('magia_nao_encontrada');
  });
  it('cinco passos → ja_no_maximo', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ magias: { bola_de_fogo: 5 } }), DB).motivo).toBe('ja_no_maximo');
  });
  it('próximo nível sem texto → nivel_sem_texto', () => {
    expect(G.bloqueioAprenderMagia(SONETO, pj({ magias: { soneto: 1 } }), DB).motivo).toBe('nivel_sem_texto');
  });
  it('nível 3 no estágio 1 → acima_do_estagio', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ experiencia: 0, magias: { bola_de_fogo: 1 } }), DB).motivo).toBe('acima_do_estagio');
  });
  it('pontos: Guerreiro Int 0 Aura 0 no estágio 1 tem 1 ponto; Bola custa 2', () => {
    const r = G.bloqueioAprenderMagia(BOLA, pj({ profissao: 'Guerreiro', experiencia: 0, intelecto_base: 0, aura_base: 0 }), DB);
    expect(r).toEqual({ motivo: 'pontos_insuficientes', faltam: 1, gasto: 0, total: 1 });
  });
  // Mago Int 0 Aura 0 no estágio 1 = 8 pontos; Bola no nível 7 (preservada
  // da regra antiga) já gasta 14. Soneto nível 1 cabe no estágio, não nos pontos.
  it('PJ preservado acima do orçamento: tudo bloqueia por pontos', () => {
    const r = G.bloqueioAprenderMagia(SONETO, pj({ experiencia: 0, intelecto_base: 0, aura_base: 0, magias: { bola_de_fogo: 4 } }), DB);
    expect(r).toEqual({ motivo: 'pontos_insuficientes', faltam: 9, gasto: 14, total: 8 });
  });
});

describe('regras antigas saíram', () => {
  it('sem permissão por profissão nem trava por raridade', () => {
    expect(G.podeAcessarMagia).toBeUndefined();
    expect(G.magiaEhTravada).toBeUndefined();
    expect(G.profissaoUsaMagia).toBeUndefined();
    expect(G.MAGIAS_POR_PROFISSAO).toBeUndefined();
  });
});
