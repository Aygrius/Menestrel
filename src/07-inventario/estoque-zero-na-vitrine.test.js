/* ============================================================
   estoque-zero-na-vitrine.test.js — o balcão só mostra o que dá para levar
   ============================================================
   Pedido do usuário (26/10/2026): "itens que chegar a 0 de quantidade de
   estoque na loja, desaparecem, só aparecem aqueles com no mínimo 1 de
   estoque."

   O filtro existia desde então, mas lia `e.quantidade` — campo que a linha do
   balcão NÃO tem. A entrada vem de `estoque_loja_flat` como
   { entryId, slug, estoque, preco_latao_override }, e é `estoque` que
   `stockNull`/`stockNum` leem dez linhas abaixo e que a compra debita
   (scripts/sql/loja-so-na-cidade-2026-10-28.sql). Lendo a chave errada, o
   `== null` dava sempre verdadeiro: o filtro passava tudo e o item esgotado
   seguia na vitrine, com a etiqueta "Esgotado" que o pedido mandou tirar.

   E o ∞ do painel do Mestre: "−" em 0 mostra ∞ e "+" no ∞ devia voltar para 1.
   O stepper devolvia 0 — esgotado, que é o oposto de ilimitado.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loja = readFileSync(resolve(__dirname, './loja.jsx'), 'utf8');
const estoque = readFileSync(resolve(__dirname, '../06-historias/estoque-mestre.jsx'), 'utf8');

describe('o filtro da vitrine', () => {
  it('lê `estoque`, o campo que a linha do balcão tem', () => {
    expect(loja).toMatch(/const temEstoque = \(e\) => e\.estoque == null \|\| Number\(e\.estoque\) >= 1;/);
    expect(loja).toMatch(/const entradas = estoqueLoja\.filter\(\(e\) => catalogoBySlug\[e\.slug\] && temEstoque\(e\)\);/);
  });

  it('e não `quantidade`, que nessa linha não existe', () => {
    expect(loja).not.toMatch(/temEstoque = \(e\) => e\.quantidade/);
  });

  /* É a MESMA chave em toda a trilha — ler a vitrine por um nome e debitar a
     compra por outro é como o filtro passou um mês sem fazer nada. */
  it('o resto da loja lê a mesma chave', () => {
    expect(loja).toMatch(/const stockNull = entry\.estoque == null;/);
    expect(loja).toMatch(/estoque: Math\.max\(0, Number\(entry\.estoque\) - qtd\)/);
  });
});

describe('o degrau de volta do ∞ no painel do Mestre', () => {
  it('"+" no ilimitado cai em 1, não em 0', () => {
    expect(estoque).toMatch(
      /estoque: v < 0 \? null : \(ilimitado \? Math\.max\(1, v\) : Math\.max\(0, v\)\)/
    );
  });

  /* O ∞ é o degrau ABAIXO do zero (min: -1), e por isso "−" trava nele. */
  it('e o ∞ continua sendo o degrau abaixo do zero', () => {
    expect(estoque).toMatch(/value=\{ilimitado \? -1 : \(Number\(it\.estoque\) \|\| 0\)\}/);
    expect(estoque).toMatch(/min=\{-1\}/);
    expect(estoque).toMatch(/centro=\{ilimitado \? '∞' : \(Number\(it\.estoque\) \|\| 0\)\}/);
  });
});
