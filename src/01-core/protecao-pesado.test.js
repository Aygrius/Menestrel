/* ============================================================
   protecao-pesado.test.js — "Protege N de Pesado" volta a existir
   ============================================================
   "A proteção dos itens é contra peso, ou seja, aumentam a capacidade de
   carga do personagem." (usuário, 28/10/2026)

   O achado que trouxe este arquivo: quinze itens de carga do catálogo
   (alforjes, aljavas, bainhas, cintos, o Estojo) dizem "Protege N de Pesado",
   e `Pesado` não estava no vocabulário do parser. A linha era lida e
   DESCARTADA EM SILÊNCIO — a proteção nunca acontecia.

   O motor já estava pronto: a barra Pesado existe (a carga em % da
   capacidade) e `barrasDeCondicao` aplicava teto a ela junto com as outras.
   Faltava uma palavra.

   O QUE A PROTEÇÃO FAZ, em uma frase: a barra Pesado nunca passa de
   100 − proteção. Como Pesado penaliza a Velocidade em degraus de 25, um
   alforje de 20 impede o pior degrau. É a mesma regra de "Protege 25 de
   Frio", que vale desde 27/09/2026 — Pesado só não participava dela.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';

let protecoesDoItem, protecoesEmNumeros, barrasDeCondicao, PROTECOES_EDITAVEIS, efeitosParaTexto;
beforeAll(() => {
  protecoesDoItem = window.protecoesDoItem;
  protecoesEmNumeros = window.protecoesEmNumeros;
  barrasDeCondicao = window.barrasDeCondicao;
  PROTECOES_EDITAVEIS = window.PROTECOES_EDITAVEIS;
  efeitosParaTexto = window.efeitosParaTexto;
  expect(protecoesDoItem).toBeTypeOf('function');
});

// Cópias literais do catálogo de produção (28/10/2026).
const ALFORGE = { efeito_positivo: 'Protege 20 de Pesado.' };
const CINTO_ELFICO = { efeito_positivo: 'Protege 5 de Pesado e 5 de Desonra.' };

/* A PROTEÇÃO PESADO SAIU (30/10/2026, usuário: "Remover a informação 'Este
   item protege 20 de pesado.' e a mecânica, pois os itens dentro de um
   recipiente já possuem um ajuste para amenizar a carga"). Confirmado em
   calcCarga: 75% de peso dentro do recipiente, e o recipiente soma
   capacidade. O texto saiu dos 15 itens do banco
   (scripts/sql/sem-protecao-pesado-2026-10-30.sql); o que sobrar escrito é
   ignorado. Este bloco trava a SAÍDA — o de 28/10 travava a entrada. */
describe('a proteção Pesado não existe mais', () => {
  it('"Protege 20 de Pesado" não vira proteção nenhuma', () => {
    expect(protecoesDoItem(ALFORGE)).toEqual({});
  });

  it('numa frase com outra barra, só a outra vale', () => {
    expect(protecoesDoItem(CINTO_ELFICO)).toEqual({ reputacao: 5 });
  });

  it('e não aparece na grade do editor', () => {
    expect(protecoesEmNumeros(ALFORGE)).toEqual({});
    expect(PROTECOES_EDITAVEIS.map((d) => d.rotulo)).not.toContain('Pesado');
    expect(window.EFEITOS_EDITAVEIS.map((d) => d.rotulo)).not.toContain('Pesado');
  });

  it('a grade não grava Pesado de volta na prosa', () => {
    expect(efeitosParaTexto({}, null, { Pesado: 20 }).efeito_positivo || '').not.toMatch(/Pesado/);
  });
});

/* A conta do teto continua valendo para qualquer proteção que chegue à
   barra (barrasDeCondicao é genérica) — só nenhum item a manda mais. */
describe('o que a proteção faz na barra', () => {
  /* A carga chega em `condicoes.pesado` como % da capacidade — é
     calcularFicha quem a põe ali. */
  it('a barra nunca passa de 100 menos a proteção', () => {
    const semProtecao = barrasDeCondicao({ pesado: 95 }, {});
    const comAlforge = barrasDeCondicao({ pesado: 95 }, { pesado: 20 });
    expect(semProtecao.pesado).toBe(95);
    expect(comAlforge.pesado).toBe(80);
  });

  it('carga abaixo do teto não muda nada: proteção é teto, não desconto', () => {
    expect(barrasDeCondicao({ pesado: 40 }, { pesado: 20 }).pesado).toBe(40);
  });

  /* O efeito prático: Pesado penaliza a VELOCIDADE em degraus de 25 (0–24,
     25–49, 50–74, 75–99, 100). Com 20 de proteção a barra para em 80, que é
     o degrau 3 — o personagem nunca toma o degrau 4 usando o alforje. */
  it('o degrau do pior caso cai de 4 para 3', () => {
    const degrau = window.degrauCondicao;
    expect(degrau(barrasDeCondicao({ pesado: 100 }, {}).pesado)).toBe(4);
    expect(degrau(barrasDeCondicao({ pesado: 100 }, { pesado: 20 }).pesado)).toBe(3);
  });
});
