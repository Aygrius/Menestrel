/* ============================================================
   fabricacao.test.js — a bancada: receita, custo e tempo
   ============================================================
   Pedidos do usuário (06/10/2026):
     "para fabricar uma Capa Simples, é necessário 20 de algodão, possuir a
      habilidade artesanato e um teste difícil."
     "Para fazer uma adaga, será necessário 20 aço, 2 madeira, 1 couro, possuir
      metalurgia e um teste dificil."
     "Para fazer um violão, será necessário 40 madeira, 5 linho, 5 seda e 5
      cânhamo, possuir artesanato e um teste dificil."
     "Adicione também um tempo para construção dos itens, assim que o teste for
      bem sucedido, o item em construção vai aparecer no inventário com uma
      linha inferior representando o tempo."
     "Teste falho consome os materiais."

   A regra que este arquivo trava com mais cuidado é a última: o material é o
   custo da TENTATIVA, não do sucesso. Errar a têmpera estraga o aço.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
/* O módulo que este arquivo testa precisa ser IMPORTADO aqui: ele se
   expõe pelo window, e sem o import os globais não existem — a suíte
   inteira pulava com 'expected undefined to be type of function'
   (26/10/2026). */
import './fabricacao.jsx';

let ehAtaqueNatural;
let materiaisDaReceita, materialDisponivel, conferirMateriais, temAHabilidade;
let podeFabricar, consumirMateriais, fabricar, emConstrucao;
let progressoDaConstrucao, diasRestantes, itensComConstrucaoPronta;
beforeAll(() => {
  ehAtaqueNatural = window.ehAtaqueNatural;
  ({ materiaisDaReceita, materialDisponivel, conferirMateriais, temAHabilidade,
     podeFabricar, consumirMateriais, fabricar, emConstrucao,
     progressoDaConstrucao, diasRestantes, itensComConstrucaoPronta } = window);
  expect(fabricar).toBeTypeOf('function');
});

// As três receitas que o pedido nomeia, como estão no banco
// (scripts/sql/fabricacao-2026-10-06.sql).
const CAPA = {
  resultado_slug: 'capa_simples', habilidade_key: 'artesanato', dificuldade: 'D', dias: 1,
  materiais: [{ slug: 'algodao', qtd: 20 }],
};
const ADAGA = {
  resultado_slug: 'adaga', habilidade_key: 'metalurgia', dificuldade: 'D', dias: 1,
  materiais: [{ slug: 'aco', qtd: 20 }, { slug: 'madeira', qtd: 2 }, { slug: 'couro_curtido', qtd: 1 }],
};
const VIOLAO = {
  resultado_slug: 'violao', habilidade_key: 'artesanato', dificuldade: 'D', dias: 1,
  materiais: [{ slug: 'madeira', qtd: 40 }, { slug: 'linho', qtd: 5 },
              { slug: 'seda', qtd: 5 }, { slug: 'canhamo', qtd: 5 }],
};
// Uma peça caruda, para o prazo valer alguma coisa: Barda, 26.000 → 13 dias.
const BARDA = {
  resultado_slug: 'barda', habilidade_key: 'artesanato', dificuldade: 'D', dias: 13,
  materiais: [{ slug: 'couro_curtido', qtd: 80 }],
};

const HABS = { artesanato: 3, metalurgia: 2 };
const DIA = (dia) => ({ dia, mes: 1, ano: 100 });
const ids = () => { let n = 0; return () => `novo${++n}`; };
const pilha = (slug, qtd, extra) => ({ instanceId: slug + '-1', slug, quantidade: qtd, ...extra });

describe('a receita', () => {
  it('a Capa Simples pede 20 de algodão, e nada mais', () => {
    expect(materiaisDaReceita(CAPA)).toEqual([{ slug: 'algodao', qtd: 20 }]);
  });

  it('a Adaga pede 20 aço, 2 madeira e 1 couro', () => {
    expect(materiaisDaReceita(ADAGA))
      .toEqual([{ slug: 'aco', qtd: 20 }, { slug: 'madeira', qtd: 2 }, { slug: 'couro_curtido', qtd: 1 }]);
  });

  it('o Violão pede 40 madeira e as três fibras das cordas', () => {
    expect(materiaisDaReceita(VIOLAO).map((m) => m.slug))
      .toEqual(['madeira', 'linho', 'seda', 'canhamo']);
  });
});

describe('o que está à mão da bancada', () => {
  it('soma as pilhas soltas, inclusive dentro de recipiente', () => {
    expect(materialDisponivel([
      pilha('algodao', 12),
      { instanceId: 'a2', slug: 'algodao', quantidade: 8, containerId: 'bolsa' },
    ], 'algodao')).toBe(20);
  });

  it('não conta o que está à venda, no bicho, vestido ou em construção', () => {
    const fora = [
      { instanceId: 'x1', slug: 'algodao', quantidade: 50, anuncio_id: 7 },
      { instanceId: 'x2', slug: 'algodao', quantidade: 50, animal_id: 'cav' },
      { instanceId: 'x3', slug: 'algodao', quantidade: 50, vestido: true },
      { instanceId: 'x4', slug: 'algodao', quantidade: 50, construindo: { pronto_em: DIA(9) } },
    ];
    expect(materialDisponivel(fora, 'algodao')).toBe(0);
  });

  it('conferirMateriais diz o que falta, e quanto', () => {
    const r = conferirMateriais(ADAGA, [pilha('aco', 5)]);
    expect(r.ok).toBe(false);
    expect(r.faltando).toEqual([
      { slug: 'aco', precisa: 20, tem: 5 },
      { slug: 'madeira', precisa: 2, tem: 0 },
      { slug: 'couro_curtido', precisa: 1, tem: 0 },
    ]);
  });
});

describe('podeFabricar — dá para TENTAR', () => {
  const comMaterial = [pilha('algodao', 20)];

  it('com a habilidade e o material, dá', () => {
    expect(podeFabricar(CAPA, comMaterial, HABS)).toEqual({ ok: true });
  });

  it('sem a habilidade, não dá — nem com o material todo', () => {
    expect(podeFabricar(CAPA, comMaterial, { metalurgia: 2 }))
      .toMatchObject({ ok: false, motivo: 'sem_habilidade' });
    // Nível 0 é não ter.
    expect(temAHabilidade({ artesanato: 0 }, 'artesanato')).toBe(false);
  });

  it('sem o material, não dá — e o motivo traz a lista', () => {
    const r = podeFabricar(CAPA, [pilha('algodao', 19)], HABS);
    expect(r.motivo).toBe('sem_material');
    expect(r.faltando).toEqual([{ slug: 'algodao', precisa: 20, tem: 19 }]);
  });

  it('item sem receita não se fabrica', () => {
    expect(podeFabricar(null, comMaterial, HABS)).toMatchObject({ ok: false, motivo: 'sem_receita' });
  });
});

describe('consumirMateriais', () => {
  it('gasta de várias pilhas e some com a que zera', () => {
    const itens = [
      { instanceId: 'a', slug: 'algodao', quantidade: 12 },
      { instanceId: 'b', slug: 'algodao', quantidade: 15 },
    ];
    const out = consumirMateriais(itens, CAPA);
    expect(out.find((x) => x.instanceId === 'a')).toBeUndefined();  // zerou: saiu
    expect(out.find((x) => x.instanceId === 'b').quantidade).toBe(7);
  });

  it('não mexe no que não é da receita', () => {
    const itens = [pilha('algodao', 20), pilha('seda', 9)];
    expect(consumirMateriais(itens, CAPA).find((x) => x.slug === 'seda').quantidade).toBe(9);
  });
});

/* A REGRA QUE O USUÁRIO ESCOLHEU: "Teste falho consome os materiais." */
describe('fabricar — o material é o custo da TENTATIVA', () => {
  const itens = () => [pilha('aco', 20), pilha('madeira', 2), pilha('couro_curtido', 1)];

  it('no SUCESSO: material gasto e o item na bancada', () => {
    const r = fabricar(itens(), ADAGA, HABS, true, DIA(10), ids());
    expect(r).toMatchObject({ ok: true, sucesso: true });
    expect(r.itens.filter((x) => x.slug === 'aco')).toHaveLength(0);
    const feito = r.itens.find((x) => x.instanceId === 'novo1');
    expect(feito).toMatchObject({ slug: 'adaga', quantidade: 1 });
    expect(feito.construindo).toMatchObject({ dias: 1 });
    expect(feito.construindo.pronto_em).toEqual(DIA(11));
  });

  it('na FALHA: material gasto do mesmo jeito, e nada de item', () => {
    const r = fabricar(itens(), ADAGA, HABS, false, DIA(10), ids());
    expect(r).toMatchObject({ ok: true, sucesso: false });
    expect(r.itens.filter((x) => x.slug === 'aco')).toHaveLength(0);
    expect(r.itens.some((x) => x.slug === 'adaga')).toBe(false);
  });

  it('sem habilidade ou sem material, NADA é gasto — a tentativa nem começa', () => {
    const semHab = fabricar(itens(), ADAGA, { artesanato: 1 }, true, DIA(10), ids());
    expect(semHab).toMatchObject({ ok: false, motivo: 'sem_habilidade' });
    expect(semHab.itens).toBeUndefined();

    const semMat = fabricar([pilha('aco', 19)], ADAGA, HABS, true, DIA(10), ids());
    expect(semMat).toMatchObject({ ok: false, motivo: 'sem_material' });
    expect(semMat.itens).toBeUndefined();
  });

  it('sem data de jogo, o item nasce pronto — o lado seguro', () => {
    const r = fabricar(itens(), ADAGA, HABS, true, null, ids());
    expect(emConstrucao(r.itens.find((x) => x.slug === 'adaga'))).toBe(false);
  });
});

describe('o tempo de construção', () => {
  const naBancada = (dias, desde, pronto) => ({
    instanceId: 'b1', slug: 'barda', quantidade: 1,
    construindo: { dias, desde: DIA(desde), pronto_em: DIA(pronto) },
  });

  it('a linha mede o que já andou, de 0 a 100', () => {
    const it = naBancada(13, 1, 14);          // 13 dias, do 1 ao 14
    expect(progressoDaConstrucao(it, DIA(1))).toBe(0);
    expect(progressoDaConstrucao(it, DIA(7))).toBe(46);
    expect(progressoDaConstrucao(it, DIA(14))).toBe(100);
    // Item que não está na bancada já está pronto.
    expect(progressoDaConstrucao({ slug: 'adaga' }, DIA(1))).toBe(100);
  });

  it('diasRestantes conta para trás e para em zero', () => {
    const it = naBancada(13, 1, 14);
    expect(diasRestantes(it, DIA(1))).toBe(13);
    expect(diasRestantes(it, DIA(13))).toBe(1);
    expect(diasRestantes(it, DIA(99))).toBe(0);
  });

  it('fica pronto NO DIA, e o carimbo cai na leitura', () => {
    const lista = [naBancada(13, 1, 14), pilha('seda', 3)];
    // No 13 ainda está na bancada…
    expect(emConstrucao(itensComConstrucaoPronta(lista, DIA(13))[0])).toBe(true);
    // …e no 14 é item como qualquer outro.
    const pronto = itensComConstrucaoPronta(lista, DIA(14));
    expect(pronto[0].construindo).toBeUndefined();
    expect(pronto[0]).toMatchObject({ slug: 'barda', quantidade: 1 });
  });

  it('sem nada para virar, devolve a MESMA lista (não dispara autosave à toa)', () => {
    const lista = [pilha('seda', 3)];
    expect(itensComConstrucaoPronta(lista, DIA(14))).toBe(lista);
    const naoVenceu = [naBancada(13, 1, 14)];
    expect(itensComConstrucaoPronta(naoVenceu, DIA(2))).toBe(naoVenceu);
  });

  it('a Barda leva 13 dias; a Adaga, 1 — o prazo sai do valor da peça', () => {
    const b = fabricar([pilha('couro_curtido', 80)], BARDA, HABS, true, DIA(1), ids());
    expect(b.itens.find((x) => x.slug === 'barda').construindo.pronto_em).toEqual(DIA(14));
  });
});

/* ── ATAQUE NATURAL NÃO SE FABRICA (06/10/2026) ────────────────────────────
   "Coice, Mordida, etc não podem ser fabricados." (usuário)

   As nove armas naturais das criaturas moram no grupo 'Armas' desde
   14/09/2026, e a geração de receitas varreu o grupo inteiro: a bancada
   prometia uma mordida por 20 de aço. O teste é `ocupa`, não o nome — parte do
   corpo não ocupa casa na mochila —, e é isso que este bloco trava: uma lista
   de nomes envelheceria na primeira criatura com uma presa nova. */
describe('ehAtaqueNatural', () => {
  const arma = (extra) => ({ slug: 'x', grupo: 'Armas', ocupa: 3, ...extra });

  it('arma do grupo Armas que não ocupa casa é parte do corpo', () => {
    expect(ehAtaqueNatural(arma({ slug: 'coice', ocupa: null }))).toBe(true);
    expect(ehAtaqueNatural(arma({ slug: 'mordida', ocupa: 0 }))).toBe(true);
  });

  it('arma de verdade ocupa espaço, e se fabrica', () => {
    expect(ehAtaqueNatural(arma({ slug: 'adaga' }))).toBe(false);
  });

  it('item sem `ocupa` de OUTRO grupo não é ataque natural', () => {
    // Recipientes e Vestimentas também têm linhas com `ocupa` nulo — o teste
    // é a dupla grupo+ocupa, nunca `ocupa` sozinho.
    expect(ehAtaqueNatural({ slug: 'alforje', grupo: 'Recipientes', ocupa: null })).toBe(false);
    expect(ehAtaqueNatural({ slug: 'gualdrapa', grupo: 'Vestimentas', ocupa: null })).toBe(false);
  });

  it('sem item, não trava nada', () => {
    expect(ehAtaqueNatural(null)).toBe(false);
    expect(ehAtaqueNatural(undefined)).toBe(false);
  });
});
