/* ============================================================
   loja-resgate.test.jsx — as moedas de uma venda esperam o resgate
   ============================================================
   "Quando o item for vendido, o dinheiro fica pendente de ser resgatado pelo
    jogador que o vendeu." (usuário, 02/10/2026). Decisão do usuário: o
   resgate fica na própria loja — aviso no topo + botão Resgatar.
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
import './inventario.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './loja.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
let Loja;
beforeAll(() => { Loja = window.LojaJogador; });
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

function montar(pendente, resgate) {
  const tabelas = {
    personagens: [{ id: 1, user_id: 'u1', nome: 'Aldren', inventario: { itens: [] }, vendas_a_resgatar: pendente }],
    itens: [], anuncios_loja: [], historias: [{ id: 9, protagonista_ids: [1] }],
    __rpc: {
      get_loja_pj: { ok: true, historia_id: 9, historia_titulo: 'Mesa', estoque: [] },
      // Como no banco: só um resgate que deu certo mexe no pendente.
      resgatar_vendas: () => { const r = resgate(); if (r.ok) tabelas.personagens[0].vendas_a_resgatar = r.restante ?? 0; return r; },
    },
  };
  globalThis.supabaseClient = fakeSupabase(tabelas);
  render(<div className="menestrel-ui"><Loja ac={{}} lang="pt" currentUserId="u1" pjIdFixo={1} /></div>);
  return tabelas;
}

describe('vendas a resgatar na loja', () => {
  it('sem nada pendente, não há aviso', async () => {
    montar(0, () => ({ ok: true, resgatado: 0, restante: 0 }));
    await waitFor(() => expect(document.querySelector('.loja')).toBeTruthy());
    expect(document.querySelector('.loja-resgate')).toBeNull();
  });

  it('com valor pendente: aviso, Resgatar, e o aviso some depois', async () => {
    montar(25, () => ({ ok: true, resgatado: 25, restante: 0 }));
    await waitFor(() => expect(document.querySelector('.loja-resgate')).toBeTruthy());
    expect(document.querySelector('.loja-resgate').textContent).toMatch(/em vendas para resgatar/);
    fireEvent.click(document.querySelector('[data-resgatar]'));
    await waitFor(() => expect(document.querySelector('.loja-resgate')).toBeNull());
    expect(document.querySelector('.loja-feedback').textContent).toMatch(/Você resgatou/);
  });

  it('bolsa sem espaço: o aviso fica e diz o motivo', async () => {
    montar(25, () => ({ ok: false, motivo: 'sem_espaco_moedas' }));
    await waitFor(() => expect(document.querySelector('[data-resgatar]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-resgatar]'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/espaço numa bolsa/));
    expect(document.querySelector('.loja-resgate')).toBeTruthy();
  });
});
