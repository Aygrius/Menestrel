/* ============================================================
   estado-handoff-runtime.test.jsx — handoff de estado, DE VERDADE
   ============================================================
   Par comportamental de estado-handoff.test.js, que só verifica a FIAÇÃO no
   texto-fonte (que a Ficha passa `onEstadoChange`/`estadoAtualSeed`). Aquilo
   pega alguém removendo a prop; NÃO prova que o componente faz algo com ela.

   Aqui o InventarioList é renderizado de verdade, com um supabase falso, e o
   que se observa é o comportamento:

     • a semente do pai VENCE a linha do banco (é o que fecha a corrida de
       trocar pra aba Inventário dentro dos 400ms do debounce da Ficha);
     • a semente só vale pro PJ FIXO — sem pjIdFixo o componente roda com
       seletor de vários PJs e a semente seria do personagem errado;
     • o pai é avisado pelo callback, que é o que impede a cópia da Ficha de
       congelar e apagar o efeito depois.

   Não precisa de interação: o efeito de estado dispara logo após a semeadura,
   então `onEstadoChange` já entrega o valor semeado.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../07-inventario/inventario.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let InventarioList;
beforeAll(() => {
  InventarioList = window.InventarioList;
  expect(InventarioList, 'InventarioList precisa estar no window').toBeDefined();
});

const stubOriginal = globalThis.supabaseClient;
// cleanup() ANTES de devolver o stub: desmontar dispara o flush-on-unmount do
// InventarioList, que grava o inventário/estado pendente. Com o stub original
// já no lugar, esse flush estoura ("não deve tocar rede") num ponto que o
// teste nem controla.
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const USER = 'user-1';
const PJ_ID = 64;

// estado_atual que está NO BANCO — propositalmente diferente da semente.
const NO_BANCO = { condicoes: { hidratacao: 7, animo: -3 }, vitalidade: { ef: 5 } };
// estado_atual que a Ficha tem em mãos (mais novo: ela atualiza otimista).
const NA_FICHA = { condicoes: { hidratacao: 42, animo: -3 }, vitalidade: { ef: 5 } };

const pj = (over) => ({
  id: PJ_ID, user_id: USER, nome: 'Yuldrous', sobrenome: null,
  raca: 'Anão', profissao: 'Sacerdote', forca_base: 2, fisico_base: 2,
  inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [] },
  estado_atual: NO_BANCO,
  ...over,
});

function montar(props, pjs) {
  globalThis.supabaseClient = fakeSupabase({
    personagens: pjs || [pj()],
    itens: [],
    historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
    __authUserId: USER,
    __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  });
  return render(
    <InventarioList
      ac={{}} lang="pt" currentUserId={USER}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }}
      {...props}
    />
  );
}

describe('estadoAtualSeed — a semente do pai vence o banco', () => {
  it('com pjIdFixo, o estado usado é o da Ficha, não o da linha', async () => {
    const onEstadoChange = vi.fn();
    montar({ pjIdFixo: PJ_ID, estadoAtualSeed: NA_FICHA, onEstadoChange });
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());
    // 42 é o valor da Ficha; 7 é o da linha do banco.
    expect(onEstadoChange.mock.calls[0][0].condicoes.hidratacao).toBe(42);
  });

  it('sem semente, cai na linha do banco', async () => {
    const onEstadoChange = vi.fn();
    montar({ pjIdFixo: PJ_ID, onEstadoChange });
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());
    expect(onEstadoChange.mock.calls[0][0].condicoes.hidratacao).toBe(7);
  });

  it('SEM pjIdFixo a semente é ignorada — seria o PJ errado', async () => {
    // Rodando solto (seletor de vários PJs), a semente vinda de fora não tem
    // dono garantido. O componente tem que ler a linha.
    const onEstadoChange = vi.fn();
    montar({ estadoAtualSeed: NA_FICHA, onEstadoChange });
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());
    expect(onEstadoChange.mock.calls[0][0].condicoes.hidratacao).toBe(7);
  });
});

describe('onEstadoChange — o pai é realmente avisado', () => {
  it('o callback recebe o objeto de estado, com as condições dentro', async () => {
    const onEstadoChange = vi.fn();
    montar({ pjIdFixo: PJ_ID, estadoAtualSeed: NA_FICHA, onEstadoChange });
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());
    const arg = onEstadoChange.mock.calls[0][0];
    expect(arg).toHaveProperty('condicoes');
    expect(arg.condicoes.animo).toBe(-3);
  });

  it('ausência do callback não quebra o componente', async () => {
    const onInventarioChange = vi.fn();
    montar({ pjIdFixo: PJ_ID, estadoAtualSeed: NA_FICHA, onInventarioChange });
    // Se o componente explodisse sem onEstadoChange, o outro callback (que roda
    // no mesmo ciclo de efeitos) não chegaria a ser chamado.
    await waitFor(() => expect(onInventarioChange).toHaveBeenCalled());
  });
});

describe('colunas pedidas ao banco — o que o componente REALMENTE requisita', () => {
  /* Par comportamental de 07-inventario/refetch-pjs.test.js, que afirma sobre
     o texto-fonte ("existe PJ_COLS e todo select o usa"). Aqui o que se
     observa é a requisição de fato: se alguém trocar por uma lista literal
     mais curta, o texto-fonte pode continuar passando por um caminho novo,
     mas isto cai.

     O que estava em jogo: os refetches faziam setPjs(resultado) trocando o
     array inteiro, e vinham sem forca_base/fisico_base/estado_atual. Depois de
     uma transferência, calcCarga recebia undefined e a capacidade de carga
     desabava pra base. */
  const PRECISA = ['id', 'nome', 'raca', 'profissao', 'forca_base', 'fisico_base',
                   'inventario', 'estado_atual'];

  it('a carga de personagens traz tudo que a tela consome', async () => {
    const selects = [];
    globalThis.supabaseClient = fakeSupabase({
      personagens: [pj()], itens: [],
      historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
      __authUserId: USER, __selects: selects,
      __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true } },
    });
    const onEstadoChange = vi.fn();
    render(
      <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
        maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} onEstadoChange={onEstadoChange} />
    );
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());

    const deP = selects.filter((s) => s.tabela === 'personagens');
    expect(deP.length).toBeGreaterThan(0);
    for (const s of deP) {
      for (const col of PRECISA) {
        expect(String(s.colunas), `select de personagens sem ${col}: ${s.colunas}`).toContain(col);
      }
    }
  });

  it('o catálogo é lido por range — senão o corte de 1000 volta calado', async () => {
    // fetchTabelaPaginada usa .range(); um select cru não passaria por aqui.
    const selects = [];
    globalThis.supabaseClient = fakeSupabase({
      personagens: [pj()], itens: [{ slug: 'agua', nome: 'Água', grupo: 'Consumíveis' }],
      historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
      __authUserId: USER, __selects: selects,
      __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true } },
    });
    const onEstadoChange = vi.fn();
    render(
      <InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
        maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} onEstadoChange={onEstadoChange} />
    );
    await waitFor(() => expect(onEstadoChange).toHaveBeenCalled());
    const deItens = selects.filter((s) => s.tabela === 'itens');
    expect(deItens.length).toBeGreaterThan(0);
    // O ponto: TODA leitura do catálogo passou por .range(). Um `.select('*')`
    // cru é awaitable direto e nunca chamaria range — e voltaria a cortar em
    // 1000 linhas sem avisar.
    for (const s of deItens) {
      expect(s.usouRange, 'leitura de itens sem range (corte silencioso de 1000)').toBe(true);
    }
  });
});
