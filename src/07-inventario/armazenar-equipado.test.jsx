/* ============================================================
   armazenar-equipado.test.jsx — guardar item num recipiente VESTIDO
   ============================================================
   "Os itens podem ser guardados em itens equipados, veja se essa função está
    funcionando." (usuário, 13/09/2026)

   No catálogo, os recipientes que se vestem são os da cintura (Alforge,
   Algibeira, Aljava, cinturões). Aqui o fluxo inteiro, no InventarioList de
   verdade: abrir o item solto → Armazenar → escolher o cinto vestido →
   Confirmar, e o item sai da lista principal para dentro do cinto.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

let InventarioList;
beforeAll(() => { InventarioList = window.InventarioList; });
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const USER = 'user-1';
const PJ_ID = 64;

// Valores do banco (itens), 13/09/2026.
const CATALOGO = [
  { slug: 'alforge', nome: 'Alforge', grupo: 'Vestimentas', tipo: 'S', tipo_item: null, armazena: 15, ocupa: null, slot_equip: 'cintura' },
  { slug: 'aljava', nome: 'Aljava', grupo: 'Vestimentas', tipo: 'S', tipo_item: 'Consumíveis', armazena: 1.5, ocupa: null, slot_equip: 'cintura' },
  { slug: 'corda', nome: 'Corda', grupo: 'Itens', tipo: 'S', ocupa: 1 },
  { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 },
];

function montar(itens) {
  const pj = {
    id: PJ_ID, user_id: USER, nome: 'Aldren', sobrenome: null,
    raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
    inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens },
    estado_atual: {},
  };
  const fake = fakeSupabase({
    personagens: [pj],
    itens: CATALOGO,
    historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
    __authUserId: USER,
    __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  });
  globalThis.supabaseClient = fake;
  const r = render(
    <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />,
  );
  return { ...r, fake };
}

// O card só tem ícone; nestes testes o único item que não é recipiente é o
// que se quer guardar (o recipiente tem a barra .inv-cont-bar).
const card = (container) => Array.from(container.querySelectorAll('.inv-grid-wrap .inv-card'))
  .find((el) => !el.querySelector('.inv-cont-bar'));
const botao = (txt) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === txt);

async function guardar(container, item, destinoNome) {
  fireEvent.click(card(container));
  await waitFor(() => expect(botao('Armazenar')).toBeTruthy());
  expect(botao('Armazenar').disabled, 'Armazenar habilitado').toBe(false);
  fireEvent.click(botao('Armazenar'));
  const opcao = Array.from(document.querySelectorAll('.det-opt-card')).find((b) => b.textContent.includes(destinoNome));
  expect(opcao, `o recipiente vestido "${destinoNome}" aparece como opção`).toBeTruthy();
  fireEvent.click(opcao);
  fireEvent.click(botao('Confirmar'));
}

describe('armazenar em recipiente vestido', () => {
  it('Corda vai para o Alforge vestido na cintura', async () => {
    const { container } = montar([
      { instanceId: 'alf-1', slug: 'alforge', quantidade: 1, vestido: true, vesteSlot: 'cintura', equipado: false, slot: null, containerId: null },
      { instanceId: 'cor-1', slug: 'corda', quantidade: 1, vestido: false, equipado: false, slot: null, containerId: null },
    ]);
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardar(container, 'Corda', 'Alforge');
    await waitFor(() => expect(screen.getByText('1 de 1')).toBeTruthy());
    expect(card(container)).toBeFalsy();
  });

  it('Flecha (Consumível) vai para a Aljava vestida', async () => {
    const { container } = montar([
      { instanceId: 'alj-1', slug: 'aljava', quantidade: 1, vestido: true, vesteSlot: 'cintura', equipado: false, slot: null, containerId: null },
      { instanceId: 'fle-1', slug: 'flecha', quantidade: 1, vestido: false, equipado: false, slot: null, containerId: null },
    ]);
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardar(container, 'Flecha', 'Aljava');
    await waitFor(() => expect(screen.getByText('1 de 1')).toBeTruthy());
  });
});

/* "Moedas não podem ser inseridas em cantil, pois é sólido." (13/09/2026)
   Inventário do Aldren: Cantil (líquido), Algibeira e Alforge vestidos. */
describe('moeda não vai para recipiente de líquido', () => {
  const CAT_MOEDA = [
    ...CATALOGO,
    { slug: 'cantil', nome: 'Cantil', grupo: 'Recipientes', tipo: 'L', tipo_item: 'Consumíveis', armazena: 2, ocupa: null },
    { slug: 'algibeira', nome: 'Algibeira', grupo: 'Vestimentas', tipo: 'S', tipo_item: 'Moedas', armazena: 2, ocupa: null, slot_equip: 'cintura' },
    { slug: 'moeda_ouro', nome: 'Moeda de Ouro', grupo: 'Moedas', tipo: 'S', ocupa: 0.1 },
  ];
  it('Armazenar a moeda oferece Algibeira e Alforge, nunca o Cantil', async () => {
    const pj = {
      id: PJ_ID, user_id: USER, nome: 'Aldren', raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
      inventario: { itens: [
        { instanceId: 'can-1', slug: 'cantil', quantidade: 1, containerId: null },
        { instanceId: 'alg-1', slug: 'algibeira', quantidade: 1, vestido: true, vesteSlot: 'cintura', containerId: null },
        { instanceId: 'alf-1', slug: 'alforge', quantidade: 1, vestido: true, vesteSlot: 'cintura', containerId: null },
        { instanceId: 'mo-1', slug: 'moeda_ouro', quantidade: 1, containerId: null },
      ] },
      estado_atual: {},
    };
    globalThis.supabaseClient = fakeSupabase({
      personagens: [pj], itens: CAT_MOEDA, historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
      __authUserId: USER, __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
    });
    const { container } = render(<InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID} maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />);
    await waitFor(() => expect(card(container)).toBeTruthy());
    fireEvent.click(card(container));
    await waitFor(() => expect(botao('Armazenar')).toBeTruthy());
    fireEvent.click(botao('Armazenar'));
    const nomes = Array.from(document.querySelectorAll('.det-opt-card')).map((b) => b.textContent);
    expect(nomes.some((n) => n.includes('Cantil'))).toBe(false);
    expect(nomes.some((n) => n.includes('Algibeira'))).toBe(true);
  });
});
