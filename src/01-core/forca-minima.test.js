/* ============================================================
   forca-minima.test.js — a arma é limitada pela FORÇA, não pela raça
   ============================================================
   Pedido do usuário (06/10/2026):
     "Remova a limitação de uso de armas das raças anão, pequenino, etc. A
      limitação será pelo campo 'força mínima'. Você deve manter apenas a
      quantidade mínima de mãos para usar determinado item, que atual está
      escrito 'Mãos (Outras Raças)'."

   O QUE MUDOU, e por que precisa de trava:

   `getMaosRequeridas` escolhia entre TRÊS colunas pela raça
   (maos_pequenino / maos_anao / maos_outras), e coluna VAZIA significava "esta
   raça não pode usar" — era daí que saía o "Proibido para Anão" no modal.
   Agora há uma coluna só e ela vale para todos; quem limita é `forca_req`, que
   NUNCA foi regra antes: era um número exibido na ficha do bestiário e nada
   mais.

   As duas armadilhas:

   1. VOLTAR A OLHAR A RAÇA. Um segundo argumento reaparecendo em
      getMaosRequeridas traria a limitação de volta sem ninguém notar — os
      dados das colunas antigas continuam no banco, prontos para voltar a
      travar.
   2. `forca_req` ZERO. A maioria das peças tem 0 ou nulo. Tratar 0 como
      exigência travaria o catálogo inteiro — e tratá-lo como "exige 0" é o
      mesmo que não exigir.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './forca-minima.jsx';

let getMaosRequeridas, forcaMinimaDoItem, alcancaForcaMinima;
beforeAll(() => {
  ({ getMaosRequeridas, forcaMinimaDoItem, alcancaForcaMinima } = window);
  expect(alcancaForcaMinima).toBeTypeOf('function');
});

/* Uma espadona com as três colunas DIVERGENTES de propósito: se alguma rotina
   voltar a olhar a raça, o número sai diferente e o teste cai. */
const ESPADONA = { slug: 'espadona', maos_pequenino: 2, maos_anao: 2, maos_outras: 1, forca_req: 3 };
const ADAGA = { slug: 'adaga', maos_pequenino: 1, maos_anao: 1, maos_outras: 1, forca_req: 0 };
// O caso que antes queria dizer "esta raça NÃO PODE": coluna vazia.
const ARCO_LONGO = { slug: 'arco_longo', maos_pequenino: null, maos_anao: null, maos_outras: 2, forca_req: 2 };

describe('as mãos são as mesmas para todos', () => {
  it('lê só `maos_outras`, seja qual for a raça passada', () => {
    expect(getMaosRequeridas(ESPADONA)).toBe(1);
    // Mesmo quem ainda passar a raça por engano recebe o número único.
    ['Anão', 'Pequenino', 'Humano', 'Elfo-Dourado', undefined, null].forEach((r) => {
      expect(getMaosRequeridas(ESPADONA, r), String(r)).toBe(1);
    });
  });

  it('a peça que o anão e o pequenino "não podiam usar" agora é de todos', () => {
    /* `maos_pequenino: null` era a proibição. Hoje não significa nada: vale a
       coluna única, e o arco longo pede 2 mãos de qualquer um. */
    expect(getMaosRequeridas(ARCO_LONGO)).toBe(2);
    expect(getMaosRequeridas(ARCO_LONGO, 'Pequenino')).toBe(2);
  });

  it('item sem `maos_outras` devolve null — e quem chama trata como indefinido', () => {
    // Não é "proibido": é cadastro incompleto, e o modal diz isso.
    expect(getMaosRequeridas({ slug: 'x' })).toBeNull();
    expect(getMaosRequeridas({ slug: 'x', maos_outras: null })).toBeNull();
    expect(getMaosRequeridas(null)).toBeNull();
  });

  it('`maos_outras: 0` é zero, não "indefinido"', () => {
    // O `|| ` descuidado transformaria 0 em null e o item ficaria inequipável.
    expect(getMaosRequeridas({ maos_outras: 0 })).toBe(0);
  });
});

describe('a força mínima', () => {
  it('0, nulo e vazio querem dizer "não exige força"', () => {
    expect(forcaMinimaDoItem(ADAGA)).toBe(0);
    expect(forcaMinimaDoItem({ forca_req: null })).toBe(0);
    expect(forcaMinimaDoItem({ forca_req: '' })).toBe(0);
    expect(forcaMinimaDoItem({})).toBe(0);
    expect(forcaMinimaDoItem(null)).toBe(0);
    // E negativo também não é exigência.
    expect(forcaMinimaDoItem({ forca_req: -2 })).toBe(0);
  });

  it('peça sem exigência serve até ao personagem mais fraco', () => {
    expect(alcancaForcaMinima(ADAGA, -2).ok).toBe(true);
    expect(alcancaForcaMinima(ADAGA, 0).ok).toBe(true);
  });

  it('a peça exigente passa na Força igual ou maior, e barra abaixo', () => {
    expect(alcancaForcaMinima(ESPADONA, 2).ok).toBe(false);
    expect(alcancaForcaMinima(ESPADONA, 3).ok).toBe(true);
    expect(alcancaForcaMinima(ESPADONA, 6).ok).toBe(true);
  });

  it('devolve os dois números, para a tela DIZER o que falta', () => {
    /* "Precisa de Força 3 (você tem 2)" — sem o par, a mensagem seria "não
       pode usar" e o jogador não saberia o que fazer a respeito. */
    expect(alcancaForcaMinima(ESPADONA, 2)).toEqual({ ok: false, precisa: 3, tem: 2 });
  });

  it('Força negativa conta como 0, e não ajuda nem atrapalha além disso', () => {
    expect(alcancaForcaMinima(ESPADONA, -2)).toMatchObject({ ok: false, tem: 0 });
    expect(alcancaForcaMinima(ADAGA, -2)).toMatchObject({ ok: true, tem: 0 });
  });

  it('Força fracionada arredonda — atributo é inteiro', () => {
    expect(alcancaForcaMinima(ESPADONA, 2.6)).toMatchObject({ ok: true, tem: 3 });
    expect(alcancaForcaMinima(ESPADONA, 2.4)).toMatchObject({ ok: false, tem: 2 });
  });
});

describe('a raça não limita mais arma nenhuma', () => {
  it('anão, pequenino e humano com a MESMA Força usam as MESMAS peças', () => {
    /* A prova direta do pedido: a linhagem saiu da conta. Só a Força decide. */
    const peças = [ADAGA, ESPADONA, ARCO_LONGO];
    const resultado = (forca) => peças.map((p) => [
      getMaosRequeridas(p), alcancaForcaMinima(p, forca).ok]);
    // Três raças, a mesma Força 3 → exatamente o mesmo acesso.
    const base = resultado(3);
    expect(base).toEqual([[1, true], [1, true], [2, true]]);
    // E com Força 1, as duas exigentes fecham para TODOS, não para uma raça.
    expect(resultado(1)).toEqual([[1, true], [1, false], [2, false]]);
  });
});
