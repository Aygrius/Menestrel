/* ============================================================
   itens-equipados-visiveis.test.jsx — equipados/vestidos na bolsa
   ============================================================
   Bug relatado pelo usuário: itens equipados (arma na mão, escudo — it.slot)
   e vestidos (roupa/armadura — it.vestido) eram filtrados PARA FORA da lista
   principal do Inventário (InvItemsTable). Existiam seções separadas
   (EquipadoBoard/VestesBoard) só que NENHUMA das duas é renderizada por
   InventarioList — não há duplicação na tela, o item simplesmente sumia.

   O usuário pediu: mostrar equipados E vestidos na MESMA lista da bolsa,
   marcados visualmente (pill no card, mesmo glifo ti-shield/ti-shirt que
   EquipadoBoard/VestesBoard já usam) pra não confundir com item solto.
   Item DENTRO de container continua de fora — tem tela própria
   (ContainerModal).

   Renderiza InventarioList de verdade (mesmo padrão de
   11-ficha/estado-handoff-runtime.test.jsx), com supabase falso.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../07-inventario/inventario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

// InvItemsTable lê `Input` de `window.UI` (ponte real em
// components/ui-bridge.ts, que importa o kit shadcn via alias "@/..." não
// resolvido neste vitest.config). Como o alias não está configurado pro
// runner de teste, stubamos só o suficiente pro grid renderizar — mesmo
// espírito do stub de supabaseClient em setup-fases.ts: isola o que não é
// o alvo do teste (o kit de UI) sem tocar config de build.
window.UI = { ...window.UI, Input: (props) => <input {...props} /> };

// jsdom não implementa ResizeObserver — useGridDimensions (InvItemsTable) só
// entra em jogo quando há itens (grid com conteúdo real), o que nenhum teste
// anterior exercitava. Stub mínimo, só pra não explodir o callback ref.
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

// grupo 'Consumíveis' é ACUMULÁVEL (normalizarPilhas): uma pilha solta com
// quantidade > 1 continua sendo UM card só. Grupos não-acumuláveis (armas,
// vestimentas, ...) explodem pilha>1 em instâncias separadas — não é o que
// este teste quer medir, por isso a "flecha" solta usa um grupo acumulável.
const CATALOGO = [
  { slug: 'agua', nome: 'Água', grupo: 'Consumíveis' },
  { slug: 'espada-curta', nome: 'Espada Curta', grupo: 'Armas' },
  { slug: 'gibao-couro', nome: 'Gibão de Couro', grupo: 'Roupas', slot_equip: 'peito' },
  { slug: 'saco', nome: 'Saco', grupo: 'Recipientes', armazena: 20, tipo: 'S' },
];

// 4 instâncias: solta (visível), equipada na mão (visível+pill eq), vestida
// (visível+pill vst), e uma dentro de container (continua invisível aqui).
const ITENS = [
  { instanceId: 'solta-1', slug: 'agua', quantidade: 5, equipado: false, slot: null, vestido: false, containerId: null },
  { instanceId: 'eq-1', slug: 'espada-curta', quantidade: 1, equipado: true, slot: 'mao_d', vestido: false, containerId: null },
  { instanceId: 'vest-1', slug: 'gibao-couro', quantidade: 1, equipado: false, slot: null, vestido: true, vesteSlot: 'peito', containerId: null },
  { instanceId: 'guardada-1', slug: 'agua', quantidade: 3, equipado: false, slot: null, vestido: false, containerId: 'saco-1' },
];

function montar() {
  const pj = {
    id: PJ_ID, user_id: USER, nome: 'Yuldrous', sobrenome: null,
    raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
    inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: ITENS },
    estado_atual: {},
  };
  globalThis.supabaseClient = fakeSupabase({
    personagens: [pj],
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

describe('itens equipados/vestidos aparecem na lista principal do inventário', () => {
  it('mostra os 3 itens fora de container — soltos, equipado e vestido juntos', async () => {
    const { container } = montar();
    // "3 de 3": a contagem do toolbar só bate se equipado e vestido entraram
    // em itensVisiveis junto com o item solto.
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeTruthy());
    const cards = container.querySelectorAll('.inv-grid-wrap .inv-card');
    expect(cards.length).toBe(3);
  });

  it('o item dentro do container NÃO aparece na lista principal', async () => {
    const { container } = montar();
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeTruthy());
    // O container "saco-1" nem existe como item próprio no inventário deste
    // teste — o ponto é só confirmar que a instância com containerId setado
    // não conta pros 3 cards visíveis (já coberto acima) nem aparece batida
    // por engano num 4º card.
    const cards = container.querySelectorAll('.inv-grid-wrap .inv-card');
    expect(cards.length).toBe(3);
  });

  it('o item equipado (it.slot) leva o pill "eq" (ti-shield)', async () => {
    const { container } = montar();
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeTruthy());
    const pills = container.querySelectorAll('.inv-card .inv-pill.eq');
    expect(pills.length).toBe(1);
  });

  it('o item vestido (it.vestido) leva o pill "vst" (ti-shirt)', async () => {
    const { container } = montar();
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeTruthy());
    const pills = container.querySelectorAll('.inv-card .inv-pill.vst');
    expect(pills.length).toBe(1);
  });

  it('o item solto na mochila não leva pill eq nem vst', async () => {
    const { container } = montar();
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeTruthy());
    // Card sem equipar/vestir: nenhum dos dois pills.
    const semPill = Array.from(container.querySelectorAll('.inv-grid-wrap .inv-card'))
      .filter((el) => !el.querySelector('.inv-pill.eq') && !el.querySelector('.inv-pill.vst'));
    expect(semPill.length).toBe(1);
  });
});
