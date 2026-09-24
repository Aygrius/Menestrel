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

  /* O rótulo virou "Experiência" em 17/09/2026 ("onde está escrito 'Estágio'
     deve ser 'Experiência'"). A barra mede o XP dentro do estágio e é por ela
     que o Mestre concede experiência; o estágio em si é o NÚMERO, que aparece
     ao lado do nome no card. O tooltip é que continua nomeando o estágio — e
     segue sem número no rótulo, que é o que este teste guarda desde
     14/09/2026. */
  it('o rótulo é Experiência e não leva número; o tooltip é que diz o estágio', () => {
    const ini = fonte.indexOf('const estagioBars = [{');
    const trecho = fonte.slice(ini, fonte.indexOf('}];', ini));
    expect(trecho).toContain("label: (en ? 'Experience' : 'Experiência')");
    expect(trecho).not.toContain("'Estágio')");
    expect(trecho).toMatch(/tip:.*Estágio \$\{estagioNum\}/);
  });
});
