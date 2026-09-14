/* ============================================================
   venda-item.test.jsx — vender item negociando com o Mestre
   ============================================================
   "Adicione um botão de vender o item do inventário, abrindo um modal para
   negociar e registrar o preço de venda. O mestre poderá aceitar, recusar a
   proposta ou negociar." (usuário, 13/09/2026)

   A regra de verdade mora nas RPCs (scripts/sql/vendas-item-negociacao.sql).
   Aqui fica o que a tela decide sozinha:
     • por que o botão "Vender" está desativado;
     • o que cada lado pode fazer em cada vez;
     • os quatro campos de moeda somando em latão.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let bloqueio, acoes, label, PrecoMoedasInput;
beforeAll(() => {
  bloqueio = window.bloqueioVenda;
  acoes = window.vendaAcoesDisponiveis;
  label = window.motivoVendaLabel;
  PrecoMoedasInput = window.PrecoMoedasInput;
  expect(bloqueio).toBeTypeOf('function');
  expect(acoes).toBeTypeOf('function');
  expect(label).toBeTypeOf('function');
  expect(PrecoMoedasInput).toBeTypeOf('function');
  expect(window.VendaModal).toBeTypeOf('function');
});
afterEach(cleanup);

const DONO = { ehDono: true, historiaId: 7 };

describe('bloqueioVenda — o porquê do botão desativado', () => {
  it('item solto, dono, numa aventura: pode vender', () => {
    expect(bloqueio({ instanceId: 'a' }, DONO)).toBeNull();
  });
  it('quem não é o dono não vende', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, ehDono: false })).toBe('nao_e_dono');
  });
  it('fora de uma aventura não há Mestre para comprar', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, historiaId: null })).toBe('sem_historia');
  });
  it('equipado ou vestido: tire antes', () => {
    expect(bloqueio({ instanceId: 'a', equipado: true }, DONO)).toBe('item_em_uso');
    expect(bloqueio({ instanceId: 'a', vestido: true }, DONO)).toBe('item_em_uso');
  });
  it('recipiente com coisas dentro: esvazie antes', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, temConteudo: true })).toBe('recipiente_com_itens');
  });
  it('com negociação aberta nunca bloqueia — abre o andamento (inclusive para o Mestre)', () => {
    expect(bloqueio({ instanceId: 'a', equipado: true }, { ehDono: false, vendaAberta: true })).toBeNull();
  });
  it('todo motivo tem texto', () => {
    for (const m of ['nao_e_dono', 'sem_historia', 'item_em_uso', 'recipiente_com_itens']) {
      expect(label(m, false)).not.toBe('Não foi possível concluir a venda.');
    }
  });
});

describe('vendaAcoesDisponiveis — de quem é a vez', () => {
  const aberta = (vez) => ({ id: 1, status: 'aberta', vez });
  it('vez do Mestre: ele aceita, negocia ou recusa; o jogador só pode desistir', () => {
    expect(acoes(aberta('mestre'), 'mestre')).toEqual(['aceitar', 'contrapropor', 'recusar']);
    expect(acoes(aberta('mestre'), 'jogador')).toEqual(['cancelar']);
  });
  it('vez do jogador (contraproposta do Mestre): o jogador tem as três; o Mestre espera', () => {
    expect(acoes(aberta('jogador'), 'jogador')).toEqual(['aceitar', 'contrapropor', 'recusar']);
    expect(acoes(aberta('jogador'), 'mestre')).toEqual([]);
  });
  it('encerrada: nada', () => {
    expect(acoes({ status: 'aceita', vez: 'mestre' }, 'mestre')).toEqual([]);
    expect(acoes(null, 'jogador')).toEqual([]);
  });
});

describe('PrecoMoedasInput — ouro, prata, cobre e latão em latão', () => {
  it('começa decomposto e soma o que se digita', () => {
    let total = null;
    const { container } = render(<PrecoMoedasInput latao={1234} lang="pt" onChange={(v) => { total = v; }} />);
    const [ouro, prata, cobre, latao] = container.querySelectorAll('input');
    expect([ouro.value, prata.value, cobre.value, latao.value]).toEqual(['1', '2', '3', '4']);
    fireEvent.change(prata, { target: { value: '15' } });
    expect(total).toBe(1000 + 1500 + 30 + 4);
    fireEvent.change(ouro, { target: { value: 'x' } });
    expect(total).toBe(1500 + 30 + 4);
  });
});
