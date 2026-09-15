/* ============================================================
   ficha-armadura-estagio.test.js — sem selo na Armadura, sem número no Estágio
   ============================================================
   "Na ficha os personagens, remova o ícone e o número em frente a barra de
    armadura. Na barra de Estágio, remova o número do estágio." (usuário,
    14/09/2026)

   A ficha é um componente grande, com banco; a checagem é de fonte, no
   trecho que monta as duas barras.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fonte = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');

describe('ficha — barras de Armadura e Estágio', () => {
  it('a barra de Armadura não tem mais o selo com ícone e número', () => {
    expect(fonte).not.toMatch(/badge:\s*\(absAtual/);
    expect(fonte).not.toContain('fp-bar-badge');
  });

  it('o rótulo do Estágio não leva o número; o tooltip continua dizendo', () => {
    const ini = fonte.indexOf('const estagioBars = [{');
    const trecho = fonte.slice(ini, fonte.indexOf('}];', ini));
    expect(trecho).toContain("label: (en ? 'Stage' : 'Estágio')");
    expect(trecho).toMatch(/tip:.*Estágio \$\{estagioNum\}/);
  });
});
