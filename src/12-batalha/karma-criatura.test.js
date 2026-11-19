/* ============================================================
   karma-criatura.test.js — 14/11/2026
   ============================================================
   Usuário: "Adicione karma às criaturas, mesma regra dos personagens."
   Decidido com ele: a criatura paga a magia como o PJ (o nível, mais o karma
   posto na coluna), e o minion de bando fica com 1/4, como as outras reservas.
   Regra do PJ: (RM + 1) × (Aura + 1), sem karma nenhum com Aura < 1.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

describe('karmaPelaRegra', () => {
  it('(RM + 1) × (Aura + 1)', () => {
    expect(window.karmaPelaRegra(7, 2)).toBe(24);
  });
  it('Aura abaixo de 1: sem karma', () => {
    expect(window.karmaPelaRegra(7, 0)).toBe(0);
    expect(window.karmaPelaRegra(7, -2)).toBe(0);
  });
  it('o PJ continua com o mesmo número de antes', () => {
    // Estágio 5, Aura 2 → RM 7 → (7+1)×(2+1) = 24, a conta que calcularFicha sempre fez.
    const rm = window.resistenciasBase(5, 0, 2).rm;
    expect(window.karmaPelaRegra(rm, 2)).toBe((rm + 1) * 3);
  });
});

const CRIATURA = {
  id: 9, nome: 'Xamã', ataque: 'Cajado', armadura: 'L', defesa: 0, absorcao: 0, velocidade: 20,
  energia_fisica: 30, energia_heroica: 20, estagio: 5, fisico: 1, aura: 2,
  dano_l: 1, dano_m: 2, dano_p: 3, dano_25: 0, dano_50: 0, dano_75: 0, dano_100: 0,
};
const montar = (criatura, extra = {}) => {
  globalThis.supabaseClient = fakeSupabase({ criaturas: [criatura], itens: [] });
  return window.montarSnapshots([{ tipo: 'criatura', ref_id: criatura.id, nome: criatura.nome, ...extra }], null);
};

describe('a criatura entra na luta com karma', () => {
  it('pela regra do PJ: estágio 5, Aura 2 → RM 7 → 24', async () => {
    const [snap] = await montar(CRIATURA);
    expect(snap).toMatchObject({ karma: 24, karma_max: 24 });
  });
  it('Aura abaixo de 1: karma 0', async () => {
    const [snap] = await montar({ ...CRIATURA, aura: 0 });
    expect(snap).toMatchObject({ karma: 0, karma_max: 0 });
  });
});

describe('o painel (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  it('a criatura também escolhe o karma da coluna', () => {
    expect(fonte).toMatch(/const escolheKarmaColuna = ator\.tipo === 'pj' \|\| ator\.tipo === 'criatura';/);
  });
  it('no automático, a coluna recebe o menor entre o nível e o karma que sobra', () => {
    // O agressivo (18/11/2026) põe tudo o que sobra; os outros, o menor.
    expect(fonte).toMatch(/setKarmaColunaSel\(auto\.karmaTudo \? sobra : Math\.min\(Number\(m\.nivel\) \|\| 0, sobra\)\)/);
  });
  it('o minion fica com 1/4 do karma', () => {
    expect(fonte).toMatch(/const kaCri = minion \? poolDeMinion\(kaCheio\) : kaCheio;/);
  });
});
