/* ============================================================
   usar-item-ficha.test.js — auditoria 13/11/2026, item 29
   ============================================================
   Usar um consumível pela Ficha gravava a baixa e o efeito em paralelo; com
   a baixa recusada, o desfazer voltava o PJ INTEIRO (inclusive o efeito já
   gravado), e o efeito valia sem o item ter saído. Agora a baixa vem
   primeiro, o efeito só com ela gravada, e o desfazer mexe só no inventário.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const fonte = fs.readFileSync(path.resolve(__dirname, 'ficha.jsx'), 'utf8');
const trecho = (inicio, tam) => fonte.slice(fonte.indexOf(inicio), fonte.indexOf(inicio) + tam);

describe('salvarItensFicha', () => {
  const c = trecho('const salvarItensFicha = async (novosItens) => {', 1600);
  it('o desfazer volta só o inventário, não o PJ inteiro', () => {
    expect(c).not.toMatch(/setPj\(anterior\);/);   // a chamada; o comentário cita o nome
    expect(c).toMatch(/inventario: anterior\.inventario/);
  });
  it('devolve se gravou', () => {
    expect(c).toMatch(/return false;/);
    expect(c).toMatch(/return true;/);
  });
});

describe('usarItemFicha', () => {
  const c = trecho('const usarItemFicha = async (instanceId, quantidade = 1) => {', 1600);
  it('espera a baixa antes do efeito', () => {
    const baixa = c.indexOf('const baixou = await salvarItensFicha(');
    const efeito = c.indexOf('aplicarEstadoEfeito(cat, quantidade)');
    expect(baixa).toBeGreaterThan(0);
    expect(c).toMatch(/if \(!baixou\) return;/);
    expect(efeito).toBeGreaterThan(baixa);
  });
});
