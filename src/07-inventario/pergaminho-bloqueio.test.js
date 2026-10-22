/* ============================================================
   pergaminho-bloqueio.test.js — o que o item ensina e por que não dá
   ============================================================
   Reforma de 22/10/2026 (spec 2026-10-22-aprendizado-magia-por-item):
   toda magia se aprende pelo item — o pergaminho dela (um só, todos os
   níveis, NÃO se consome) ou um livro que vincula o pergaminho
   (livro_pergaminhos). Sem permissão por profissão.

   Antes (13/09/2026): "Independente da situação, o botão deve aparecer. No
   tooltip você informa porque não é possível aprender." — continua valendo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let W;
beforeAll(() => { W = window; });

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const VOO = { key: 'voo', nome: 'Vôo', custo: 2, tipo: 'Perdida', nivel_1: 'a', nivel_3: 'b' };
const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', nivel_1: 'a' };
const MAGIAS = [BOLA, VOO, LUZ];

const PERG_BOLA = { slug: 'pergaminho_bola_de_fogo', grupo: 'Consumíveis', magia: 'Bola de Fogo', nivel_magia: null };
const PERG_VOO = { slug: 'pergaminho_voo', grupo: 'Consumíveis', magia: 'Vôo', nivel_magia: null };
const PERG_LUZ = { slug: 'pergaminho_luz', grupo: 'Consumíveis', magia: 'Luz', nivel_magia: null };
const LIVRO_MAGO = { slug: 'livro_do_mago', grupo: 'Itens', nome: 'Livro do Mago' };
const LIVRO_VAZIO = { slug: 'livro_de_medicina', grupo: 'Itens', nome: 'Livro de Medicina' };
const FRASCO = { slug: 'frasco_incendiario', grupo: 'Consumíveis', magia: 'Frasco Incendiário', nivel_magia: 3 };
const ANEL = { slug: 'anel_narya', grupo: 'Vestimentas', magia: 'Piromanipulação', nivel_magia: 9 };
const CAT = { [PERG_BOLA.slug]: PERG_BOLA, [PERG_VOO.slug]: PERG_VOO, [PERG_LUZ.slug]: PERG_LUZ };

const VINC = W => W.vinculosDeLivros([
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_luz' },
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_bola_de_fogo' },
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_bola_de_fogo' }, // repetido
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_sumiu' },        // pergaminho apagado
]);

describe('ehPergaminhoDeMagia — pergaminho único, sem nível', () => {
  it('pergaminho com nivel_magia nulo é pergaminho', () => {
    expect(W.ehPergaminhoDeMagia(PERG_BOLA)).toBe(true);
  });
  it('frasco, anel e livro não são', () => {
    expect(W.ehPergaminhoDeMagia(FRASCO)).toBe(false);
    expect(W.ehPergaminhoDeMagia(ANEL)).toBe(false);
    expect(W.ehPergaminhoDeMagia(LIVRO_MAGO)).toBe(false);
  });
  it('frasco continua item de batalha', () => {
    expect(W.ehItemDeMagiaEmBatalha(FRASCO)).toBe(true);
    expect(W.ehItemDeMagiaEmBatalha(PERG_BOLA)).toBe(false);
  });
});

describe('magiasQueOItemEnsina', () => {
  it('pergaminho ensina a sua magia', () => {
    expect(W.magiasQueOItemEnsina(PERG_VOO, {}, CAT, MAGIAS).map((m) => m.key)).toEqual(['voo']);
  });
  it('livro ensina as vinculadas, por nome, sem repetir nem quebrar no pergaminho apagado', () => {
    expect(W.magiasQueOItemEnsina(LIVRO_MAGO, VINC(W), CAT, MAGIAS).map((m) => m.key)).toEqual(['bola_de_fogo', 'luz']);
  });
  it('livro sem vínculo não ensina nada', () => {
    expect(W.magiasQueOItemEnsina(LIVRO_VAZIO, VINC(W), CAT, MAGIAS)).toEqual([]);
  });
  it('item mágico que só carrega a magia não ensina', () => {
    expect(W.magiasQueOItemEnsina(ANEL, VINC(W), CAT, MAGIAS)).toEqual([]);
  });
});

const pj = (extra) => ({ id: 1, profissao: 'Guerreiro', experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, ...extra });
const OP = { magiasDb: MAGIAS, noInventario: true, podeAprender: true, aVenda: false };

describe('bloqueioAprenderNoInventario — a ordem dos motivos', () => {
  it('pode: null (Guerreiro aprende Vôo)', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), OP)).toBeNull();
  });
  it('na ficha → aprender_no_inventario', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, noInventario: false }).motivo).toBe('aprender_no_inventario');
  });
  it('não é o dono → nao_e_dono', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, podeAprender: false }).motivo).toBe('nao_e_dono');
  });
  it('à venda → item_a_venda', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, aVenda: true }).motivo).toBe('item_a_venda');
  });
  it('magia que sumiu do catálogo → magia_nao_encontrada', () => {
    expect(W.bloqueioAprenderNoInventario(null, pj(), OP).motivo).toBe('magia_nao_encontrada');
  });
  it('depois, as regras de game-data (estágio, pontos…)', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj({ experiencia: 0, magias: { voo: 1 } }), OP).motivo).toBe('acima_do_estagio');
  });
});

describe('motivoAprenderLabel', () => {
  it.each([
    ['item_a_venda', /À venda/],
    ['item_nao_ensina', /não ensina/],
    ['ja_no_maximo', /nível máximo/],
    ['nivel_sem_texto', /não tem o próximo nível/],
    ['acima_do_estagio', /estágio/],
    ['nao_e_dono', /Só o dono/],
  ])('%s', (motivo, texto) => {
    expect(W.motivoAprenderLabel(motivo, false)).toMatch(texto);
  });
  it('pontos com os números', () => {
    expect(W.motivoAprenderLabel('pontos_insuficientes', false, { faltam: 4, gasto: 84, total: 84 }))
      .toBe('Pontos de magia insuficientes: faltam 4 (usa 84 de 84).');
  });
});
