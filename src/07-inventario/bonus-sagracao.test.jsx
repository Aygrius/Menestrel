/* ============================================================
   bonus-sagracao.test.jsx — o bônus de Sagração mora no item
   ============================================================
   "A magia Sagração concede bônus a equipamentos de defesa e equipamentos de
    ataque, esse bônus é permanente. [...] preciso de uma forma do mestre
    alterar o bônus manualmente." (usuário, 15/09/2026)

   Decisões dele:
     1. arma                → soma no DANO
     2. escudo conta como defesa; armadura e escudo → soma na ABSORÇÃO
     3. valores             → 0, 1, 3, 5, 7 e 9 (o 1 veio numa correção)

   O bônus mora na INSTÂNCIA do inventário (it.bonus). O que existia antes,
   estado_atual.bonusArmas[slug], era por slug e só de arma.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let Modal;
beforeAll(() => {
  Modal = window.DetalhesItemModal;
  expect(Modal).toBeTypeOf('function');
});
afterEach(cleanup);

const ESPADA = { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas', categoria_equip: 'arma', slot_equip: 'maos', dano: 28, dano_l: -4, dano_m: 0, dano_p: 4, ajuste_atributo: 'FOR' };
const PEITORAL = { slug: 'peitoral_de_aco', nome: 'Peitoral de Aço', grupo: 'Armaduras', categoria_equip: 'armadura', slot_equip: 'peito', absorcao: 8, defesa: 3, tipo_armadura: 'P', resistencia: 8 };
const ESCUDO = { slug: 'escudo_broquel', nome: 'Escudo Broquel', grupo: 'Armaduras', categoria_equip: 'arma', slot_equip: 'maos', absorcao: 2, defesa: 1, resistencia: 2 };
const CORDA = { slug: 'corda', nome: 'Corda', grupo: 'Itens' };
const CAT = { espada_longa: ESPADA, peitoral_de_aco: PEITORAL, escudo_broquel: ESCUDO, corda: CORDA };

describe('as regras', () => {
  it('só 0, 1, 3, 5, 7 e 9 valem; o resto é 0', () => {
    expect([0, 1, 3, 5, 7, 9].map((b) => window.bonusDoItem({ bonus: b }))).toEqual([0, 1, 3, 5, 7, 9]);
    expect([2, 4, 6, 10, -3, 'x', undefined].map((b) => window.bonusDoItem({ bonus: b }))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('a escada sobe e desce 0 → 1 → 3 → 5 → 7 → 9, parando nas pontas', () => {
    expect(window.passoBonusItem(0, 1)).toBe(1);
    expect(window.passoBonusItem(1, 1)).toBe(3);
    expect(window.passoBonusItem(1, -1)).toBe(0);
    expect(window.passoBonusItem(3, 1)).toBe(5);
    expect(window.passoBonusItem(9, 1)).toBe(9);
    expect(window.passoBonusItem(5, -1)).toBe(3);
    expect(window.passoBonusItem(3, -1)).toBe(1);
    expect(window.passoBonusItem(0, -1)).toBe(0);
  });

  it('arma → dano; armadura e escudo → absorção; o resto não tem bônus', () => {
    expect(window.destinoBonusItem(ESPADA)).toBe('dano');
    expect(window.destinoBonusItem(PEITORAL)).toBe('absorcao');
    expect(window.destinoBonusItem(ESCUDO)).toBe('absorcao');
    expect(window.destinoBonusItem(CORDA)).toBeNull();
  });
});

describe('a conta: absorção na ficha, dano no ataque', () => {
  const pj = (itens) => ({
    raca: 'Humano', forca_base: 2, fisico_base: 2, agilidade_base: 1, percepcao_base: 1,
    intelecto_base: 1, aura_base: 1, carisma_base: 0, experiencia: 0,
    inventario: { itens },
  });

  it('armadura e escudo consagrados somam na Absorção', () => {
    const p = pj([
      { instanceId: 'a', slug: 'peitoral_de_aco', equipado: true, slot: 'peito', bonus: 5 },
      { instanceId: 'b', slug: 'escudo_broquel', equipado: true, slot: 'mao_e', bonus: 3 },
    ]);
    expect(window.calcArmadura(p, CAT)).toBe(8 + 5 + 2 + 3);
    expect(window.calcularFicha(p, CAT, {}).derivadas.absorcao).toBe(18);
  });

  it('arma consagrada NÃO mexe na absorção, e a peça na mochila não conta', () => {
    const p = pj([
      { instanceId: 'a', slug: 'espada_longa', equipado: true, slot: 'mao_d', bonus: 9 },
      { instanceId: 'b', slug: 'peitoral_de_aco', equipado: false, slot: null, bonus: 9 },
    ]);
    expect(window.calcArmadura(p, CAT)).toBe(0);
  });

  it('o ataque da arma leva o bônus da INSTÂNCIA — duas espadas, cada uma o seu', () => {
    const p = pj([
      { instanceId: 'a', slug: 'espada_longa', equipado: true, slot: 'mao_d', bonus: 7 },
      { instanceId: 'b', slug: 'espada_longa', equipado: true, slot: 'mao_e' },
    ]);
    const ataques = window.gerarAtaques(p, CAT, {}, { forca: 2 });
    expect(ataques.map((a) => [a.slot, a.dano, a.bonus])).toEqual([['mao_d', 28, 7], ['mao_e', 28, 0]]);
  });
});

describe('no inventário de verdade: o Mestre ajusta, o banco grava', () => {
  const USER = 'user-1';
  const PJ_ID = 64;
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  const montar = async (isMestre) => {
    const { fakeSupabase } = await import('../test/fake-supabase.js');
    window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
    const pjs = [{
      id: PJ_ID, user_id: USER, nome: 'Galadar', raca: 'Humano', profissao: 'Guerreiro', forca_base: 3, fisico_base: 3,
      inventario: { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [
        { instanceId: 'e1', slug: 'espada_longa', quantidade: 1, equipado: false, slot: null, containerId: null },
      ] },
      estado_atual: {},
    }];
    globalThis.supabaseClient = fakeSupabase({
      personagens: pjs, itens: Object.values(CAT), historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
      __authUserId: 'mestre-1', __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
    });
    const r = render(<window.InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
      maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} isMestre={isMestre} />);
    const card = await vi.waitFor(() => {
      const c = r.container.querySelector('.inv-grid-wrap .inv-card');
      expect(c).toBeTruthy();
      return c;
    });
    fireEvent.click(card);
    return pjs;
  };

  it('Mestre: + três vezes grava bonus 5 no item', async () => {
    const pjs = await montar(true);
    const mais = await vi.waitFor(() => {
      const b = document.querySelector('.det-bonus button[aria-label="Aumentar bônus"]');
      expect(b).toBeTruthy();
      return b;
    });
    fireEvent.click(mais);
    fireEvent.click(mais);
    fireEvent.click(mais);
    expect(document.querySelector('.det-bonus-val').textContent).toBe('+5');
    await vi.waitFor(() => expect(pjs[0].inventario.itens[0].bonus).toBe(5), { timeout: 2000 });
  });

  it('jogador: sem controle de Sagração', async () => {
    await montar(false);
    await vi.waitFor(() => expect(document.querySelector('.modal-detalhes')).toBeTruthy());
    expect(document.querySelector('.det-bonus')).toBeNull();
  });
});

describe('o modal do item', () => {
  const noop = () => {};
  const abrir = (cat, instance, extra) => render(
    <Modal
      instance={instance} catalogoBySlug={CAT} raca="Humano"
      slotsState={{}} todosItens={[instance]} containersDisponiveis={[]} pjsHistoria={[]}
      lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop}
      onDestruir={noop} onObservacao={noop} onMoverParaContainer={noop} onTransferir={noop}
      onTransferReset={noop} onVestir={noop} onDespir={noop} onRemoverDoContainer={noop}
      onAbrirDetalhesFilho={noop}
      {...extra}
    />,
  );
  const botao = (nome) => document.querySelector(`.det-bonus button[aria-label="${nome}"]`);

  it('o Mestre vê − / + e o valor; cada clique pede um passo da escada', () => {
    const onBonus = vi.fn();
    abrir(ESPADA, { instanceId: 'e1', slug: 'espada_longa', quantidade: 1, bonus: 3 }, { onBonus });
    const bloco = document.querySelector('.det-bonus');
    expect(bloco.textContent).toMatch(/Sagração/);
    expect(bloco.textContent).toMatch(/dano/);
    expect(bloco.querySelector('.det-bonus-val').textContent).toBe('+3');
    fireEvent.click(botao('Aumentar bônus'));
    fireEvent.click(botao('Reduzir bônus'));
    expect(onBonus.mock.calls).toEqual([['e1', 1], ['e1', -1]]);
  });

  it('nas pontas o botão fica desativado', () => {
    abrir(PEITORAL, { instanceId: 'p1', slug: 'peitoral_de_aco', quantidade: 1 }, { onBonus: noop });
    expect(document.querySelector('.det-bonus').textContent).toMatch(/absorção/);
    expect(botao('Reduzir bônus').disabled).toBe(true);
    cleanup();
    abrir(PEITORAL, { instanceId: 'p1', slug: 'peitoral_de_aco', quantidade: 1, bonus: 9 }, { onBonus: noop });
    expect(botao('Aumentar bônus').disabled).toBe(true);
  });

  it('o jogador vê o bônus e o título "+5", sem os botões', () => {
    abrir(ESCUDO, { instanceId: 's1', slug: 'escudo_broquel', quantidade: 1, bonus: 5 });
    expect(document.querySelector('.det-bonus-val').textContent).toBe('+5');
    expect(document.querySelector('.det-bonus button')).toBeNull();
    expect(document.body.textContent).toMatch(/Escudo Broquel \+5/);
  });

  it('item comum, para o jogador: nada de Sagração', () => {
    abrir(ESPADA, { instanceId: 'e1', slug: 'espada_longa', quantidade: 1 });
    expect(document.querySelector('.det-bonus')).toBeNull();
  });

  it('item que não é arma nem armadura: nem para o Mestre', () => {
    abrir(CORDA, { instanceId: 'c1', slug: 'corda', quantidade: 1 }, { onBonus: noop });
    expect(document.querySelector('.det-bonus')).toBeNull();
  });
});
