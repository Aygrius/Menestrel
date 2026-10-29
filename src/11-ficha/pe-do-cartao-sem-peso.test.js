/* ============================================================
   pe-do-cartao-sem-peso.test.js — o Peso saiu da ficha
   ============================================================
   Pedido do usuário (26/10/2026): "remova a barra de peso da ficha, pois ela
   já aparece no inventário." A barra viveu um dia no pé do cartão, ao lado
   da Experiência.

   Leitura de FONTE, não de árvore renderizada: o que está em jogo é que a
   faixa não volte por descuido (nem o JSX, nem as regras órfãs no CSS) — e
   que o lugar onde o peso REALMENTE mora siga de pé.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ler = (p) => readFileSync(resolve(__dirname, p), 'utf8');

describe('o pé do cartão da ficha', () => {
  const ficha = ler('./ficha.jsx');

  it('não desenha mais a faixa de Peso', () => {
    expect(ficha).not.toMatch(/fp-peso-faixa/);
    expect(ficha).not.toMatch(/fp-peso-trilho|fp-peso-cheio|fp-peso-val|fp-peso-ic/);
  });

  it('não calcula mais a carga que só a faixa usava', () => {
    expect(ficha).not.toMatch(/_pesoVal|_capVal|_cargaPct/);
  });

  it('ainda traz a Experiência, que não saiu', () => {
    expect(ficha).toMatch(/fp-xp-faixa/);
  });
});

describe('o CSS não guarda regras órfãs da faixa', () => {
  it('nenhum seletor .fp-peso-* sobrou', () => {
    const css = ler('../index.css');
    expect(css).not.toMatch(/^\s*#root[^\n]*\.fp-peso-/m);
  });
});

describe('o peso continua onde o usuário disse que ele já aparece', () => {
  it('o cabeçalho do Inventário mostra carga e capacidade', () => {
    const inv = ler('../07-inventario/inventario.jsx');
    expect(inv).toMatch(/function CabecalhoInvLoja/);
    expect(inv).toMatch(/title: en \? 'Weight' : 'Peso'/);
  });
});
