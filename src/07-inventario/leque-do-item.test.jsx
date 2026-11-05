/* ============================================================
   leque-do-item.test.jsx — clicar num item abre o leque
   ============================================================
   "Você pode criar uma animação que ao clicar em um item, abre vários
   círculos ao redor do item com as opções do item" · "Ficou muito bom, pode
   aplicar." · "tem que funcionar sempre que clicar nos itens. Seja no
   inventário, na loja, na ficha." (usuário, 30/10/2026)

   O leque não recalcula as ações: é a DetalhesItemModal em modo leque. Aqui
   se trava o que o clique faz: abre bolhas (não a janela), Detalhes abre a
   janela, as que pedem escolha abrem a janela já na etapa, e o ângulo das
   bolhas cabe na tela.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';
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

let InventarioList;
beforeAll(() => { InventarioList = window.InventarioList; });
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; document.body.classList.remove('inv-leque-aberto'); });

const USER = 'user-1';
const PJ_ID = 64;
const CATALOGO = [{ slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', ocupa: 1 }];

function montar(quantidade) {
  globalThis.supabaseClient = fakeSupabase({
    personagens: [{
      id: PJ_ID, user_id: USER, nome: 'Yuldrous', raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
      inventario: {
        moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 },
        itens: [{ instanceId: 'p1', slug: 'pocao', quantidade, equipado: false, slot: null, vestido: false, containerId: null }],
      },
      estado_atual: {},
    }],
    itens: CATALOGO,
    historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
    __authUserId: USER,
    __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  });
  return render(
    <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />
  );
}

async function abrirLeque(container) {
  await waitFor(() => expect(container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy());
  fireEvent.click(container.querySelector('.inv-grid-wrap .inv-card'));
  await waitFor(() => expect(document.querySelector('.inv-leque-roda')).toBeTruthy());
}
const bolha = (chave) => document.querySelector(`[data-acao-leque="${chave}"]`);

describe('o leque do item', () => {
  it('o clique abre as bolhas, e não a janela', async () => {
    const { container } = montar(3);
    await abrirLeque(container);
    expect(screen.queryByText('Poção')).toBeNull();
    const chaves = [...document.querySelectorAll('.inv-leque-bolha')].map((b) => b.dataset.acaoLeque);
    expect(chaves[0]).toBe('detalhes');
    expect(chaves).toContain('usar');
    expect(chaves).toContain('descartar');
    // Descartar é a destrutiva: vai por último e pinta em brasa.
    expect(chaves[chaves.length - 1]).toBe('descartar');
    expect(bolha('descartar').classList.contains('is-perigo')).toBe(true);
    // A casa escolhida fica marcada.
    expect(container.querySelector('.inv-card--leque')).toBeTruthy();
  });

  it('Detalhes abre a janela de sempre', async () => {
    const { container } = montar(3);
    await abrirLeque(container);
    fireEvent.click(bolha('detalhes'));
    await screen.findByText('Poção');
    expect(document.querySelector('.inv-leque-roda')).toBeNull();
  });

  it('Descartar abre a janela já na etapa de descartar', async () => {
    const { container } = montar(3);
    await abrirLeque(container);
    fireEvent.click(bolha('descartar'));
    await screen.findByText('Poção');
    // A etapa põe o seletor de quantidade no rodapé — sem clicar em nada.
    await waitFor(() => expect(document.querySelector('.ms-footer-center .fp-pop-stepper')).toBeTruthy());
    expect(document.querySelector('.ms-footer-center .fp-pop-stepper').textContent).toMatch(/1\s*de 3/);
  });

  it('Esc fecha o leque sem abrir nada', async () => {
    const { container } = montar(3);
    await abrirLeque(container);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.inv-leque-roda')).toBeNull());
    expect(screen.queryByText('Poção')).toBeNull();
  });
});

describe('lequeAngulos', () => {
  const ang = (...a) => window.lequeAngulos(...a);

  it('com muitas ações, a roda inteira, começando no alto', () => {
    const a = ang(9, 500, 400, 1000, 800);
    expect(a).toHaveLength(9);
    expect(a[0]).toBe(-90);
  });

  it('com poucas, longe das bordas, o leque abre para cima', () => {
    const a = ang(3, 500, 400, 1000, 800);
    const meio = (a[0] + a[2]) / 2;
    expect(meio).toBe(-90);
  });

  it('colado na borda de cima, o leque vira para baixo e cabe na tela', () => {
    const a = ang(4, 500, 30, 1000, 800);
    for (const g of a) {
      const y = 30 + Math.sin(g * Math.PI / 180) * 68;
      expect(y).toBeGreaterThan(0);
    }
  });
});

/* A peça com Sagração é mágica (30/10/2026, usuário: "Itens alvos da magia
   sagração ou que tenham bônus +1, +3, etc também são mágicos
   automaticamente, remover o campo mágico remove o bônus."). */
describe('itemEhMagico', () => {
  const m = (...a) => window.itemEhMagico(...a);
  it('o catálogo decide o item comum', () => {
    expect(m({ magico: true }, {})).toBe(true);
    expect(m({ magico: false }, {})).toBe(false);
  });
  it('bônus de Sagração torna a peça mágica, e voltar a 0 tira', () => {
    expect(m({ magico: false }, { bonus: 3 })).toBe(true);
    expect(m({ magico: false }, { bonus: 0 })).toBe(false);
    expect(m({ magico: false }, {})).toBe(false);
  });
});

/* O BAÚ TEM 80 CASAS, FIXAS (30/10/2026, usuário: "O inventário do
   personagem deve ter 80 casas fixas no máximo"). */
describe('o baú', () => {
  it('a grade de fora tem 80 casas, nem mais nem menos', async () => {
    const { container } = montar(1);
    await waitFor(() => expect(container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy());
    expect(container.querySelectorAll('.inv-bag-grid--slots > [data-slot-idx]').length).toBe(80);
  });
});
