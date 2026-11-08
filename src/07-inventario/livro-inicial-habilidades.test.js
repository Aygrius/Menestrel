/* ============================================================
   livro-inicial-habilidades.test.js — o Livro Inicial ensina habilidade
   ============================================================
   Pedido do usuário (07/11/2026): um livro por profissão (Sacerdote: um
   por deus) com 10 magias, 10 técnicas e 10 habilidades, entregue na
   criação. As habilidades se ligam ao livro por livro_habilidades e se
   aprendem pela RPC aprender_habilidade
   (scripts/sql/livros-iniciais-2026-11-07.sql). A regra é a da ficha:
   bloqueioSubirNivel('habilidade', …).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let W;
beforeAll(() => { W = window; });

const RELIGIAO = { key: 'religiao', nome: 'Religião', custo: 2, grupo: 'Conhecimento', nivel_inicial: 0 };
const MEDICINA = { key: 'medicina', nome: 'Medicina', custo: 1, grupo: 'Conhecimento', nivel_inicial: 0 };
const HABS = [RELIGIAO, MEDICINA];
const LIVRO = { slug: 'livro_inicial_palier', grupo: 'Itens', nome: 'Livro Inicial de Palier' };
// Sacerdote: 10 pontos por estágio; estágio 1 com 0 de experiência.
const PJ = { profissao: 'Sacerdote', experiencia: 0, habilidades: {}, treinos: [] };

const VINC = () => W.vinculosHabilidadesDeLivros([
  { livro_slug: 'livro_inicial_palier', habilidade_key: 'religiao' },
  { livro_slug: 'livro_inicial_palier', habilidade_key: 'medicina' },
  { livro_slug: 'livro_inicial_palier', habilidade_key: 'medicina' },
  { livro_slug: 'livro_inicial_mago', habilidade_key: 'misticismo' },
]);

describe('o que o livro ensina', () => {
  it('agrupa por livro sem repetir', () => {
    expect(VINC()).toEqual({ livro_inicial_palier: ['religiao', 'medicina'], livro_inicial_mago: ['misticismo'] });
  });
  it('resolve as keys no catálogo, em ordem alfabética', () => {
    expect(W.habilidadesQueOItemEnsina(LIVRO, VINC(), HABS).map((h) => h.key)).toEqual(['medicina', 'religiao']);
  });
  it('sem catálogo carregado ou sem vínculo, não ensina nada', () => {
    expect(W.habilidadesQueOItemEnsina(LIVRO, VINC(), null)).toEqual([]);
    expect(W.habilidadesQueOItemEnsina({ slug: 'livro_do_mago' }, VINC(), HABS)).toEqual([]);
  });
});

describe('por que não dá para aprender', () => {
  const op = { noInventario: true, podeAprender: true, aVenda: false, habilidadesDb: HABS };
  it('com pontos e estágio, pode', () => {
    expect(W.bloqueioHabilidadeNoInventario(RELIGIAO, PJ, op)).toBeNull();
  });
  it('em treino não aprende de novo', () => {
    const pj = { ...PJ, treinos: [{ tipo: 'habilidade', key: 'religiao', nivel: 1, horas_restantes: 12 }] };
    expect(W.bloqueioHabilidadeNoInventario(RELIGIAO, pj, op).motivo).toBe('em_treino');
  });
  it('sem pontos diz quanto falta e de quanto', () => {
    // Uma habilidade que custa 1 ponto a mais que o total do estágio.
    const pj = { ...PJ, experiencia: 999999, habilidades: { religiao: 0 } };
    const estagio = W.calcEstagio(999999);
    const total = W.pontosHabilidadesTotal('Sacerdote', estagio);
    const caro = { ...RELIGIAO, custo: total + 1 };
    const b = W.bloqueioHabilidadeNoInventario(caro, pj, { ...op, habilidadesDb: [caro] });
    expect(b.motivo).toBe('pontos_insuficientes');
    expect(b.total).toBe(total);
    expect(W.motivoAprenderLabel(b.motivo, false, { ...b, tipo: 'habilidade' })).toMatch(/^Pontos de habilidade insuficientes: faltam 1/);
  });
  it('fora do inventário, de outro dono ou à venda: o motivo da tela vem antes', () => {
    expect(W.bloqueioHabilidadeNoInventario(RELIGIAO, PJ, { ...op, noInventario: false }).motivo).toBe('aprender_no_inventario');
    expect(W.bloqueioHabilidadeNoInventario(RELIGIAO, PJ, { ...op, podeAprender: false }).motivo).toBe('nao_e_dono');
    expect(W.bloqueioHabilidadeNoInventario(RELIGIAO, PJ, { ...op, aVenda: true }).motivo).toBe('item_a_venda');
  });
  it('os textos falam de habilidade, não de magia', () => {
    expect(W.motivoAprenderLabel('item_nao_ensina', false, { tipo: 'habilidade' })).toBe('Este item não ensina essa habilidade.');
    expect(W.motivoAprenderLabel('xyz', false, { tipo: 'habilidade' })).toBe('Não foi possível aprender a habilidade.');
  });
});

describe('fiação', () => {
  const inv = readFileSync('src/07-inventario/inventario.jsx', 'utf8');
  it('o inventário chama aprender_habilidade e lê a coluna habilidades do PJ', () => {
    expect(inv).toMatch(/habilidade: 'aprender_habilidade'/);
    expect(inv).toMatch(/const PJ_COLS = '[^']*,habilidades,/);
  });
  it('inventário e ficha leem livro_habilidades pela chave inteira', () => {
    const ficha = readFileSync('src/11-ficha/ficha.jsx', 'utf8');
    const re = /'livro_habilidades', \{ colunas: 'livro_slug,habilidade_key', ordem: \['livro_slug', 'habilidade_key'\] \}/;
    expect(inv).toMatch(re);
    expect(ficha).toMatch(re);
    expect(ficha).toMatch(/vinculosHab=\{vinculosHabLivros\}/);
  });
});
