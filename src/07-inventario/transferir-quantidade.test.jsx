/* ============================================================
   transferir-quantidade.test.jsx — quantidade na transferência
   ============================================================
   Pedidos do usuário: "Bússola e alguns itens ao transferir, eu não consigo
   selecionar a quantidade." e, em 12/09/2026, "Na hora de transferir o item,
   primeiro selecionar o aliado, depois escolher a quantidade, modal
   diferente. Padronize o seletor de quantidade."

   O fluxo, travado aqui:
     1. pilha de 1 unidade → escolhe o aliado, confirma, transfere direto;
        a RPC recebe p_quantidade: null;
     2. pilha de N>1 → escolhe o aliado, confirma, e AÍ abre a janela padrão
        de quantidade (QuantidadeModal); a RPC recebe o valor escolhido;
     3. cancelar a janela de quantidade não chama a RPC nem trava "Enviando…";
     4. a janela de quantidade é a MESMA de descartar — só o aviso muda:
        descartar é irreversível, transferir não.

   A RPC transfer_item (banco) só transfere entre personagens da mesma
   aventura desde 12/09/2026 — aqui cobre-se só o lado do cliente.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// DetalhesItemModal e QuantidadeModal renderizam dentro de ModalShell
// (10-shell/shell.jsx), que só existe como window global se alguém o carregar.
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

let InventarioList;
beforeAll(() => {
  InventarioList = window.InventarioList;
  expect(InventarioList, 'InventarioList precisa estar no window').toBeDefined();
});

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const USER = 'user-1';
const PJ_ID = 64;
const PJ_DESTINO_ID = 65;

// grupo 'Consumíveis' é ACUMULÁVEL — uma pilha solta com quantidade > 1
// continua sendo UMA instância/card só.
const CATALOGO = [
  { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', ocupa: 1 },
];

function montar(quantidade, chamadasRpc) {
  const pj = {
    id: PJ_ID, user_id: USER, nome: 'Yuldrous', sobrenome: null,
    raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
    inventario: {
      moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 },
      itens: [{ instanceId: 'corda-1', slug: 'pocao', quantidade, equipado: false, slot: null, vestido: false, containerId: null }],
    },
    estado_atual: {},
  };
  globalThis.supabaseClient = fakeSupabase({
    personagens: [pj],
    itens: CATALOGO,
    historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
    __authUserId: USER,
    __rpc: {
      get_pjs_historia: [{ id: PJ_DESTINO_ID, nome: 'Ana', sobrenome: null, raca: 'Elfo', profissao: 'Ladina', foto_url: 'https://x/ana.png' }],
      get_loja_pj: { ok: true, historia_titulo: 'Mesa' },
      transfer_item: (args) => { chamadasRpc.push(args); return { ok: true, quantidade: args.p_quantidade ?? quantidade }; },
    },
  });
  return render(
    <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />
  );
}

async function abrirPocao(container) {
  await waitFor(() => expect(container.querySelector('.inv-card')).toBeTruthy());
  fireEvent.click(container.querySelector('.inv-card'));
  await screen.findByText('Poção');
}

// Abre a janela da Poção, entra na transferência, escolhe a Ana e confirma.
async function iniciarTransferencia(container) {
  await abrirPocao(container);
  expect(document.querySelector('.det-sec-a')).toBeTruthy();
  fireEvent.click(screen.getByText('Transferir'));
  // Na transferência a janela fica só com os destinatários.
  expect(document.querySelector('.det-sec-a')).toBeNull();
  expect(document.querySelector('.det-sec-b')).toBeNull();
  const card = await screen.findByRole('radio', { name: /Ana/ });
  expect(card.querySelector('img.det-opt-foto').getAttribute('src')).toBe('https://x/ana.png');
  fireEvent.click(card);
  expect(card.getAttribute('aria-checked')).toBe('true');
  // Primeiro o aliado; a quantidade ainda não foi perguntada.
  expect(screen.queryByText('Transferir Poção')).toBeFalsy();
  fireEvent.click(screen.getByText('Confirmar'));
}

describe('transferir: primeiro o aliado, depois a quantidade', () => {
  it('pilha de 1 unidade transfere direto, sem janela de quantidade (p_quantidade: null)', async () => {
    const chamadasRpc = [];
    const { container } = montar(1, chamadasRpc);
    await iniciarTransferencia(container);

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(chamadasRpc[0].p_quantidade).toBe(null);
    expect(screen.queryByText('Transferir Poção')).toBeFalsy();
  });

  it('pilha de N>1 abre a janela padrão de quantidade e repassa a escolha', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await iniciarTransferencia(container);

    await screen.findByText('Transferir Poção');
    // Transferir tem volta: nada de "irreversível".
    expect(screen.queryByText(/irreversível/)).toBeFalsy();

    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(chamadasRpc[0].p_quantidade).toBe(2);
    expect(chamadasRpc[0].p_instance_id).toBe('corda-1');
    expect(chamadasRpc[0].p_to_pj_id).toBe(String(PJ_DESTINO_ID));
  });

  it('cancelar a janela de quantidade não deixa "Enviando…" travado', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await iniciarTransferencia(container);

    await screen.findByText('Transferir Poção');
    fireEvent.click(screen.getByText('Cancelar', { selector: '.ms-footer button' }));

    expect(chamadasRpc.length).toBe(0);
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeTruthy());
  });
});

describe('a janela de quantidade é a mesma de descartar', () => {
  it('descartar uma pilha abre a janela padrão, com o aviso de irreversível', async () => {
    const { container } = montar(5, []);
    await abrirPocao(container);
    fireEvent.click(screen.getByText('Descartar'));
    await screen.findByText('Destruir Poção');
    expect(screen.getByText(/irreversível/)).toBeTruthy();
  });
});
