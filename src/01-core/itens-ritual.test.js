/* ============================================================
   itens-ritual.test.js — o ritual consome os itens necessários
   ============================================================
   "Magias do tipo 'Ritual' consomem os itens necessários automaticamente do
    inventário, se o evocador não tiver os itens, ele será avisado."
   (usuário, 28/09/2026)
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const CAT = {
  vela: { slug: 'vela', nome: 'Vela' },
  incenso: { slug: 'incenso', nome: 'Incenso' },
  quartzo: { slug: 'quartzo', nome: 'Quartzo' },
  safira: { slug: 'safira', nome: 'Safira' },
  carcaca: { slug: 'carcaca', nome: 'Carcaça' },
};

describe('itensDoRitual', () => {
  it('lê nome e quantidade, alternativas e "(Variável)"', () => {
    expect(window.itensDoRitual('Vela (7), Incenso (3)')).toEqual([
      { opcoes: [{ nome: 'Vela', qtd: 7 }] }, { opcoes: [{ nome: 'Incenso', qtd: 3 }] },
    ]);
    expect(window.itensDoRitual('Quartzo (1) ou Safira (1)')[0].opcoes.map((o) => o.nome)).toEqual(['Quartzo', 'Safira']);
    expect(window.itensDoRitual('Carcaça (Variável)')[0].opcoes[0]).toEqual({ nome: 'Carcaça', qtd: 1 });
  });
});

describe('conferir e consumir', () => {
  const itens = [
    { instanceId: 'v1', slug: 'vela', quantidade: 4, containerId: 'bolsa' },
    { instanceId: 'v2', slug: 'vela', quantidade: 5 },
    { instanceId: 'i1', slug: 'incenso', quantidade: 1 },
    { instanceId: 's1', slug: 'safira', quantidade: 1 },
  ];

  it('falta: avisa quanto tem e quanto precisa, e não consome nada', () => {
    const conf = window.conferirItensDoRitual('Vela (7), Incenso (3)', itens, CAT);
    expect(conf.ok).toBe(false);
    expect(conf.faltam).toEqual([{ nome: 'Incenso', precisa: 3, tem: 1 }]);
    const r = window.consumirItensDoRitual(itens, 'Vela (7), Incenso (3)', CAT);
    expect(r.ok).toBe(false);
    expect(r.itens).toBe(itens);
  });

  it('tem tudo: consome somando as pilhas, e a alternativa que houver', () => {
    const r = window.consumirItensDoRitual(itens, 'Vela (7), Quartzo (1) ou Safira (1)', CAT);
    expect(r.ok).toBe(true);
    const velas = r.itens.filter((x) => x.slug === 'vela').reduce((s, x) => s + x.quantidade, 0);
    expect(velas).toBe(2);
    expect(r.itens.some((x) => x.slug === 'safira')).toBe(false);
    expect(r.itens.find((x) => x.slug === 'incenso').quantidade).toBe(1);
  });

  it('o nome casa sem acento e sem caixa', () => {
    const conf = window.conferirItensDoRitual('carcaca (1)', [{ instanceId: 'c', slug: 'carcaca', quantidade: 1 }], CAT);
    expect(conf.ok).toBe(true);
  });
});
