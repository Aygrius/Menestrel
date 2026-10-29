/* ============================================================
   dar-item.test.jsx — o Mestre entrega um item ao personagem
   ============================================================
   "Caso eu como mestre quiser dar um item para um personagem, como eu faço
    isso?" / "Quero uma opção de dar item." (usuário, 28/10/2026)

   Antes disto um item só entrava no inventário comprado na loja, saqueado na
   batalha ou transferido por outro personagem. O Mestre que quisesse dar uma
   recompensa tinha de pôr o item na loja com preço zero e esperar o
   personagem passar pela cidade.

   O que estes testes seguram:
     1. a ação é SÓ do Mestre — o jogador não a vê na própria mochila;
     2. entregar soma de verdade no inventário, pelo caminho de gravação de
        sempre (o gravador com trava de versão);
     3. a quantidade escolhida é a que entra;
     4. a mesa fica sabendo — recompensa dada em silêncio é recompensa que o
        jogador descobre dias depois, por acaso.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import '../07-inventario/inventario.jsx';

const ESPADA = { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas', ocupa: 1, valor_latao: 8000 };
const CORDA = { slug: 'corda', nome: 'Corda de Cânhamo', grupo: 'Equipamentos', ocupa: 2, valor_latao: 40 };
const POCAO = { slug: 'pocao_cura', nome: 'Poção de Cura', grupo: 'Consumíveis', ocupa: 0.5, valor_latao: 500 };
const CAT = { espada_longa: ESPADA, corda: CORDA, pocao_cura: POCAO };

const USER = 'user-1';
const PJ_ID = 64;

beforeAll(() => {
  expect(window.InventarioList).toBeTypeOf('function');
  expect(window.DarItemModal).toBeTypeOf('function');
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
});
afterEach(cleanup);

/* O que o trilho do inventário oferece ao Mestre. */
const botaoDar = () => [...document.querySelectorAll('button')]
  .find((b) => /Dar item/i.test(b.textContent || ''));

const montar = async (isMestre) => {
  const { fakeSupabase } = await import('../test/fake-supabase.js');
  window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
  const pjs = [{
    id: PJ_ID, user_id: USER, nome: 'Galadar Pé-de-Ferro', raca: 'Humano', profissao: 'Guerreiro',
    forca_base: 3, fisico_base: 3,
    inventario: {
      moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 },
      itens: [{ instanceId: 'e1', slug: 'espada_longa', quantidade: 1, equipado: false, slot: null, containerId: null }],
    },
    estado_atual: {},
  }];
  const chamadasRpc = [];
  const sb = fakeSupabase({
    personagens: pjs, itens: Object.values(CAT), historias: [{ id: 9, protagonista_ids: [PJ_ID] }],
    __authUserId: isMestre ? 'mestre-1' : USER,
    __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
  });
  const rpcOriginal = sb.rpc.bind(sb);
  sb.rpc = (nome, args) => { chamadasRpc.push({ nome, args }); return rpcOriginal(nome, args); };
  globalThis.supabaseClient = sb;
  const r = render(<window.InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={PJ_ID}
    maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} isMestre={isMestre} />);
  await vi.waitFor(() => {
    expect(r.container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy();
  });
  return { pjs, chamadasRpc };
};

describe('a ação é só do Mestre', () => {
  it('o Mestre vê "Dar item" no trilho do inventário', async () => {
    await montar(true);
    await vi.waitFor(() => expect(botaoDar()).toBeTruthy());
  });

  it('o jogador na própria mochila não vê a ação', async () => {
    await montar(false);
    expect(botaoDar()).toBeFalsy();
  });
});

describe('a entrega', () => {
  /* Abre a janela e escolhe um item pelo nome. Devolve o <li> da escolha, que
     é por onde o teste confere o estado "escolhido". */
  const escolher = async (nome) => {
    fireEvent.click(await vi.waitFor(() => { const b = botaoDar(); expect(b).toBeTruthy(); return b; }));
    const linha = await vi.waitFor(() => {
      const l = [...document.querySelectorAll('.dar-item-linha')].find((x) => x.textContent.includes(nome));
      expect(l).toBeTruthy();
      return l;
    });
    fireEvent.click(linha);
    return linha;
  };
  const botaoConfirmar = () => [...document.querySelectorAll('.modal-dar-item button')]
    .find((b) => (b.textContent || '').trim() === 'Dar');

  it('sem escolher nada, não há o que dar', async () => {
    await montar(true);
    fireEvent.click(await vi.waitFor(() => { const b = botaoDar(); expect(b).toBeTruthy(); return b; }));
    expect(botaoConfirmar().disabled).toBe(true);
  });

  it('o item escolhido entra no inventário e a janela fecha', async () => {
    const { pjs } = await montar(true);
    await escolher('Corda de Cânhamo');
    fireEvent.click(botaoConfirmar());
    await vi.waitFor(() => {
      const itens = pjs[0].inventario.itens;
      expect(itens.some((it) => it.slug === 'corda' && it.quantidade === 1)).toBe(true);
    }, { timeout: 2000 });
    expect(document.querySelector('.modal-dar-item')).toBeFalsy();
    // a espada que já estava lá continua lá: dar não substitui
    expect(pjs[0].inventario.itens.some((it) => it.slug === 'espada_longa')).toBe(true);
  });

  it('a quantidade escolhida é a que entra', async () => {
    const { pjs } = await montar(true);
    await escolher('Poção de Cura');
    const mais = document.querySelector('.dar-item-qtd button[aria-label="+"]');
    fireEvent.click(mais);
    fireEvent.click(mais);
    expect(document.querySelector('.dar-item-qtd .fp-pop-stepper-label').textContent).toBe('3');
    fireEvent.click(botaoConfirmar());
    await vi.waitFor(() => {
      const p = pjs[0].inventario.itens.find((it) => it.slug === 'pocao_cura');
      expect(p && p.quantidade).toBe(3);
    }, { timeout: 2000 });
  });

  it('a busca filtra por nome e por grupo', async () => {
    await montar(true);
    fireEvent.click(await vi.waitFor(() => { const b = botaoDar(); expect(b).toBeTruthy(); return b; }));
    const busca = document.querySelector('.dar-item-busca input');
    fireEvent.change(busca, { target: { value: 'Consumíveis' } });
    await vi.waitFor(() => {
      const nomes = [...document.querySelectorAll('.dar-item-linha')].map((l) => l.textContent);
      expect(nomes).toHaveLength(1);
      expect(nomes[0]).toContain('Poção de Cura');
    });
    fireEvent.change(busca, { target: { value: 'cânhamo' } });
    await vi.waitFor(() => {
      const nomes = [...document.querySelectorAll('.dar-item-linha')].map((l) => l.textContent);
      expect(nomes).toHaveLength(1);
      expect(nomes[0]).toContain('Corda');
    });
  });

  /* A mesa fica sabendo — mesmo caminho de "usar" e "descartar". */
  it('entregar vira linha na mesa, com o primeiro nome do personagem', async () => {
    const { chamadasRpc } = await montar(true);
    await escolher('Corda de Cânhamo');
    fireEvent.click(botaoConfirmar());
    const evento = await vi.waitFor(() => {
      const e = chamadasRpc.find((c) => c.nome === 'registrar_evento_mesa'
        && /Corda de Cânhamo/.test(c.args?.p_texto || ''));
      expect(e).toBeTruthy();
      return e;
    }, { timeout: 2000 });
    expect(evento.args.p_texto).toBe('Galadar recebeu 1× Corda de Cânhamo do Mestre.');
    expect(evento.args.p_meta).toMatchObject({ item: 'Corda de Cânhamo', quantidade: 1, acao: 'dar' });
  });
});
