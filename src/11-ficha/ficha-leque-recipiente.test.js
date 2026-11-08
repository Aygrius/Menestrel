/* ficha-leque-recipiente.test.js — o leque nos itens da mochila vestida
   07/11/2026, usuário: "Está faltando o leque dos itens quando estão dentro de
   alguma bolsa, mochila, etc." e "Ainda não estou vendo o leque dos itens
   dentro das bolsas". A mochila vestida abre pela FICHA (contFichaId), não
   pelo inventário: o recipiente dali também precisa ligar o leque. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fonte = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');

describe('o recipiente aberto pela ficha liga o leque', () => {
  it('o clique na peça da mochila abre o leque da ficha, marcado com o recipiente', () => {
    expect(fonte).toMatch(/setLequeFicha\(\{ inst: peca, container: contFichaId, ancora \}\)/);
  });
  it('a etapa do leque fecha o recipiente e o Voltar reabre ele', () => {
    expect(fonte).toMatch(/setVoltarPara\(\{ tipo: 'container', container: doRecipiente \}\);\r?\n\s*setContFichaId\(null\);/);
  });
});
