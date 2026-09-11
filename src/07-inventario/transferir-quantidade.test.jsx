/* ============================================================
   transferir-quantidade.test.jsx — QuantidadeModal na transferência
   ============================================================
   Pedido do usuário: "Bússola e alguns itens ao transferir, eu não consigo
   selecionar a quantidade." Transferir NUNCA ofereceu seletor — sempre moveu
   a instância inteira. Usar/destruir/mover já perguntam quantidade (via
   QuantidadeModal) quando a pilha tem mais de 1 unidade; transferir passou a
   seguir o MESMO padrão.

   A RPC transfer_item (banco, fora do escopo deste arquivo) ganhou
   p_quantidade (bigint, DEFAULT NULL = "tudo", limitado ao disponível). Este
   teste cobre só o lado do cliente:

     1. pilha de 1 unidade → transfere direto, SEM abrir QuantidadeModal,
        e a RPC recebe p_quantidade: null (comportamento antigo intacto).
     2. pilha de N>1 unidades → abre QuantidadeModal (empilhado sobre o
        DetalhesItemModal, mesmo padrão de "mover"); ao confirmar uma
        quantidade, a RPC recebe p_quantidade com o valor escolhido.

   Renderiza InventarioList de verdade, mesmo padrão de
   itens-equipados-visiveis.test.jsx (supabase falso via fake-supabase.js).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// DetalhesItemModal (e o QuantidadeModal que ele abre) renderizam dentro de
// ModalShell (10-shell/shell.jsx), que só existe como window global se
// alguém o carregar — mesmo padrão de catalogo-editor.test.jsx.
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

// Mesmos stubs de itens-equipados-visiveis.test.jsx: InvItemsTable precisa
// de window.UI.Input e de ResizeObserver pra montar o grid sem explodir.
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

// grupo 'Consumíveis' é ACUMULÁVEL (normalizarPilhas, GRUPOS_ACUMULAVEIS) —
// uma pilha solta com quantidade > 1 continua sendo UMA instância/card só.
// Grupo não-acumulável (ex. 'Ferramentas') explode pilha>1 em N instâncias
// separadas de quantidade 1 — o oposto do que este teste precisa simular.
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
      get_pjs_historia: [{ id: PJ_DESTINO_ID, nome: 'Ana', sobrenome: null, raca: 'Elfo', profissao: 'Ladina' }],
      get_loja_pj: { ok: true, historia_titulo: 'Mesa' },
      // Captura os args de cada chamada pra afirmar o p_quantidade recebido.
      transfer_item: (args) => { chamadasRpc.push(args); return { ok: true, quantidade: args.p_quantidade ?? quantidade }; },
    },
  });
  return render(
    <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />
  );
}

// Abre o DetalhesItemModal da "Poção" e entra no fluxo de transferência
// (botão "Transferir" → seleciona o PJ destino → clica "Confirmar").
async function iniciarTransferencia(container) {
  await waitFor(() => expect(container.querySelector('.inv-card')).toBeTruthy());
  fireEvent.click(container.querySelector('.inv-card'));
  const modalDetalhes = await screen.findByText('Poção');
  fireEvent.click(screen.getByText('Transferir'));
  const select = await screen.findByRole('combobox');
  fireEvent.change(select, { target: { value: String(PJ_DESTINO_ID) } });
  // Só existe um botão "Confirmar" nesse ponto (o de dentro de det-transf) —
  // o modal de quantidade ainda não abriu.
  fireEvent.click(screen.getByText('Confirmar'));
  return modalDetalhes;
}

describe('transferir com quantidade', () => {
  it('pilha de 1 unidade transfere direto, sem abrir QuantidadeModal (p_quantidade: null)', async () => {
    const chamadasRpc = [];
    const { container } = montar(1, chamadasRpc);
    await iniciarTransferencia(container);

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(chamadasRpc[0].p_quantidade).toBe(null);
    // QuantidadeModal nunca chegou a abrir — item avulso não pergunta quantidade.
    expect(screen.queryByText('Transferir Poção')).toBeFalsy();
  });

  it('pilha de N>1 abre QuantidadeModal e repassa a quantidade escolhida como p_quantidade', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await iniciarTransferencia(container);

    // QuantidadeModal empilhado por cima — título "Transferir Poção" prova
    // que abriu (padrão "mover": não fecha o DetalhesItemModal por baixo).
    await screen.findByText('Transferir Poção');

    // Sobe pra 2 (chip preset "2") e confirma no modal de quantidade — nesse
    // ponto o "Confirmar" do det-transf já virou "Enviando…", então só existe
    // um "Confirmar" na tela (o do QuantidadeModal).
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(chamadasRpc[0].p_quantidade).toBe(2);
    expect(chamadasRpc[0].p_instance_id).toBe('corda-1');
    expect(chamadasRpc[0].p_to_pj_id).toBe(String(PJ_DESTINO_ID));
  });

  it('cancelar o QuantidadeModal não deixa "Enviando…" travado', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await iniciarTransferencia(container);

    await screen.findByText('Transferir Poção');
    fireEvent.click(screen.getByText('Cancelar', { selector: '.ms-footer button' }));

    // Nenhuma chamada à RPC — o usuário desistiu da quantidade.
    expect(chamadasRpc.length).toBe(0);
    // O botão original volta a dizer "Confirmar" (não fica preso em "Enviando…").
    await waitFor(() => expect(screen.getByText('Confirmar')).toBeTruthy());
  });
});
