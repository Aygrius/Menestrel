/* ============================================================
   resistencia-armadura-edicao.test.js — o Mestre edita a barra de Armadura
   ============================================================
   "Na ficha do personagem, eu consigo editar a EF, KA, etc, mas não consigo
   editar a barra de resistência das armaduras." (usuário, 15/09/2026)

   A barra não é pool: é a soma do `res` das peças no corpo. Editar o total
   exige repartir entre elas, e a ordem segue o que o combate já faz — gasta a
   peça mais inteira (desgastarArmadura, 12-batalha), conserta a mais
   danificada.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const G = globalThis;
const pecas = () => ([
  { instanceId: 'peito', slug: 'peitoral', res: 8, res_max: 8 },
  { instanceId: 'elmo', slug: 'elmo', res: 2, res_max: 4 },
]);
const total = (lista) => lista.reduce((s, p) => s + p.res, 0);

describe('distribuirResistencia', () => {
  it('gastar tira da peça mais inteira — nenhuma quebra antes da hora', () => {
    const r = G.distribuirResistencia(pecas(), 8);   // de 10 para 8
    expect(total(r)).toBe(8);
    expect(r.find((p) => p.instanceId === 'peito').res).toBe(6);
    expect(r.find((p) => p.instanceId === 'elmo').res).toBe(2);
  });

  it('consertar enche a mais danificada primeiro', () => {
    const r = G.distribuirResistencia(pecas(), 12);   // de 10 para 12 (teto)
    expect(total(r)).toBe(12);
    expect(r.every((p) => p.res === p.res_max)).toBe(true);
  });

  it('conserto parcial vai para quem está pior', () => {
    const r = G.distribuirResistencia(pecas(), 11);
    expect(r.find((p) => p.instanceId === 'elmo').res).toBe(3);
    expect(r.find((p) => p.instanceId === 'peito').res).toBe(8);
  });

  it('prende nos limites: nunca negativo, nunca acima da soma dos máximos', () => {
    expect(total(G.distribuirResistencia(pecas(), -5))).toBe(0);
    expect(total(G.distribuirResistencia(pecas(), 999))).toBe(12);
  });

  it('zerar deixa todas as peças em 0', () => {
    expect(G.distribuirResistencia(pecas(), 0).every((p) => p.res === 0)).toBe(true);
  });

  it('sem peças, devolve lista vazia — nada a editar', () => {
    expect(G.distribuirResistencia([], 5)).toEqual([]);
    expect(G.distribuirResistencia(null, 5)).toEqual([]);
  });

  it('não muta as peças recebidas', () => {
    const originais = pecas();
    G.distribuirResistencia(originais, 0);
    expect(originais[0].res).toBe(8);
  });
});
