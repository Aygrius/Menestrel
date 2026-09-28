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

// Abre a janela da Poção, entra na transferência, escolhe a Ana e confirma.
// `mais`: quantos cliques no + do seletor da própria janela (pilha).
async function iniciarTransferencia(container, mais = 0) {
  await abrirPocao(container);
  // Ícone ao lado do X desde 26/09/2026; o corpo com abas some na etapa.
  expect(document.querySelector('.best-detail')).toBeTruthy();
  fireEvent.click(document.querySelector('[data-acao="transferir"]'));
  // Na transferência a janela fica só com os destinatários.
  expect(document.querySelector('.best-secao--descricao')).toBeNull();
  expect(document.querySelector('.best-secao--lista')).toBeNull();
  for (let i = 0; i < mais; i++) fireEvent.click(document.querySelector('.ms-footer-center .fp-pop-stepper [aria-label="+"]'));
  const card = await screen.findByRole('radio', { name: /Ana/ });
  expect(card.querySelector('img.det-opt-foto').getAttribute('src')).toBe('https://x/ana.png');
  fireEvent.click(card);
  expect(card.getAttribute('aria-checked')).toBe('true');
  // Primeiro o aliado; a quantidade ainda não foi perguntada.
  expect(screen.queryByText('Transferir Poção')).toBeFalsy();
  // Transferir no rodapé confirma (27/09/2026); o card só marca.
  fireEvent.click(document.querySelector('.ms-footer [data-confirmar="transferir"]'));
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

  /* 27/09/2026: "O seletor de quantidade deve aparecer no modal de selecionar
     alvo." — a pilha escolhe quantos NA etapa de transferir; sem a segunda
     janela ("Transferir Poção"). */
  it('pilha de N>1: o seletor fica na etapa e a escolha vai direto', async () => {
    const chamadasRpc = [];
    const { container } = montar(5, chamadasRpc);
    await iniciarTransferencia(container, 1);

    await waitFor(() => expect(chamadasRpc.length).toBe(1));
    expect(screen.queryByText('Transferir Poção')).toBeFalsy();
    expect(chamadasRpc[0].p_quantidade).toBe(2);
    expect(chamadasRpc[0].p_instance_id).toBe('corda-1');
    expect(chamadasRpc[0].p_to_pj_id).toBe(String(PJ_DESTINO_ID));
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
