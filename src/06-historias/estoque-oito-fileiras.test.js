/* ============================================================
   estoque-oito-fileiras.test.js — a Loja do Mestre tem 8 fileiras
   ============================================================
   Pedido do usuário (04/11/2026): "Na loja do mestre, deve ter 8 linhas
   igual no inventário e loja do personagem." O número é o LINHAS_BAU do
   07-inventario, o mesmo dos dois baús da ficha.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const estoque = readFileSync(resolve(__dirname, 'estoque-mestre.jsx'), 'utf8');
const inventario = readFileSync(resolve(__dirname, '../07-inventario/inventario.jsx'), 'utf8');

describe('as fileiras da Loja do Mestre', () => {
  it('o baú do personagem tem 8', () => {
    expect(inventario).toMatch(/const LINHAS_BAU = 8;/);
  });
  it('a Loja do Mestre usa o mesmo número, com e sem busca', () => {
    expect(estoque).toMatch(/const LINHAS = window\.LINHAS_BAU \|\| 8;/);
    expect((estoque.match(/Math\.max\(COLS \* LINHAS, /g) || []).length).toBe(2);
    expect(estoque).not.toMatch(/COLS \* 6/);
  });
});
