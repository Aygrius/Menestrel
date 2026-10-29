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

describe('o parser aprendeu a palavra', () => {
  it('"Protege 20 de Pesado" vira proteção na barra pesado', () => {
    expect(protecoesDoItem(ALFORGE)).toEqual({ pesado: 20 });
  });

  /* O Cinto Élfico protege duas barras na mesma frase, e o verbo vale para as
     duas partes — é o que o parser já fazia com Frio e Calor. */
  it('duas barras na mesma frase, uma delas Pesado', () => {
    expect(protecoesDoItem(CINTO_ELFICO)).toEqual({ pesado: 5, reputacao: 5 });
  });

  it('e aparece na grade do editor, com o rótulo Pesado', () => {
    expect(protecoesEmNumeros(ALFORGE)).toEqual({ Pesado: 20 });
    expect(PROTECOES_EDITAVEIS.map((d) => d.rotulo)).toContain('Pesado');
  });

  /* Pesado NÃO entra na grade de deltas: a barra é calculada do peso
     carregado, não guardada — somar a ela seria escrever num número que a
     próxima conta reescreve. */
  it('mas não entra na grade de deltas', () => {
    expect(window.EFEITOS_EDITAVEIS.map((d) => d.rotulo)).not.toContain('Pesado');
  });

  it('a grade grava a proteção de volta na prosa', () => {
    expect(efeitosParaTexto({}, null, { Pesado: 20 }).efeito_positivo)
      .toBe('Protege 20 de Pesado.');
  });
});

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
