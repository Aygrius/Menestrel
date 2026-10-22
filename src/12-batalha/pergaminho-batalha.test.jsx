/* ============================================================
   pergaminho-batalha.test.jsx — pergaminho não é munição de batalha
   ============================================================
   Reforma de 22/10/2026: o pergaminho virou o item de APRENDER a magia —
   um por magia, todos os níveis (nivel_magia nulo), e "usar um pergaminho
   não consome o pergaminho". Na batalha ele era conjurado de graça e
   sumia (consumirItemDaMagia); agora isso apagaria o item de aprendizado.
   Pergaminho fica fora da aba Magia/Apoio e da aba Item. O frasco
   alquímico continua: é ele que se arremessa ou se bebe.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import '../07-inventario/inventario.jsx';
import './batalha.jsx';

const it_ = (instanceId, slug) => ({ instanceId, slug, quantidade: 1 });
const catalogos = (itens) => ({
  pjById: { 1: { inventario: { itens } } },
  catalogoBySlug: {
    pergaminho_luz: { slug: 'pergaminho_luz', nome: 'Pergaminho Luz', grupo: 'Consumíveis', magia: 'Luz', nivel_magia: null },
    frasco_luz: { slug: 'frasco_luz', nome: 'Frasco de Luz', grupo: 'Consumíveis', magia: 'Luz', nivel_magia: 3 },
  },
  magiasByKey: { luz: { key: 'luz', nome: 'Luz' } },
});

describe('magiasDeItensDoAtor', () => {
  it('pergaminho único não vira conjuração grátis', () => {
    const r = window.MotorBatalha.magiasDeItensDoAtor({ tipo: 'pj', ref_id: 1 }, catalogos([it_('p', 'pergaminho_luz')]));
    expect(r).toEqual([]);
  });

  it('frasco alquímico continua na batalha', () => {
    const r = window.MotorBatalha.magiasDeItensDoAtor({ tipo: 'pj', ref_id: 1 }, catalogos([it_('f', 'frasco_luz')]));
    expect(r.map((m) => m.item.slug)).toEqual(['frasco_luz']);
  });
});

describe('aba Item', () => {
  it('não lista item que carrega magia, com ou sem nível (pergaminho único)', () => {
    const fonte = readFileSync('src/12-batalha/batalha.jsx', 'utf8');
    expect(fonte).not.toMatch(/if \(cat\.magia && cat\.nivel_magia != null\) return;/);
    expect(fonte).toMatch(/if \(cat\.magia\) return;/);
  });
});
