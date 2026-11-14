/* ============================================================
   explosao-duas-telas.test.jsx — auditoria 13/11/2026, item 15
   ============================================================
   normalizarPilhas desfaz a pilha não acumulável em unidades. Com ID
   aleatório, duas telas abertas (Inventário e Ficha, Mestre e Jogador)
   explodiam a MESMA pilha com IDs diferentes, e a mescla de três vias somava
   as duas: 3 adagas viravam 6. Agora o ID da unidade é derivado do original,
   e a mescla reconhece a mesma explosão dos dois lados.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/inventario-concorrencia.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';

const CAT = {
  adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', tipo: 'S', ocupa: 1 },
  corda: { slug: 'corda', nome: 'Corda', grupo: 'Equipamentos', tipo: 'S', ocupa: 1 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const inv = (itens) => ({ moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens });
const norm = (itens) => window.normalizarPilhas(itens, CAT);
const total = (i, slug) => i.itens.filter((x) => x.slug === slug).reduce((s, x) => s + x.quantidade, 0);

describe('a mesma pilha explodida em duas telas', () => {
  it('as duas telas chegam aos MESMOS IDs', () => {
    const base = [it_('a1', 'adaga', { quantidade: 3 })];
    const ids = (l) => l.map((x) => x.instanceId);
    expect(ids(norm(base))).toEqual(ids(norm(base)));
    expect(ids(norm(base))).toEqual(['a1', 'a1~1', 'a1~2']);
  });

  it('3 adagas continuam 3 depois da mescla (eram 6)', () => {
    const B = inv([it_('a1', 'adaga', { quantidade: 3 }), it_('c', 'corda')]);
    const R = inv(norm(B.itens));          // a tela A explodiu e gravou
    const L = inv(norm(B.itens));          // a tela B explodiu a mesma pilha
    const out = window.mesclarInventario(B, L, R);
    expect(total(out, 'adaga')).toBe(3);
    expect(out.itens).toHaveLength(4);
  });

  it('a peça EQUIPADA que fica (3 → 1) não some na mescla', () => {
    const B = inv([it_('e1', 'adaga', { quantidade: 3, equipado: true, slot: 'mao_d' })]);
    const out = window.mesclarInventario(B, inv(norm(B.itens)), inv(norm(B.itens)));
    expect(total(out, 'adaga')).toBe(3);
    expect(out.itens.find((x) => x.instanceId === 'e1')).toMatchObject({ quantidade: 1, equipado: true });
  });

  it('a explosão de um lado só segue como antes', () => {
    const B = inv([it_('a1', 'adaga', { quantidade: 3 })]);
    const out = window.mesclarInventario(B, inv(norm(B.itens)), B);
    expect(total(out, 'adaga')).toBe(3);
  });

  it('ID derivado não repete um que já existe na lista', () => {
    // Uma explosão antiga deixou a1~1; a pilha original cresceu de novo.
    const out = norm([it_('a1', 'adaga', { quantidade: 2 }), it_('a1~1', 'adaga')]);
    const ids = out.map((x) => x.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['a1', 'a1~2', 'a1~1']);
  });
});

describe('explodidosNosDois', () => {
  it('só conta derivado novo nos DOIS lados', () => {
    const B = inv([it_('x', 'adaga', { quantidade: 2 })]);
    const L = inv([it_('x', 'adaga'), it_('x~1', 'adaga')]);
    expect([...window.explodidosNosDois(B, L, L)]).toEqual(['x']);
    expect([...window.explodidosNosDois(B, L, B)]).toEqual([]);
  });
  it('a baixa normal dos dois lados continua somando (as flechas)', () => {
    const B = inv([it_('f', 'flecha', { quantidade: 10 })]);
    const out = window.mesclarInventario(B, inv([it_('f', 'flecha', { quantidade: 9 })]), inv([it_('f', 'flecha', { quantidade: 9 })]));
    expect(out.itens[0].quantidade).toBe(8);
  });
});
