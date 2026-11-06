/* evoluir-como-batalha.test.js
   06/11/2026, usuário: "Aplique o efeito do botão de batalha no botão de
   evoluir, e coloque os dois em primeiro na fileira. O ícone de evoluir pode
   ser uma estrela e a cor pode ser verde." */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ficha = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('Evoluir com o efeito do botão de batalha', () => {
  it('a estrela no lugar da seta', () => {
    expect(ficha).toMatch(/mc-acao--evoluir" data-aba-ficha="evoluir" onClick=\{onEvoluir\}>\r?\n\s*<i className="ti ti-star"/);
    expect(ficha).not.toMatch(/ti-trending-up/);
  });
  it('pílula verde em degradê que pulsa, parada para quem pede menos movimento', () => {
    expect(css).toMatch(/\.mc-acao--evoluir \{\r?\n\s*color: #EAF7EA; background: linear-gradient\(135deg, #3E9A4E 0%, #1F6B30 100%\);/);
    expect(css).toMatch(/animation: evoluir-pulse 2s ease-in-out infinite/);
    expect(css).toMatch(/@keyframes evoluir-pulse/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ #root \.menestrel-ui \.mc-acoes-ficha \.mc-acao--evoluir \{ animation: none; \} \}/);
  });
  it('Batalha e Evoluir abrem a fileira, antes do botão Ficha', () => {
    expect(css).toMatch(/\.mc-acao-grupo\.fp-chamada-grupo \{ order: -2; \}/);
    expect(css).toMatch(/\.mc-acao-grupo\.fp-nav-ficha-grupo \{ order: -1; \}/);
    // Jogador: Batalha e Evoluir no grupo da frente; Mestre: Evoluir.
    const i = ficha.indexOf('const ctrlsNaBarra');
    const trecho = ficha.slice(i, ficha.indexOf('fp-ctrl-grupo">', i));
    expect(trecho).toMatch(/chamadas\(\[[\s\S]*mc-acao--batalha[\s\S]*botaoEvoluir/);
    expect(ficha).toMatch(/\{chamadas\(\[botaoEvoluir && React\.cloneElement\(botaoEvoluir, \{ key: 'evoluir' \}\)\]\)\}/);
  });
});
