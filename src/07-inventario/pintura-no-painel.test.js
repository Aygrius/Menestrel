/* ============================================================
   pintura-no-painel.test.js — a pintura do item não pode cortar
   ============================================================
   Pedidos do usuário, na ordem em que vieram (25 e 26/10/2026):
     • "Ao clicar em um item no inventário e loja, à direita aparece o card
        com as informações do item, adicione a imagem dele grande antes do
        título."
     • "Quando seleciono um item do inventário e loja, a imagem do item
        aparece na direita tão grande que corta."
     • "Quando a descrição do item é grande, a página está criando uma barra
        de rolagem vertical, eu quero a barra de rolagem apenas no card."

   O corte voltou uma vez depois de "consertado", e por um motivo que não
   aparece lendo a regra isolada: a moldura era `display: grid` com
   `place-items: center`, e aí a LINHA do grid passa a ser dimensionada pelo
   conteúdo. A `height: 100%` da imagem deixava de resolver contra os 190px
   da moldura e resolvia contra essa linha automática — a pintura vinha com
   358px de altura e o `overflow: hidden` comia o topo e o pé dela.

   Medido no Chrome em 26/10/2026, na prévia preview/item-painel.html:
   com `grid`, a imagem computava 358.667px de altura numa moldura de 190px;
   com `block`, computa 189.333px.

   Daí este teste varrer a FONTE: é ali que a armadilha mora.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizSrc = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raizSrc, 'index.css'), 'utf8');

// O bloco da moldura e o da imagem, isolados do resto do arquivo.
const bloco = (seletor) => {
  const i = css.indexOf(seletor + ' {');
  expect(i, 'a regra ' + seletor + ' existe').toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
};
const ALVO = '#root .menestrel-ui .ms-painel > .modal-em-painel .ms-arte';

describe('a moldura da pintura tem altura DEFINIDA', () => {
  const moldura = bloco(ALVO);

  it('mede 190px de altura', () => {
    expect(moldura).toMatch(/height:\s*190px/);
  });
  it('não é grid nem flex — a altura em % da imagem precisa de um bloco', () => {
    // É este o detalhe que deixava a pintura com 358px numa caixa de 190.
    expect(moldura).not.toMatch(/display:\s*(grid|flex|inline-grid|inline-flex)/);
    expect(moldura).toMatch(/display:\s*block/);
  });
  it('esconde o que sobra, para a pintura nunca vazar sobre o título', () => {
    expect(moldura).toMatch(/overflow:\s*hidden/);
  });
});

describe('a pintura aparece INTEIRA dentro da moldura', () => {
  const img = bloco(ALVO + ' img');

  it('ocupa a moldura toda e usa contain, nunca cover', () => {
    expect(img).toMatch(/width:\s*100%/);
    expect(img).toMatch(/height:\s*100%/);
    expect(img).toMatch(/object-fit:\s*contain/);
    expect(img).not.toMatch(/object-fit:\s*cover/);
  });
});

describe('a rolagem é do card, não da página', () => {
  it('o painel tem teto de altura e acompanha a rolagem', () => {
    const painel = css.slice(css.lastIndexOf('#root .menestrel-ui .bau-painel {'));
    const regra = painel.slice(0, painel.indexOf('}'));
    expect(regra).toMatch(/position:\s*sticky/);
    /* O teto deixou de ser `calc(100vh - 132px)` em 26/10/2026: aquele número
       chutado não sabia onde o card começa, e o card passava do pé da tela.
       Hoje é a altura MEDIDA da grade — ver casa-do-bau.test.js. */
    expect(regra).toMatch(/max-height:\s*var\(--bau-painel-h/);
  });
  it('o corpo do card rola por dentro', () => {
    expect(bloco('#root .menestrel-ui .ms-painel > .modal-em-painel .ms-body'))
      .toMatch(/overflow-y:\s*auto/);
  });
});

/* ── A JANELA SABE MOSTRAR PINTURA; NINGUÉM MAIS PEDE (26 → 28/10/2026) ────
   Em 26/10 a pintura entrou na janela do Livro de Regras: "Ao clicar no menu
   de livro de regras e abrir um item, eu quero ver a imagem dele dentro do
   modal" (usuário). Em 28/10 o mesmo usuário desfez: "Ao clicar em um item
   pelo livro de regras, não mostrar a imagem do item."

   A CAPACIDADE fica — a janela aceita `arte` sem painel, e o CSS da faixa
   vale para o modal. O que saiu foi o único lugar que a passava. Guardar a
   capacidade intacta é o que torna a volta uma linha, e é por isso que os
   testes dela continuam aqui, agora dizendo que ninguém a usa. */
describe('a pintura na janela: a capacidade fica, o uso saiu', () => {
  const best = readFileSync(resolve(raizSrc, '09-bestiario/bestiario.jsx'), 'utf8');

  it('a janela continua sabendo desenhar arte sem painel', () => {
    expect(best).toMatch(/\{arte && \(\s*\n\s*<div className="ms-arte"/);
    expect(best).not.toMatch(/arte && alvoPainel/);
  });
  it('a lista de itens do Livro NÃO passa mais a pintura', () => {
    expect(best).not.toMatch(/arte=\{\(typeof window !== 'undefined' && window\.arteDoItem\)/);
  });
  it('a faixa tem regra para o modal, não só para o painel', () => {
    const modal = bloco('#root .menestrel-ui .ms-modal .ms-arte');
    expect(modal).toMatch(/display:\s*block/);
    expect(modal).toMatch(/height:\s*\d+px/);
    expect(bloco('#root .menestrel-ui .ms-modal .ms-arte img')).toMatch(/object-fit:\s*contain/);
  });
});
