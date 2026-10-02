/* ============================================================
   flush-inventario.test.jsx — a última alteração não se perde
   ============================================================
   O inventário grava 450ms depois da última mudança. Sair da tela ou trocar
   de PJ antes disso cancela esse timer, e o flush tem de gravar o que ficou.

   Bug de 02/10/2026: o flush montava o update do supabase-js sem await nem
   .then — e a consulta só vai ao servidor quando alguém a consome. O flush
   nunca gravava nada. Trocar de PJ nem flush tinha.

   O fakeSupabase é preguiçoso como o cliente real, então um update "solto"
   aqui também não grava: é isso que este teste vigia.
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
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const USER = 'user-1';
const CATALOGO = [
  { slug: 'alforge', nome: 'Alforge', grupo: 'Vestimentas', tipo: 'S', tipo_item: null, armazena: 15, ocupa: null, slot_equip: 'cintura' },
  { slug: 'corda', nome: 'Corda', grupo: 'Itens', tipo: 'S', ocupa: 1 },
];
const itensIniciais = () => [
  { instanceId: 'alf-1', slug: 'alforge', quantidade: 1, vestido: true, vesteSlot: 'cintura', equipado: false, slot: null, containerId: null },
  { instanceId: 'cor-1', slug: 'corda', quantidade: 1, vestido: false, equipado: false, slot: null, containerId: null },
];
const novoPj = (id, nome, itens) => ({
  id, user_id: USER, nome, sobrenome: null, raca: 'Humano', profissao: 'Guerreiro',
  forca_base: 3, fisico_base: 3, created_at: `2026-01-0${id}`,
  inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens },
  estado_atual: {},
});

function montar(pjs, props, catalogo = CATALOGO) {
  const tabelas = {
    personagens: pjs, itens: catalogo,
    historias: [{ id: 9, protagonista_ids: pjs.map((p) => p.id) }],
    __authUserId: USER,
    __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  };
  globalThis.supabaseClient = fakeSupabase(tabelas);
  const r = render(<InventarioList ac={{}} lang="pt" currentUserId={USER}
    maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} {...props} />);
  return { ...r, tabelas };
}

const card = (container) => Array.from(container.querySelectorAll('.inv-grid-wrap .inv-card'))
  .find((el) => !el.querySelector('.inv-cont-bar'));
const botao = (txt) => Array.from(document.querySelectorAll('button'))
  .find((b) => b.textContent.trim() === txt || b.getAttribute('aria-label') === txt);

// Guarda a Corda no Alforge: uma alteração do inventário feita pela tela.
async function guardarCorda(container) {
  fireEvent.click(card(container));
  await waitFor(() => expect(botao('Armazenar')).toBeTruthy());
  fireEvent.click(botao('Armazenar'));
  const opcao = Array.from(document.querySelectorAll('.det-opt-card')).find((b) => b.textContent.includes('Alforge'));
  fireEvent.click(opcao);
  fireEvent.click(document.querySelector('.ms-footer [data-confirmar="armazenar"]'));
}
const cordaGravada = (tabelas, pjId) => {
  const pj = tabelas.personagens.find((p) => p.id === pjId);
  return pj.inventario.itens.find((it) => it.instanceId === 'cor-1');
};

/* Trava a PRIMEIRA escrita do inventário em voo (mesma técnica do teste do
   gravador): `comecou` resolve quando alguém consome o update; o banco só
   recebe a escrita depois de `liberar()`. Escritas de estado_atual passam. */
function travarPrimeiraEscritaDoInventario() {
  const fake = globalThis.supabaseClient;
  let liberar;
  const liberada = new Promise((r) => { liberar = r; });
  let sinalizar;
  const comecou = new Promise((r) => { sinalizar = r; });
  let travar = true;
  globalThis.supabaseClient = {
    ...fake,
    from: (nome) => {
      const tabela = fake.from(nome);
      if (nome !== 'personagens') return tabela;
      return {
        ...tabela,
        update: (campos) => {
          const b = tabela.update(campos);
          if (!travar || !('inventario' in campos)) return b;
          travar = false;
          const thenReal = b.then;
          b.then = (res, rej) => { sinalizar(); return liberada.then(() => thenReal(res, rej)); };
          return b;
        },
      };
    },
  };
  return { fake, comecou, liberar };
}

describe('flush do inventário', () => {
  it('sair da tela antes do debounce grava a alteração', async () => {
    const { container, tabelas, unmount } = montar([novoPj(1, 'Aldren', itensIniciais())], { pjIdFixo: 1 });
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardarCorda(container);
    await waitFor(() => expect(screen.getByText('1 de 1')).toBeTruthy());
    unmount();   // antes dos 450ms do autosave
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
  });

  it('trocar de PJ antes do debounce grava a alteração no PJ anterior', async () => {
    const { container, tabelas } = montar([
      novoPj(1, 'Aldren', itensIniciais()),
      novoPj(2, 'Brena', []),
    ]);
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardarCorda(container);
    await waitFor(() => expect(screen.getByText('1 de 1')).toBeTruthy());
    fireEvent.click(Array.from(document.querySelectorAll('.inv-pj-tab')).find((b) => b.textContent.includes('Brena')));
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    // E o PJ novo não recebe o inventário do anterior.
    await new Promise((r) => setTimeout(r, 600));
    expect(tabelas.personagens.find((p) => p.id === 2).inventario.itens).toEqual([]);
  });
});

describe('gravação em voo', () => {
  const cardAlforge = (container) => Array.from(container.querySelectorAll('.inv-grid-wrap .inv-card'))
    .find((el) => el.querySelector('.inv-cont-bar'));

  it('desfazer a mudança enquanto ela grava também chega ao banco', async () => {
    const pj = { ...novoPj(1, 'Aldren', itensIniciais()), inventario_versao: 0 };
    const { container, tabelas } = montar([pj], { pjIdFixo: 1 });
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    const trava = travarPrimeiraEscritaDoInventario();
    const alforge = () => tabelas.personagens[0].inventario.itens.find((x) => x.instanceId === 'alf-1');

    fireEvent.click(cardAlforge(container));
    await waitFor(() => expect(botao('Despir')).toBeTruthy());
    fireEvent.click(botao('Despir'));
    await trava.comecou;                       // o autosave mandou "despido" e está em voo
    await waitFor(() => expect(botao('Vestir')).toBeTruthy());
    fireEvent.click(botao('Vestir'));          // desfaz: a tela volta a ser a base antiga
    trava.liberar();

    // 1ª gravação (despido) e depois a do desfazer (vestido de novo).
    await waitFor(() => expect(tabelas.personagens[0].inventario_versao).toBe(2), { timeout: 2500 });
    expect(alforge().vestido).toBe(true);
  });
});

describe('mescla com o que mudou por fora', () => {
  const CAT_FLECHA = [...CATALOGO, { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 }];
  // Dentro do alforge: item solto é desmembrado pela normalização de pilhas;
  // consumível em armazenamento fica empilhado. Busca pelo slug, não pelo id.
  const flecha = (q) => ({ instanceId: 'fle-1', slug: 'flecha', quantidade: q, vestido: false, equipado: false, slot: null, containerId: 'alf-1' });
  const qtdFlecha = (itens) => itens.filter((x) => x.slug === 'flecha').reduce((s, x) => s + (Number(x.quantidade) || 0), 0);

  it('guardar a corda enquanto a batalha gasta uma flecha: as duas valem', async () => {
    const pj = { ...novoPj(1, 'Aldren', [...itensIniciais(), flecha(10)]), inventario_versao: 0 };
    const tabelas = {
      personagens: [pj], itens: CAT_FLECHA, historias: [{ id: 9, protagonista_ids: [1] }],
      __authUserId: USER, __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
    };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const vistos = [];
    const { container } = render(<InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={1}
      onInventarioChange={(i) => vistos.push(i)} maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />);
    await waitFor(() => expect(container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy());

    // A batalha gasta uma flecha direto no banco (versão sobe).
    const atual = tabelas.personagens[0].inventario;
    const pilha = atual.itens.find((x) => x.slug === 'flecha');
    const daBatalha = { ...atual, itens: atual.itens.map((x) => (x === pilha ? { ...x, quantidade: x.quantidade - 1 } : x)) };
    await globalThis.supabaseClient.from('personagens').update({ inventario: daBatalha }).eq('id', 1);

    await guardarCorda(container);
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    expect(qtdFlecha(tabelas.personagens[0].inventario.itens)).toBe(9);
    // E a tela passou a mostrar a flecha gasta (chega ao pai pelo onInventarioChange).
    await waitFor(() => expect(qtdFlecha(vistos[vistos.length - 1].itens)).toBe(9));
  });

  it('flush ao trocar de PJ: a mudança de fora aparece ao voltar (a flecha não volta)', async () => {
    const vistos = [];
    const { container, tabelas } = montar([
      { ...novoPj(1, 'Aldren', [...itensIniciais(), flecha(10)]), inventario_versao: 0 },
      novoPj(2, 'Brena', []),
    ], { onInventarioChange: (i) => vistos.push(i) }, CAT_FLECHA);
    await waitFor(() => expect(card(container)).toBeTruthy());
    const trava = travarPrimeiraEscritaDoInventario();
    const aba = (nome) => Array.from(document.querySelectorAll('.inv-pj-tab')).find((b) => b.textContent.includes(nome));

    await guardarCorda(container);
    fireEvent.click(aba('Brena'));             // antes do debounce: o flush grava o PJ 1...
    await trava.comecou;                       // ...e fica em voo

    // A batalha gasta uma flecha do PJ 1 enquanto o flush está em voo.
    const atual = tabelas.personagens[0].inventario;
    const daBatalha = { ...atual, itens: atual.itens.map((x) => (x.slug === 'flecha' ? { ...x, quantidade: x.quantidade - 1 } : x)) };
    await trava.fake.from('personagens').update({ inventario: daBatalha }).eq('id', 1);

    fireEvent.click(aba('Aldren'));            // volta ao PJ 1 com o flush ainda em voo
    // A corda está no alforge: o único card solto é o do próprio alforge.
    await waitFor(() => expect(container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy());
    trava.liberar();

    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    expect(qtdFlecha(tabelas.personagens[0].inventario.itens)).toBe(9);
    // A tela do PJ 1 passa a mostrar a flecha gasta por fora.
    await waitFor(() => expect(qtdFlecha(vistos[vistos.length - 1].itens)).toBe(9), { timeout: 2000 });
  });

  it('gravar sem mudança de fora não dispara uma segunda gravação', async () => {
    const pj = { ...novoPj(1, 'Aldren', itensIniciais()), inventario_versao: 0 };
    const { container, tabelas } = montar([pj], { pjIdFixo: 1 });
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardarCorda(container);
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    await new Promise((r) => { setTimeout(r, 1200); });
    expect(tabelas.personagens[0].inventario_versao).toBe(1);
  });
});
