/* ============================================================
   casas-livres.test.jsx — arrastar na grade do inventário
   ============================================================
   "Tanto no inventário, como nos itens que armazenam outros itens, eu quero
    que o usuário possa mover os objetos livremente, podendo deixá-los
    espalhados em qualquer slot. Pegar um item, arrastar e soltar dentro de
    uma mochila, irá colocar este item dentro da mochila, respeitando as
    regras dos itens." (usuário, 02/10/2026)

   Decisões do usuário no mesmo dia: a grade segue acompanhando a largura;
   busca/filtro apagam quem não bate, sem tirar ninguém do lugar; o que não
   cabe na mochila volta para a casa de origem.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import '../07-inventario/inventario.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class extends MouseEvent {
    constructor(tipo, init = {}) { super(tipo, init); this.pointerId = init.pointerId ?? 1; }
  };
}

let InventarioList;
beforeAll(() => { InventarioList = window.InventarioList; });
const stubOriginal = globalThis.supabaseClient;
const efpOriginal = document.elementFromPoint;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; document.elementFromPoint = efpOriginal; });

const USER = 'user-1';
const CATALOGO = [
  { slug: 'aljava', nome: 'Aljava', grupo: 'Vestimentas', tipo: 'S', tipo_item: 'Consumíveis', armazena: 1, ocupa: null },
  { slug: 'corda', nome: 'Corda', grupo: 'Itens', tipo: 'S', ocupa: 1 },
  { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 },
];
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, vestido: false, equipado: false, slot: null, containerId: null, ...extra });

function montar(itens) {
  const pj = {
    id: 1, user_id: USER, nome: 'Aldren', sobrenome: null, raca: 'Humano', profissao: 'Guerreiro',
    forca_base: 3, fisico_base: 3, inventario_versao: 0,
    inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens },
    estado_atual: {},
  };
  const tabelas = {
    personagens: [pj], itens: CATALOGO, historias: [{ id: 9, protagonista_ids: [1] }],
    __authUserId: USER, __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  };
  globalThis.supabaseClient = fakeSupabase(tabelas);
  const r = render(<InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={1}
    maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />);
  return { ...r, tabelas };
}

const casa = (container, i) => container.querySelector(`.inv-bag-grid [data-slot-idx="${i}"]`);
const gravado = (tabelas, id) => tabelas.personagens[0].inventario.itens.find((x) => x.instanceId === id);

// Arrasta o card da casa `de` e solta sobre o elemento da casa `para`.
function arrastar(container, de, para) {
  const origem = casa(container, de);
  const destino = casa(container, para);
  document.elementFromPoint = (x) => (x > 300 ? destino : origem);
  fireEvent.pointerDown(origem, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(origem, { clientX: 40, clientY: 40 });
  fireEvent.pointerMove(window, { clientX: 400, clientY: 40 });
  fireEvent.pointerUp(window, { clientX: 400, clientY: 40 });
}

describe('casas livres no inventário', () => {
  it('quem não tem casa ganha uma, e isso é gravado', async () => {
    const { tabelas } = montar([it_('cor-1', 'corda'), it_('alj-1', 'aljava')]);
    await waitFor(() => {
      expect(gravado(tabelas, 'cor-1').casa).toBe(0);
      expect(gravado(tabelas, 'alj-1').casa).toBe(1);
    });
  });

  it('soltar numa casa vazia leva o item para lá, deixando o vão', async () => {
    const { container, tabelas } = montar([it_('cor-1', 'corda', { casa: 0 }), it_('alj-1', 'aljava', { casa: 1 })]);
    await waitFor(() => expect(casa(container, 0).classList.contains('inv-card')).toBe(true));
    arrastar(container, 0, 4);
    await waitFor(() => expect(gravado(tabelas, 'cor-1').casa).toBe(4));
    expect(casa(container, 4).classList.contains('inv-card')).toBe(true);
    expect(casa(container, 0).classList.contains('inv-slot-ghost')).toBe(true);
  });

  it('soltar sobre outro item: os dois trocam de casa', async () => {
    const { container, tabelas } = montar([it_('cor-1', 'corda', { casa: 0 }), it_('alj-1', 'aljava', { casa: 3 })]);
    await waitFor(() => expect(casa(container, 3).classList.contains('inv-card')).toBe(true));
    // A aljava (recipiente) sobre a corda: recipiente não entra em nada — troca.
    arrastar(container, 3, 0);
    await waitFor(() => {
      expect(gravado(tabelas, 'alj-1').casa).toBe(0);
      expect(gravado(tabelas, 'cor-1').casa).toBe(3);
    });
  });

  it('soltar flechas na aljava guarda o que cabe; o resto fica na casa de origem', async () => {
    const { container, tabelas } = montar([it_('alj-1', 'aljava', { casa: 0 }), it_('fle-1', 'flecha', { quantidade: 20, casa: 2 })]);
    await waitFor(() => expect(casa(container, 2).classList.contains('inv-card')).toBe(true));
    arrastar(container, 2, 0);
    await waitFor(() => {
      const itens = tabelas.personagens[0].inventario.itens;
      expect(itens.find((x) => x.slug === 'flecha' && x.containerId === 'alj-1')?.quantidade).toBe(10);
      expect(gravado(tabelas, 'fle-1')).toMatchObject({ quantidade: 10, containerId: null, casa: 2 });
    });
    expect(screen.getByRole('status').textContent).toMatch(/10 de 20/);
  });

  it('item que a mochila não aceita: avisa o motivo e nada muda', async () => {
    const { container, tabelas } = montar([it_('alj-1', 'aljava', { casa: 0 }), it_('cor-1', 'corda', { casa: 1 })]);
    await waitFor(() => expect(casa(container, 1).classList.contains('inv-card')).toBe(true));
    arrastar(container, 1, 0);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Consumíveis/));
    expect(gravado(tabelas, 'cor-1')).toMatchObject({ containerId: null, casa: 1 });
  });

  it('a busca apaga quem não bate, sem tirar ninguém da casa', async () => {
    const { container } = montar([it_('cor-1', 'corda', { casa: 0 }), it_('alj-1', 'aljava', { casa: 5 })]);
    await waitFor(() => expect(casa(container, 5).classList.contains('inv-card')).toBe(true));
    fireEvent.change(container.querySelector('.best-search input'), { target: { value: 'corda' } });
    await waitFor(() => expect(casa(container, 5).classList.contains('inv-card--apagado')).toBe(true));
    expect(casa(container, 0).classList.contains('inv-card--apagado')).toBe(false);
  });
});

/* Dentro da mochila aberta: a mesma grade de casas, só para mover ali dentro
   (decisão do usuário) — sem busca e sem guardar em outro recipiente. */
describe('casas livres dentro da mochila', () => {
  const ContainerModal = () => window.ContainerModal;
  const CAT = Object.fromEntries([
    ...CATALOGO, { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', tipo: 'S', armazena: 10, descricao: 'Couro.' },
  ].map((c) => [c.slug, c]));
  const itens = [
    it_('moc-1', 'mochila', { casa: 0 }),
    it_('cor-1', 'corda', { containerId: 'moc-1', casa: 0 }),
    it_('fle-1', 'flecha', { containerId: 'moc-1', casa: 1, quantidade: 5 }),
    it_('fora', 'corda', { casa: 1 }),
  ];
  function abrir(onMoverCasa) {
    const Modal = ContainerModal();
    return render(<div className="menestrel-ui"><Modal containerInst={itens[0]} catalogoBySlug={CAT}
      todosItens={itens} lang="pt" onClose={() => {}} onAbrirDetalhes={() => {}} onMoverCasa={onMoverCasa} /></div>);
  }

  it('mostra só o conteúdo dela, cada item na sua casa, sem a barra de busca', () => {
    const { container } = abrir(() => {});
    const grade = container.querySelector('.cont-grade');
    expect(grade.querySelector('.best-toolbar')).toBeNull();
    expect(grade.querySelectorAll('.inv-card')).toHaveLength(2);
    expect(grade.querySelector('[data-slot-idx="1"]').classList.contains('inv-card')).toBe(true);
  });

  it('arrastar para uma casa vazia move o item dentro da mochila', () => {
    const chamadas = [];
    const { container } = abrir((id, c) => chamadas.push([id, c]));
    const grade = container.querySelector('.cont-grade');
    const origem = grade.querySelector('[data-slot-idx="0"]');
    const destino = grade.querySelector('[data-slot-idx="4"]');
    document.elementFromPoint = (x) => (x > 300 ? destino : origem);
    fireEvent.pointerDown(origem, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(origem, { clientX: 40, clientY: 40 });
    fireEvent.pointerMove(window, { clientX: 400, clientY: 40 });
    fireEvent.pointerUp(window, { clientX: 400, clientY: 40 });
    expect(chamadas).toEqual([['cor-1', 4]]);
  });
});

/* Item à venda (02/10/2026): continua na grade, com o selo de etiqueta, e
   não entra em mochila — "travado até retirar o anúncio". Mudar de casa pode. */
describe('item à venda na grade', () => {
  it('mostra o selo, não entra na mochila e muda de casa normalmente', async () => {
    const { container, tabelas } = montar([
      it_('alj-1', 'aljava', { casa: 0 }),
      it_('fle-1', 'flecha', { quantidade: 5, casa: 2, anuncio_id: 9 }),
    ]);
    await waitFor(() => expect(casa(container, 2).querySelector('.inv-pill--venda')).toBeTruthy());
    arrastar(container, 2, 0);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/à venda/));
    expect(gravado(tabelas, 'fle-1')).toMatchObject({ containerId: null, anuncio_id: 9 });
    arrastar(container, 2, 5);
    await waitFor(() => expect(gravado(tabelas, 'fle-1').casa).toBe(5));
    expect(gravado(tabelas, 'fle-1').anuncio_id).toBe(9);
  });
});
