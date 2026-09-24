/* ============================================================
   token-icone-criatura.test.jsx — o token deixa de ser uma letra
   ============================================================
   "No tabuleiro de batalha, ao invés de mostrar a primeira letra do nome da
    criatura, mostre seu ícone de acordo com seu tipo." (usuário, 17/09/2026)

   A armadilha deste pedido está no nome do campo: `p.tipo` no participante é
   'pj' | 'criatura' — o QUE ele é —, não o tipo do bestiário. O tipo da
   criatura viaja como `raca`: montarSnapshots grava `raca: c.tipo`, e o
   metaTokens repete isso para a montagem, onde os participantes ainda são
   crus. Ler `p.tipo` daria 'criatura' para todo mundo e nenhum ícone.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let TabuleiroToken;
beforeAll(() => {
  TabuleiroToken = window.TabuleiroToken;
  expect(TabuleiroToken, 'TabuleiroToken precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const base = { nome: 'Balor', ef: 10, ef_max: 10, status: 'ativo', pos: { x: 0, y: 0 } };
const montar = (p, meta) => render(
  <TabuleiroToken p={p} meta={meta || null} size={34} onSelect={() => {}} />
);
const icone = () => document.querySelector('.batalha-token-rosto i');
const letra = () => document.querySelector('.batalha-token-rosto span:not([class])');

describe('criatura mostra o ícone do seu tipo', () => {
  it('o tipo vem de `raca` no snapshot, não de `tipo`', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão' });
    expect(icone().className).toBe('ti ti-dragon');
  });

  it('na montagem, onde o participante é cru, vem do meta', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1 }, { raca: 'Morto' });
    expect(icone().className).toBe('ti ti-coffin');
  });

  it('e o snapshot ganha do meta quando os dois existem', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Animal' }, { raca: 'Morto' });
    expect(icone().className).toBe('ti ti-horse');
  });

  it.each([
    ['Animal', 'ti-horse'], ['Celestial', 'ti-cross'], ['Infernal', 'ti-pentagram'],
    ['Demônio', 'ti-pentagram'], ['Construído', 'ti-robot'],
    ['Místico', 'ti-michelin-bib-gourmand'], ['Civilizado', 'ti-user'],
    ['Elemental', 'ti-ghost-2'],
  ])('%s desenha %s', (tipo, ic) => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: tipo });
    expect(icone().className).toBe('ti ' + ic);
  });

  it('a inicial some quando há ícone', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão' });
    expect(letra()).toBeNull();
  });
});

describe('o que continua na inicial', () => {
  /* Os dez tipos com linha no banco estão todos nomeados. Sobraram Monstro e
     Gigante, que o editor oferece e ninguém usa — um token vazio seria pior
     que a letra. */
  it('tipo sem ícone mapeado mantém a letra', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Gigante' });
    expect(icone()).toBeNull();
    expect(letra().textContent).toBe('B');
  });

  it('criatura sem tipo nenhum também', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1 });
    expect(letra().textContent).toBe('B');
  });

  /* Para um PJ, `raca` é Humano/Elfo — não está nesta tabela, e o pedido era
     só sobre criaturas. */
  it('o PJ continua na inicial, mesmo com raça que exista na tabela', () => {
    montar({ ...base, nome: 'Thalia', tipo: 'pj', ref_id: 1, raca: 'Animal' });
    expect(icone()).toBeNull();
    expect(letra().textContent).toBe('T');
  });
});

describe('a foto ainda ganha de tudo', () => {
  it('com foto, nem ícone nem letra', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão', foto_url: 'http://x/y.png' });
    expect(document.querySelector('.batalha-token-rosto img')).toBeTruthy();
    expect(icone()).toBeNull();
    expect(letra()).toBeNull();
  });
});
