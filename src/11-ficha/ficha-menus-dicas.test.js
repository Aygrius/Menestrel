/* ficha-menus-dicas.test.js — dicas e ícones da barra da ficha (22/10/2026)
   "De 'Aplicar status...' para 'Status'. De 'Escolher atividade...' para
   'Atividade'. Altere o ícone de inventário para ti-briefcase-2." (usuário) */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const fonte = readFileSync('src/11-ficha/ficha.jsx', 'utf8');

describe('barra de menus da ficha', () => {
  it('dica do status é só "Status"', () => {
    expect(fonte).not.toMatch(/Aplicar status \(envenenado/);
    expect(fonte).toMatch(/propsTip\(abrirTip, fecharTip, en \? 'Status' : 'Status'\)/);
  });
  it('dica da atividade é só "Atividade"', () => {
    expect(fonte).not.toMatch(/Escolher atividade \(dormindo/);
    expect(fonte).toMatch(/: \(en \? 'Activity' : 'Atividade'\)\)\)\}/);
  });
  it('inventário com ti-briefcase-2', () => {
    const i = fonte.indexOf('data-aba-ficha="inventario"');
    expect(fonte.slice(i, i + 400)).toMatch(/<i className="ti ti-briefcase-2"/);
  });
});
