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
import '../01-core/select-pill.jsx';
import '../07-inventario/inventario.jsx';
// O modal de item é o BestDetalheModal do bestiário desde 26/09/2026.
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
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

/* TRANSFERIR = ARRASTAR PARA O AMIGO (28/09/2026): "para transferir um item
   para um amigo, só precisa arrastar o item do inventário para o card do
   amigo, ao soltar, será perguntado a quantidade que será enviada. O botão
   transferir do modal do item pode sair, pois este será a única maneira."
   O card do amigo mora no AmigosFab (11-ficha); aqui ele é um elemento com
   data-amigo-pj-id, e elementFromPoint aponta para ele. */
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class extends MouseEvent {
    constructor(tipo, init = {}) { super(tipo, init); this.pointerId = init.pointerId ?? 1; }
  };
}

function cardDoAmigo() {
  const el = document.createElement('div');
  el.setAttribute('data-amigo-pj-id', String(PJ_DESTINO_ID));
  document.body.appendChild(el);
  return el;
}

async function arrastarParaAmigo(container, amigo) {
  await waitFor(() => expect(container.querySelector('.inv-card')).toBeTruthy());
  const card = container.querySelector('.inv-card');
  const original = document.elementFromPoint;
  document.elementFromPoint = (x) => (x > 300 ? amigo : card);
  fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(card, { clientX: 40, clientY: 40 });
  fireEvent.pointerMove(window, { clientX: 400, clientY: 40 });
  expect(amigo.classList.contains('is-alvo')).toBe(true);
  fireEvent.pointerUp(window, { clientX: 400, clientY: 40 });
  document.elementFromPoint = original;
  expect(amigo.classList.contains('is-alvo')).toBe(false);
}

describe('transferir: arrastar o item até o card do amigo', () => {
  afterEach(() => document.querySelectorAll('[data-amigo-pj-id]').forEach((el) => el.remove()));

  it('o modal do item não tem mais o botão Transferir', async () => {
    const { container } = montar(5, []);
    await abrirPocao(container);
    expect(document.querySelector('[data-acao="transferir"]')).toBeNull();
  });

  it('soltar no amigo pergunta a quantidade e envia o escolhido', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await arrastarParaAmigo(container, cardDoAmigo());

    await screen.findByText('Enviar Poção para Ana');
    expect(chamadasRpc).toHaveLength(0);
    fireEvent.click(document.querySelector('.fp-pop-stepper [aria-label="+"]'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(chamadasRpc[0].p_quantidade).toBe(2);
    expect(chamadasRpc[0].p_instance_id).toBe('corda-1');
    expect(Number(chamadasRpc[0].p_to_pj_id)).toBe(PJ_DESTINO_ID);
    await waitFor(() => expect(screen.queryByText('Enviar Poção para Ana')).toBeFalsy());
  });

  it('item único também pergunta — é a confirmação do soltar', async () => {
    const chamadasRpc = [];
    const { container } = montar(1, chamadasRpc);
    await arrastarParaAmigo(container, cardDoAmigo());
    await screen.findByText('Enviar Poção para Ana');
    fireEvent.click(screen.getByText('Cancelar'));
    expect(chamadasRpc).toHaveLength(0);
  });
});

describe('descartar uma pilha também escolhe quantos na própria janela', () => {
  it('o seletor na etapa; nenhuma segunda janela', async () => {
    const { container } = montar(5, []);
    await abrirPocao(container);
    fireEvent.click(document.querySelector('[data-acao="descartar"]'));
    expect(document.querySelector('.ms-footer-center .fp-pop-stepper').textContent).toMatch(/1\s*de 5/);
    expect(screen.queryByText('Destruir Poção')).toBeFalsy();
  });
});
