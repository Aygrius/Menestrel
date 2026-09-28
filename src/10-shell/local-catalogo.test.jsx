/* ============================================================
   local-catalogo.test.jsx — o local da mesa escolhido do catálogo
   ============================================================
   "No input de selecionar o local, na história, eu quero um dropdown menu
    com os lugares do catálogo." e, logo depois, "Eu criei vários reinos e
    cidades, mas eles não aparecem no seletor de localização da mesa no topo."
   (usuário, 26/09/2026)

   27/09/2026: "No seletor de localização, no topo da página, ainda não está
   buscando todos os lugares do catálogo. Não precisa de botão de
   salvar/cancelar, ao selecionar já mudará o local." A lista passa a ser o
   mundo + TODAS as aventuras deste Mestre, e escolher grava na hora.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let Card;
beforeAll(() => { Card = window.CardDataJogoAtual; });
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const BASE = { dia: 11, mes: 11, ano: 1500, local: 'Farzelo' };

/* `mundo.reinos` / `mundo.cidades`: as linhas das tabelas; `filtros` guarda o
   .or() pedido (o dono das aventuras); `updates`, o que foi gravado. */
function montar(mundo) {
  const filtros = []; const updates = [];
  const tabela = (nome) => ({
    select: () => ({
      eq: (col) => (nome === 'historias' && col === 'mestre_id'
        ? Promise.resolve({ data: [{ id: 24 }, { id: 13 }], error: null })
        : { maybeSingle: async () => ({ data: { data_jogo_atual: BASE, protagonista_ids: [], estoque_loja: [] }, error: null }) }),
      in: async () => ({ data: [], error: null }),
      or: async (f) => { filtros.push([nome, f]); return { data: mundo[nome] || [], error: null }; },
    }),
    update: (v) => ({ eq: async () => { updates.push(v); return { error: null }; } }),
  });
  globalThis.supabaseClient = {
    auth: { getUser: async () => ({ data: { user: { id: 'mestre-1' } } }) },
    from: tabela,
    rpc: async () => ({ data: { ok: true }, error: null }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
  };
  render(<Card lang="pt" historiaId={24} podeEditar profile="master" />);
  return { filtros, updates };
}

const abrirLocal = () => act(() => { document.querySelector('.cdj-local').closest('button').click(); });
const abrirLista = async () => {
  await waitFor(() => expect(document.querySelector('.cdj-local-select .select-pill-btn')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('.cdj-local-select').textContent).not.toMatch(/Carregando/));
  act(() => { document.querySelector('.cdj-local-select .select-pill-btn').click(); });
  return waitFor(() => {
    const li = [...document.querySelectorAll('.select-pill-drop-portal [role="option"]')];
    expect(li.length).toBeGreaterThan(0);
    return li;
  });
};

describe('o local da mesa vem do catálogo inteiro do Mestre', () => {
  it('mundo + todas as aventuras dele; a cidade com o reino ao lado; sem os modelos', async () => {
    const { filtros } = montar({
      reinos: [
        { slug: 'verrogar', nome: 'Verrogar', historia_id: null },
        { slug: 'novo-reino', nome: 'Novo reino', historia_id: null },
        { slug: 'eredra-h24', nome: 'Eredra', historia_id: 24 },
        { slug: 'portis-h13', nome: 'Portis', historia_id: 13 },
      ],
      cidades: [{ slug: 'brann', nome: 'Brann', reino: 'verrogar', historia_id: null }],
    });
    await waitFor(() => expect(document.querySelector('.cdj-local')).toBeTruthy());
    abrirLocal();
    const txt = (await abrirLista()).map((o) => o.textContent.trim()).join('|');
    expect(txt).toContain('Verrogar');
    expect(txt).toContain('Brann — Verrogar');
    expect(txt).toContain('Eredra');
    expect(txt).toContain('Portis');           // de OUTRA aventura do mesmo Mestre
    expect(txt).not.toContain('Novo reino');   // o modelo não é lugar
    // Só o mundo e as aventuras DESTE Mestre.
    expect(filtros.find(([t]) => t === 'reinos')[1]).toBe('historia_id.is.null,historia_id.in.(24,13)');
  });

  it('sem Salvar/Cancelar: escolher o lugar já grava', async () => {
    const { updates } = montar({ reinos: [{ slug: 'portis', nome: 'Portis', historia_id: 24 }], cidades: [] });
    await waitFor(() => expect(document.querySelector('.cdj-local')).toBeTruthy());
    abrirLocal();
    const itens = await abrirLista();
    expect(document.querySelector('.cdj-pill-btn-salvar')).toBeNull();
    act(() => { itens.find((o) => o.textContent.includes('Portis')).click(); });
    await waitFor(() => expect(updates.length).toBe(1));
    expect(updates[0].data_jogo_atual.local).toBe('Portis');
    expect(updates[0].data_jogo_atual.dia).toBe(11);   // a data fica como estava
  });
});
