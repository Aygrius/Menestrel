/* ============================================================
   fabricar-material-atual.test.js — auditoria 13/11/2026, item 30
   ============================================================
   Fabricar conferia e gastava o material na cópia da Ficha (que podia estar
   velha) e anunciava "começou a fabricar" antes de a gravação voltar. Agora
   fabrica sobre o inventário relido, pelo compare-and-swap, e só anuncia com
   ele gravado. E a recusa não diz mais "o material foi perdido".
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ficha = fs.readFileSync(path.resolve(__dirname, 'ficha.jsx'), 'utf8');
const paginas = fs.readFileSync(path.resolve(__dirname, 'paginas-ficha.jsx'), 'utf8');

describe('concluirFabricacao', () => {
  const i = ficha.indexOf('const concluirFabricacao = async (b) => {');
  const c = ficha.slice(i, i + 4000);
  it('fabrica sobre o inventário relido (alterarInventario), não sobre a cópia', () => {
    expect(i).toBeGreaterThan(0);
    expect(c).toMatch(/await window\.alterarInventario\(pj\.id, \(inv\) => \{/);
    expect(c).toMatch(/window\.fabricar\(\s*\(inv && inv\.itens\) \|\| \[\]/);
    expect(c).not.toMatch(/window\.fabricar\(\s*itensPj/);
  });
  it('o anúncio vem depois da gravação', () => {
    expect(c.indexOf('await window.alterarInventario(')).toBeLessThan(c.indexOf('setFabResultado({ ok: true'));
    expect(c.indexOf('await window.alterarInventario(')).toBeLessThan(c.indexOf('registrarEventoMesa('));
  });
});

describe('a bancada diz a verdade na recusa', () => {
  it('ok: false não é "o material foi perdido"', () => {
    expect(paginas).toMatch(/resultado\.ok === false\s*\?/);
  });
});
