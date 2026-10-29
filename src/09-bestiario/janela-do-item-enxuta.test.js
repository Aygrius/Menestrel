/* ============================================================
   janela-do-item-enxuta.test.js — o que saiu da janela do item
   ============================================================
   Dois pedidos do usuário em 26/10/2026, no mesmo dia em que as duas coisas
   tinham entrado:

     "Remova a imagem em zoom na visualização de itens em loja/inventário."
     "Remova esse texto 'O Colar de Marfim é um adorno rústico de ossos'."

   A pintura grande fica só no Livro de Regras, onde a janela é leitura; a
   frase da base saiu de vez (repetia, em prosa, o nome que o título já dá).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ler = (p) => readFileSync(resolve(__dirname, p), 'utf8');
const best = ler('./bestiario.jsx');
const inv = ler('../07-inventario/inventario.jsx');

describe('a frase da base', () => {
  it('não é mais montada por ninguém', () => {
    expect(best).not.toMatch(/BestItemBase/);
    expect(best).not.toMatch(/best-item-base/);
  });

  it('levou junto o artigo que só ela usava', () => {
    expect(best).not.toMatch(/artigoDaBase/);
  });

  it('não deixou regra órfã no CSS', () => {
    expect(ler('../index.css')).not.toMatch(/\.best-item-base/);
  });
});

/* ── A PINTURA SAIU DE TODA JANELA DE ITEM (28/10/2026) ────────────────────
   Primeiro do inventário e da loja (26/10), depois do Livro de Regras:
   "Ao clicar em um item pelo livro de regras, não mostrar a imagem do item."
   (usuário)

   Onde a pintura FICA é no item que se tem — a casa de equipamento, o cartão
   da mochila. Na janela de consulta ela empurrava a ficha do item, que é o
   motivo de abrir a janela, para baixo da dobra. */
describe('a pintura grande do item', () => {
  it('saiu da janela do inventário e da loja', () => {
    expect(inv).not.toMatch(/arte=\{/);
  });

  it('saiu também do Livro de Regras', () => {
    expect(best).not.toMatch(/arte=\{[^\n]*arteDoItem/);
  });
});
