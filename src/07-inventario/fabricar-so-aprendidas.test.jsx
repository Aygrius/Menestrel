/* ============================================================
   fabricar-so-aprendidas.test.jsx — a bancada é o caderno do personagem
   ============================================================
   Pedidos do usuário:
     31/10/2026: "Porque está aparecendo todas as receitas para o personagem
       se ele não aprendeu?" — só as receitas de personagens.receitas_aprendidas.
     02/11/2026: "Não precisamos de uma página 'fabricar', pois ao clicar na
       atividade fabricar, ao lado deve aparecer as receitas que o personagem
       sabe, e escolher uma para iniciar a atividade. Não será possível
       iniciar a atividade sem selecionar a receita."
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/fabricacao.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';
import './fabricar.jsx';
import '../11-ficha/paginas-ficha.jsx';

// A grade mede o espaço (useGridDimensions); o jsdom não tem ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
// O painel só aparece na tela larga (matchMedia ≥ 1180px).
window.matchMedia = window.matchMedia || ((q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }));

afterEach(cleanup);

const CAT = {
  anel_de_cobre: { slug: 'anel_de_cobre', nome: 'Anel de Cobre', grupo: 'Joias' },
  avambraco: { slug: 'avambraco', nome: 'Avambraço', grupo: 'Armaduras' },
  cobre: { slug: 'cobre', nome: 'Cobre', grupo: 'Materiais' },
};
const RECEITAS = [
  { resultado_slug: 'anel_de_cobre', habilidade_key: 'metalurgia', dificuldade: 'D', materiais: [{ slug: 'cobre', qtd: 1 }] },
  { resultado_slug: 'avambraco', habilidade_key: 'metalurgia', dificuldade: 'D', materiais: [{ slug: 'cobre', qtd: 5 }] },
];

const montar = (aprendidas, onFabricar = () => {}) => render(
  <window.PaginaAtividades lang="pt" atividade={null} podeEditar onEscolher={() => {}}
    receitas={RECEITAS} receitasAprendidas={aprendidas} catalogoBySlug={CAT} itens={[]}
    pjHabilidades={{}} habsByKey={{}} onFabricar={onFabricar} />,
);
const abrirFabricar = () => fireEvent.click(document.querySelector('button[data-casa="fabricando"]'));
const receitas = () => Array.from(document.querySelectorAll('button[data-receita]')).map((b) => b.dataset.receita);

describe('a atividade Fabricar mostra só o que o personagem aprendeu', () => {
  it('sem receita aprendida, nenhuma', () => {
    montar([]);
    abrirFabricar();
    expect(receitas()).toEqual([]);
  });

  it('com uma aprendida, só ela', () => {
    montar(['anel_de_cobre']);
    abrirFabricar();
    expect(receitas()).toEqual(['anel_de_cobre']);
  });
});

describe('não se fabrica sem escolher a receita', () => {
  it('sem receita escolhida, a bolha Fabricar está travada', () => {
    let pediu = null;
    montar(['anel_de_cobre'], (r) => { pediu = r; });
    abrirFabricar();
    const bolha = document.querySelector('[data-acao-leque="fabricar"]');
    expect(bolha.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(bolha);
    expect(pediu).toBeNull();
  });
});
