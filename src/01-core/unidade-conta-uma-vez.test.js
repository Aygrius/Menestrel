/* ============================================================
   unidade-conta-uma-vez.test.js — auditoria 13/11/2026, item 45
   ============================================================
   O ritual e a fabricação conferiam cada requisito contra o estoque inteiro:
   dois requisitos que aceitam o mesmo item passavam os dois com uma unidade
   só, e a baixa gastava menos do que pede. Agora a conferência simula a baixa.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './fabricacao.jsx';

const it_ = (instanceId, slug, quantidade) => ({ instanceId, slug, quantidade, containerId: null, equipado: false, slot: null });

describe('ritual', () => {
  const CAT = { vela: { slug: 'vela', nome: 'Vela' }, quartzo: { slug: 'quartzo', nome: 'Quartzo' } };
  it('dois grupos com o mesmo item: duas velas não pagam "Vela (2), Vela (1)"', () => {
    const r = window.conferirItensDoRitual('Vela (2), Vela (1)', [it_('v', 'vela', 2)], CAT);
    expect(r.ok).toBe(false);
    expect(r.faltam[0]).toMatchObject({ precisa: 1, tem: 0 });
  });
  it('com três velas, paga e gasta as três', () => {
    const r = window.consumirItensDoRitual([it_('v', 'vela', 3)], 'Vela (2), Vela (1)', CAT);
    expect(r.ok).toBe(true);
    expect(r.itens).toEqual([]);
  });
  it('a alternativa procura no que sobrou', () => {
    const r = window.conferirItensDoRitual('Vela (1), Vela (1) ou Quartzo (1)', [it_('v', 'vela', 1), it_('q', 'quartzo', 1)], CAT);
    expect(r.ok).toBe(true);
    expect(r.gastos.map((g) => g.nome)).toEqual(['Vela', 'Quartzo']);
  });
});

describe('fabricação', () => {
  const receita = (materiais) => ({ materiais });
  it('dois materiais que aceitam o mesmo item não dividem a mesma unidade', () => {
    const r = window.conferirMateriais(receita([
      { slug: 'osso', qtd: 1 },
      { slugs: ['osso', 'marfim'], qtd: 1 },
    ]), [it_('o', 'osso', 1)]);
    expect(r.ok).toBe(false);
  });
  it('com o bastante, passa e consome tudo', () => {
    const itens = [it_('o', 'osso', 1), it_('m', 'marfim', 1)];
    const rec = receita([{ slug: 'osso', qtd: 1 }, { slugs: ['osso', 'marfim'], qtd: 1 }]);
    expect(window.conferirMateriais(rec, itens).ok).toBe(true);
    expect(window.consumirMateriais(itens, rec)).toEqual([]);
  });
  it('a ferramenta só gasta um uso: não reserva unidade na conferência', () => {
    const rec = receita([{ slug: 'martelo', qtd: 1, ferramenta: true }, { slug: 'ferro', qtd: 2 }]);
    expect(window.conferirMateriais(rec, [it_('mt', 'martelo', 1), it_('f', 'ferro', 2)]).ok).toBe(true);
  });
});
