/* ============================================================
   preparar-carne.test.js — carne vira comida
   ============================================================
   Pedido do usuário (24/09/2026): 1 carne vira Ração, 2 viram Refeição e 3
   viram Banquete. As carnes especiais têm os pratos próprios (Sagrado,
   Profano, Elemental, Mágico), com as MESMAS quantidades.

   A troca soma todas as pilhas soltas da carne, gasta primeiro a clicada e
   acumula o prato numa pilha igual solta na bolsa.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';

const { receitasDaCarne, carneDisponivel, prepararCarne } = window;

let n = 0;
const novoId = () => `novo-${++n}`;
const item = (instanceId, slug, quantidade, extra) => ({
  instanceId, slug, quantidade, equipado: false, slot: null, containerId: null, observacao: null, ...extra,
});

describe('receitasDaCarne', () => {
  it('carne comum: ração, refeição, banquete', () => {
    expect(receitasDaCarne('carne')).toEqual([
      { resultado: 'racao', custo: 1 },
      { resultado: 'refeicao', custo: 2 },
      { resultado: 'banquete', custo: 3 },
    ]);
  });

  it('as quatro especiais têm os pratos próprios', () => {
    expect(receitasDaCarne('carne_celestial').map((r) => r.resultado))
      .toEqual(['racao_sagrada', 'refeicao_sagrada', 'banquete_sagrado']);
    expect(receitasDaCarne('carne_demoniaca').map((r) => r.resultado))
      .toEqual(['racao_profana', 'refeicao_profana', 'banquete_profano']);
    expect(receitasDaCarne('carne_draconica').map((r) => r.resultado))
      .toEqual(['racao_elemental', 'refeicao_elemental', 'banquete_elemental']);
    expect(receitasDaCarne('carne_mistica').map((r) => r.resultado))
      .toEqual(['racao_magica', 'refeicao_magica', 'banquete_magico']);
  });

  it('o que não é carne não tem receita', () => {
    expect(receitasDaCarne('agua')).toEqual([]);
    expect(receitasDaCarne(undefined)).toEqual([]);
  });
});

describe('carneDisponivel', () => {
  it('soma as pilhas soltas e as guardadas em recipiente', () => {
    const itens = [item('a', 'carne', 1), item('b', 'carne', 2, { containerId: 'mochila' }), item('c', 'agua', 5)];
    expect(carneDisponivel(itens, 'carne')).toBe(3);
  });
});

describe('prepararCarne', () => {
  it('2 carnes viram 1 refeição', () => {
    const r = prepararCarne([item('a', 'carne', 2)], 'a', 'refeicao', novoId);
    expect(r.find((x) => x.slug === 'carne')).toBeUndefined();
    const prato = r.find((x) => x.slug === 'refeicao');
    expect(prato.quantidade).toBe(1);
    expect(prato.containerId).toBeNull();
  });

  it('gasta primeiro a pilha clicada e completa com as outras', () => {
    const itens = [item('a', 'carne', 2), item('b', 'carne', 1)];
    const r = prepararCarne(itens, 'b', 'banquete', novoId);
    expect(r.filter((x) => x.slug === 'carne')).toHaveLength(0);
    expect(r.find((x) => x.slug === 'banquete').quantidade).toBe(1);
  });

  it('sobra o que não foi usado', () => {
    const r = prepararCarne([item('a', 'carne', 5)], 'a', 'banquete', novoId);
    expect(r.find((x) => x.slug === 'carne').quantidade).toBe(2);
  });

  it('acumula numa pilha igual solta na bolsa', () => {
    const itens = [item('a', 'carne_celestial', 1), item('r', 'racao_sagrada', 2)];
    const r = prepararCarne(itens, 'a', 'racao_sagrada', novoId);
    expect(r.filter((x) => x.slug === 'racao_sagrada')).toHaveLength(1);
    expect(r.find((x) => x.slug === 'racao_sagrada').quantidade).toBe(3);
  });

  it('carne insuficiente não troca nada', () => {
    expect(prepararCarne([item('a', 'carne', 2)], 'a', 'banquete', novoId)).toBeNull();
  });

  it('receita de outra carne não vale', () => {
    expect(prepararCarne([item('a', 'carne', 3)], 'a', 'banquete_sagrado', novoId)).toBeNull();
  });
});
