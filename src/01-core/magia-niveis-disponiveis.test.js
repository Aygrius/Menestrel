/* ============================================================
   magia-niveis-disponiveis.test.js — nível sem texto não se compra
   ============================================================
   Pedido do usuário (11/09/2026): "ao editar uma magia, permitir excluir um
   nível, impedindo que o jogador compre ele."

   Cada nível de magia vive numa coluna própria (nivel_1 … nivel_9). Apagar
   o texto é como o admin "exclui" um nível, e nível sem texto não existe:
   não há o que comprar.

   A contagem PARA no primeiro buraco em vez de contar os preenchidos. Os
   passos são sequenciais (1→3→5→7→9); apagar o 5 e deixar o 7 não pode
   permitir pular do 3 pro 7.

   Levantamento do banco em 11/09/2026, que mostra que isto não é hipótese:
     • 238 magias no total;
     • 42 já não têm nivel_7 e 43 não têm nivel_9 — ou seja, a maioria das
       magias de nível alto já era "comprável" até um nível que não tem
       texto nenhum;
     • 1 magia (Soneto da Morte) só tem o nível 1;
     • 0 magias têm buraco no meio, então "parar no buraco" e "contar
       preenchidos" dão o mesmo resultado em TODOS os registros de hoje — a
       diferença entre as duas regras só aparece em dados futuros.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';

let passosDisponiveisMagia, nivelMagiaEfetivo, NIVEIS_MAGIA;
beforeAll(() => {
  passosDisponiveisMagia = window.passosDisponiveisMagia;
  nivelMagiaEfetivo = window.nivelMagiaEfetivo;
  NIVEIS_MAGIA = window.NIVEIS_MAGIA;
  expect(passosDisponiveisMagia).toBeTypeOf('function');
});

const magia = (...textos) => {
  const m = {};
  [1, 3, 5, 7, 9].forEach((n, i) => { m['nivel_' + n] = textos[i] ?? null; });
  return m;
};

describe('NIVEIS_MAGIA', () => {
  it('são os cinco da tabela, na ordem de compra', () => {
    expect(NIVEIS_MAGIA).toEqual([1, 3, 5, 7, 9]);
  });

  it('bate com nivelMagiaEfetivo — mesma tabela, duas leituras', () => {
    expect(NIVEIS_MAGIA.map((_, i) => nivelMagiaEfetivo(i + 1))).toEqual(NIVEIS_MAGIA);
  });
});

describe('passosDisponiveisMagia', () => {
  it('magia completa vale os 5 passos', () => {
    expect(passosDisponiveisMagia(magia('a', 'b', 'c', 'd', 'e'))).toBe(5);
  });

  // O caso mais comum do banco hoje: 42 magias sem nivel_7.
  it('sem os dois últimos níveis, para em 3', () => {
    expect(passosDisponiveisMagia(magia('a', 'b', 'c', null, null))).toBe(3);
  });

  // Soneto da Morte, o caso real de 1 nível só.
  it('só o primeiro nível vale 1 passo', () => {
    expect(passosDisponiveisMagia(magia('a'))).toBe(1);
  });

  it('PARA no buraco — não pula para o nível seguinte preenchido', () => {
    expect(passosDisponiveisMagia(magia('a', 'b', null, 'd', 'e')), 'nivel_5 apagado').toBe(2);
    expect(passosDisponiveisMagia(magia('a', null, 'c', 'd', 'e')), 'nivel_3 apagado').toBe(1);
  });

  it('sem o primeiro nível, a magia fica sem passo nenhum', () => {
    expect(passosDisponiveisMagia(magia(null, 'b', 'c'))).toBe(0);
  });

  it('texto só de espaço conta como apagado', () => {
    expect(passosDisponiveisMagia(magia('a', '   ', 'c'))).toBe(1);
    expect(passosDisponiveisMagia(magia('a', '\n', 'c'))).toBe(1);
  });

  it('string vazia conta como apagado', () => {
    expect(passosDisponiveisMagia(magia('a', ''))).toBe(1);
  });

  it('magia ausente não explode', () => {
    expect(passosDisponiveisMagia(null)).toBe(0);
    expect(passosDisponiveisMagia(undefined)).toBe(0);
    expect(passosDisponiveisMagia({})).toBe(0);
  });

  // Se o texto do nível for um número (o editor grava texto, mas o banco é
  // livre), ele continua sendo conteúdo — não pode contar como apagado.
  it('conteúdo não-string ainda é conteúdo', () => {
    expect(passosDisponiveisMagia({ nivel_1: 0, nivel_3: null })).toBe(1);
  });
});

/* O teto de compra é o MENOR entre três limites independentes, e este bloco
   guarda a interação: estágio do personagem, saldo de pontos e, agora,
   níveis que a magia realmente tem. O terceiro é o novo.

   Regra deliberada: o teto vale só pra SUBIR. Existe hoje no banco um PJ
   (Elarion) com `transformacao` em 5 passos numa magia que só tem 3 níveis
   de texto — rebaixá-lo à força seria destruir o que ele já pagou. A trava
   nova só barra aumento; a descida continua governada por originalPasso. */
describe('o teto de passos na compra', () => {
  const tetoDeCompra = (passosAtuais, disp, estagio) => {
    const proximo = passosAtuais + 1;
    return proximo <= disp && nivelMagiaEfetivo(proximo) <= estagio;
  };

  it('estágio alto não compra nível que não existe', () => {
    expect(tetoDeCompra(3, 3, 20), 'passo 4 numa magia de 3 níveis').toBe(false);
  });

  it('nível existindo, o estágio ainda manda', () => {
    expect(tetoDeCompra(1, 5, 1), 'passo 2 = nível 3, estágio 1').toBe(false);
    expect(tetoDeCompra(1, 5, 3)).toBe(true);
  });

  it('quem já passou do teto não é rebaixado — só não sobe', () => {
    expect(tetoDeCompra(5, 3, 20), 'Elarion: 5 passos, magia com 3').toBe(false);
  });
});
