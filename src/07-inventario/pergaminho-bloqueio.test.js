/* ============================================================
   pergaminho-bloqueio.test.js — o "Aprender" do pergaminho e o seu porquê
   ============================================================
   Pedidos do usuário (13/09/2026):
     "Depois que a magia é aprendida, qual é o comportamento do item? Acho que
      o botão de aprender deve ficar bloqueado."
     "Independente da situação, o botão deve aparecer. No tooltip você informa
      porque não é possível aprender. Falta pontos? Já aprendeu? Outra
      profissão?"

   A RPC usar_pergaminho_magia ensina e CONSOME o pergaminho. A tela antecipa
   as recusas dela para o botão já nascer desativado com o motivo — casos
   reais: Galadar (Oferenda 1 já aprendida) e Lamarc (Energia Primordial, 84
   de 84 pontos gastos).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let bloqueio, chave, label;
beforeAll(() => {
  bloqueio = window.bloqueioPergaminho;
  chave = window.chaveDaMagiaPorNome;
  label = window.motivoAprenderLabel;
  expect(bloqueio).toBeTypeOf('function');
  expect(chave).toBeTypeOf('function');
  expect(label).toBeTypeOf('function');
});

// Itens reais do catálogo: itens.magia guarda o NOME da magia.
const OFERENDA_1 = { slug: 'pergaminho_oferenda_1', grupo: 'Consumíveis', magia: 'Oferenda', nivel_magia: 1 };
const VOO_3 = { slug: 'pergaminho_voo_3', grupo: 'Consumíveis', magia: 'Vôo', nivel_magia: 3 };
const ENERGIA_1 = { slug: 'pergaminho_energia_primordial', grupo: 'Consumíveis', magia: 'Energia Primordial', nivel_magia: 1 };
// Item mágico que CARREGA uma magia (para usar), não pergaminho — 13/09/2026.
const LIVRO_REVELACOES = { slug: 'livro_revelacoes', grupo: 'Itens', magia: 'Localizar Objeto', nivel_magia: 9, doc_url: 'https://docs.google.com/document/d/x/edit' };
const ANEL_NARYA = { slug: 'anel_narya', grupo: 'Vestimentas', magia: 'Piromanipulação', nivel_magia: 9 };

describe('ehPergaminhoDeMagia — só consumível é pergaminho', () => {
  it('pergaminhos (Consumíveis com magia e nível) sim', () => {
    expect(window.ehPergaminhoDeMagia(OFERENDA_1)).toBe(true);
    expect(window.ehPergaminhoDeMagia(VOO_3)).toBe(true);
  });
  it('Livro das Revelações, anel, arma: carregam magia, mas não ensinam', () => {
    expect(window.ehPergaminhoDeMagia(LIVRO_REVELACOES)).toBe(false);
    expect(window.ehPergaminhoDeMagia(ANEL_NARYA)).toBe(false);
    expect(window.ehPergaminhoDeMagia({ slug: 'arco_impetusion', grupo: 'Armas', magia: 'Dardos de Luz', nivel_magia: 5 })).toBe(false);
  });
  it('bloqueioPergaminho ignora o livro (sem botão, sem motivo)', () => {
    expect(window.bloqueioPergaminho(LIVRO_REVELACOES, { id: 1, magias: {} }, { noInventario: true, podeAprender: true })).toBeNull();
  });
});

// Catálogo enxuto, com os valores do banco.
const MAGIAS = [
  { key: 'oferenda', nome: 'Oferenda', custo: 1, permissao: 'Sacerdote', tipo: 'Perdida' },
  { key: 'voo', nome: 'Vôo', custo: 2, permissao: 'Mago', tipo: 'Perdida' },
  { key: 'energia_primordial', nome: 'Energia Primordial', custo: 4, permissao: 'Colégio Elemental', tipo: 'Ancestral' },
  { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, permissao: 'Mago', tipo: 'Básica' },
];
const OP = { magiasDb: MAGIAS, noInventario: true, podeAprender: true };

// Estágio alto o bastante para não interferir, salvo onde o teste diz.
const pj = (extra) => ({ id: 1, profissao: 'Mago', especializacao: 'Colégio Elemental', experiencia: 100000, magias: {}, ...extra });

describe('chaveDaMagiaPorNome — a mesma regra do catálogo', () => {
  it.each([
    ['Oferenda', 'oferenda'],
    ['Vôo', 'voo'],
    ['Milagre Análogo', 'milagre_analogo'],
    ['Cárcere de Almas', 'carcere_de_almas'],
    ['Égide Celestial', 'egide_celestial'],
  ])('%s → %s', (nome, key) => {
    expect(chave(nome)).toBe(key);
  });
});

describe('bloqueioPergaminho — um motivo por vez', () => {
  it('pode aprender: null', () => {
    expect(bloqueio(VOO_3, pj({ magias: { voo: 1 } }), OP)).toBeNull();
  });

  it('na ficha, aprende-se pelo inventário', () => {
    expect(bloqueio(VOO_3, pj(), { ...OP, noInventario: false }).motivo).toBe('aprender_no_inventario');
  });

  it('quem não é o dono (o Mestre olhando o inventário) não aprende', () => {
    expect(bloqueio(VOO_3, pj({ magias: { voo: 1 } }), { ...OP, podeAprender: false }).motivo).toBe('nao_e_dono');
  });

  it('Galadar: já sabe Oferenda 1 → ja_possui_nivel', () => {
    expect(bloqueio(OFERENDA_1, pj({ profissao: 'Sacerdote', magias: { oferenda: 1 } }), OP).motivo).toBe('ja_possui_nivel');
  });

  it('outra profissão → magia_nao_permitida', () => {
    expect(bloqueio(OFERENDA_1, pj(), OP).motivo).toBe('magia_nao_permitida');
  });

  it('especialização conta: Colégio Elemental alcança Energia Primordial', () => {
    expect(bloqueio(ENERGIA_1, pj({ especializacao: 'Colégio Ilusionista' }), OP).motivo).toBe('magia_nao_permitida');
    expect(bloqueio(ENERGIA_1, pj(), OP)).toBeNull();
  });

  it('pergaminho de nível 3 sem o nível 1 → falta_nivel_anterior', () => {
    expect(bloqueio(VOO_3, pj(), OP).motivo).toBe('falta_nivel_anterior');
  });

  it('nível acima do estágio → acima_do_estagio', () => {
    // Experiência 0 = estágio 1: o pergaminho de nível 3 passa do estágio.
    expect(bloqueio(VOO_3, pj({ experiencia: 0, magias: { voo: 1 } }), OP).motivo).toBe('acima_do_estagio');
  });

  it('Lamarc: estágio 6, 84 de 84 pontos → pontos_insuficientes, com os números', () => {
    // Mago: 14 pontos por estágio. Experiência 70 = estágio 6 = 84 pontos.
    // 42 passos de Bola de Fogo nível 9 (custo 2 × 9) = 18… monta 84 exatos:
    // bola_de_fogo 5 passos (9 × 2 = 18) + voo 5 passos (9 × 2 = 18) = 36 → não.
    // Mais simples: usa um catálogo com uma magia de custo 12 em 4 passos (7 × 12 = 84).
    const cat = [...MAGIAS, { key: 'pesada', nome: 'Pesada', custo: 12, permissao: 'Mago', tipo: 'Básica' }];
    const lamarc = pj({ experiencia: 70, magias: { pesada: 4 } });
    const r = bloqueio(ENERGIA_1, lamarc, { ...OP, magiasDb: cat });
    expect(r).toEqual({ motivo: 'pontos_insuficientes', faltam: 4, gasto: 84, total: 84 });
    expect(label(r.motivo, false, r)).toBe('Pontos de magia insuficientes: faltam 4 (usa 84 de 84).');
  });

  it('sem o catálogo carregado, permissão e pontos ficam para a RPC', () => {
    expect(bloqueio(ENERGIA_1, pj({ especializacao: null, experiencia: 70 }), { noInventario: true, podeAprender: true })).toBeNull();
  });

  it('item que não é pergaminho não bloqueia', () => {
    expect(bloqueio({ slug: 'pergaminho', nome: 'Pergaminho' }, pj(), OP)).toBeNull();
  });
});

describe('motivoAprenderLabel', () => {
  it.each([
    ['nao_e_dono', /Só o dono do personagem/],
    ['aprender_no_inventario', /Inventário/],
    ['ja_possui_nivel', /já tem essa magia/],
    ['magia_nao_permitida', /profissão não pode/],
    ['falta_nivel_anterior', /nível anterior/],
    ['acima_do_estagio', /estágio/],
  ])('%s', (motivo, texto) => {
    expect(label(motivo, false)).toMatch(texto);
  });
});
