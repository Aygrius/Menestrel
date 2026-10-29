/* ============================================================
   porte-do-recipiente.test.js — as casas do recipiente
   ============================================================
   "Vamos definir 4 tipos de quantidades de slots para os itens: itens
    pequenos 3 slots, itens médios 6 slots, itens grandes 9 slots, itens muito
    grandes 15 slots." (usuário, 29/10/2026)

   E, na pergunta sobre o que limita o que cabe: **os dois**. As casas dizem
   QUANTOS itens entram, o peso (`armazena`) diz QUANTO o recipiente aguenta,
   e o que estourar primeiro trava.

   Isso fecha um mal-entendido que custou três idas e voltas: `armazena` é
   PESO, não casa. Eu cheguei a contar `ceil(armazena)` casas — uma algibeira
   de peso 2 virava 2 casas, um castelo de 5000 virava 5000. O porte separa as
   duas coisas de vez.

   O quinto porte veio logo depois, da consequência dos quatro primeiros: com
   o limite de casas valendo para todos, um Castelo que aguenta 5000 de peso
   guardava 15 itens. "Crie um quinto com 16/30 casas" — colossal, 30 casas,
   o porte das construções e das embarcações.

   O que este arquivo protege:
     • os cinco portes e os números deles;
     • o porte declarado vence a escada de peso;
     • a escada de peso cobre quem ainda não tem porte (nenhum recipiente
       antigo fica sem casas);
     • casa cheia recusa mesmo sobrando peso, e vice-versa;
     • empilhar no que já está dentro não gasta casa nova.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let porteDoRecipiente, casasDoRecipiente, capacidadeContainer, PORTE_RECIPIENTE, podeMoverParaContainer;

beforeAll(async () => {
  await import('./copy.jsx');
  await import('./constants.jsx');
  await import('./inventario-helpers.jsx');
  ({ porteDoRecipiente, casasDoRecipiente, capacidadeContainer, PORTE_RECIPIENTE,
    podeMoverParaContainer } = window);
  expect(porteDoRecipiente).toBeTypeOf('function');
});

describe('os cinco portes', () => {
  it('pequeno 3, médio 6, grande 9, muito grande 15, colossal 30', () => {
    expect(PORTE_RECIPIENTE.pequeno.casas).toBe(3);
    expect(PORTE_RECIPIENTE.medio.casas).toBe(6);
    expect(PORTE_RECIPIENTE.grande.casas).toBe(9);
    expect(PORTE_RECIPIENTE.muito_grande.casas).toBe(15);
    /* O quinto (29/10/2026, usuário: "crie um quinto com 16/30 casas"). Ele
       nasceu da consequência dos quatro primeiros: com o limite de casas
       valendo para todos, um Castelo de 5000 de peso guardava 15 itens. */
    expect(PORTE_RECIPIENTE.colossal.casas).toBe(30);
  });

  it('o porte declarado manda, mesmo contra o peso', () => {
    // Uma bolsa leve e de muitas casas é legítima: o Mestre declara.
    expect(casasDoRecipiente({ armazena: 1, porte: 'muito_grande' })).toBe(15);
    // E um baú pesado de poucas casas também.
    expect(casasDoRecipiente({ armazena: 500, porte: 'pequeno' })).toBe(3);
    expect(casasDoRecipiente({ armazena: 1, porte: 'colossal' })).toBe(30);
  });

  /* A escada de peso é REDE, para nenhum recipiente antigo ficar sem casas.
     Os cortes saem da distribuição real do catálogo, medida em 29/10/2026. */
  it.each([
    [0.3, 'pequeno'],      // Cabaça
    [2, 'pequeno'],        // Algibeira
    [3, 'medio'],          // Odre
    [10, 'medio'],         // Bolsa, Saco
    [12, 'grande'],        // Alforje de Sela
    [30, 'grande'],        // Alforge Duplo
    [35, 'muito_grande'],  // Arca
    [75, 'muito_grande'],  // Carruagem — o último dos móveis e carroças
    [90, 'colossal'],      // Arca Grande
    [200, 'colossal'],     // Casa, Taverna
    [5000, 'colossal'],    // Castelo
  ])('sem porte declarado, peso %s → %s', (armazena, esperado) => {
    expect(porteDoRecipiente({ armazena })).toBe(esperado);
  });

  it('porte escrito errado cai na escada, não quebra', () => {
    expect(porteDoRecipiente({ armazena: 2, porte: 'gigantesco' })).toBe('pequeno');
  });
});

describe('a capacidade traz os dois limites', () => {
  const CAT = {
    algibeira: { slug: 'algibeira', nome: 'Algibeira', armazena: 2, porte: 'pequeno', tipo: 'S' },
    tocha:     { slug: 'tocha', nome: 'Tocha', ocupa: 0.5, tipo: 'S' },
    corda:     { slug: 'corda', nome: 'Corda', ocupa: 2, tipo: 'S' },
  };
  const cont = { instanceId: 'c1', slug: 'algibeira', quantidade: 1 };
  const dentro = (n) => Array.from({ length: n }, (_, i) => (
    { instanceId: 'f' + i, slug: 'tocha', quantidade: 1, containerId: 'c1' }));

  it('conta casas usadas e peso usado ao mesmo tempo', () => {
    const cap = capacidadeContainer(cont, [cont, ...dentro(2)], CAT);
    expect(cap.casas).toBe(3);
    expect(cap.usadas).toBe(2);
    expect(cap.casasLivres).toBe(1);
    expect(cap.usado).toBe(1);        // 2 tochas × 0,5
    expect(cap.livre).toBe(1);        // de 2 de peso
  });

  /* A PILHA é UMA casa: dez flechas juntas ocupam uma, que é como a grade já
     as desenha. */
  it('uma pilha de dez ocupa uma casa só', () => {
    const pilha = [{ instanceId: 'f', slug: 'tocha', quantidade: 10, containerId: 'c1' }];
    const cap = capacidadeContainer(cont, [cont, ...pilha], CAT);
    expect(cap.usadas).toBe(1);
    expect(cap.usado).toBe(5);        // o peso sim conta as dez
  });

  it('sem casa livre recusa, mesmo sobrando peso', () => {
    // 3 tochas = 3 casas (cheio) e só 1,5 de peso (sobra 0,5).
    const itens = [cont, ...dentro(3)];
    const cap = capacidadeContainer(cont, itens, CAT);
    expect(cap.casasLivres).toBe(0);
    expect(cap.livre).toBeGreaterThan(0);
    const r = podeMoverParaContainer(CAT.corda, CAT.algibeira, cont, itens, CAT);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/sem casa livre/);
  });

  it('sem peso recusa, mesmo sobrando casa', () => {
    // 1 corda = 1 casa e 2 de peso: o peso zera, as casas não.
    const itens = [cont, { instanceId: 'f', slug: 'corda', quantidade: 1, containerId: 'c1' }];
    const cap = capacidadeContainer(cont, itens, CAT);
    expect(cap.casasLivres).toBe(2);
    expect(cap.livre).toBe(0);
    const r = podeMoverParaContainer(CAT.tocha, CAT.algibeira, cont, itens, CAT);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/sem espaço/);
  });

  /* Somar ao que já está lá dentro não gasta casa nova — senão uma algibeira
     cheia de tochas recusaria mais uma tocha, que iria para a mesma pilha. */
  it('empilhar no que já está dentro passa mesmo com as casas cheias', () => {
    const itens = [cont, ...dentro(3)];
    const r = podeMoverParaContainer(CAT.tocha, CAT.algibeira, cont, itens, CAT);
    expect(r.ok).toBe(true);
  });
});
