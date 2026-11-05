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
let horasDeFabricacao, avancarFabricacao;
beforeAll(() => {
  ehAtaqueNatural = window.ehAtaqueNatural;
  ({ materiaisDaReceita, materialDisponivel, conferirMateriais, temAHabilidade,
     podeFabricar, consumirMateriais, fabricar, emConstrucao,
     progressoDaConstrucao, diasRestantes, itensComConstrucaoPronta,
     horasDeFabricacao, avancarFabricacao } = window);
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

const HABS = { artesanato: 3, metalurgia: 2 };
// personagens.receitas_aprendidas de quem já aprendeu estas receitas.
const SABE = ['capa_simples', 'adaga', 'violao', 'porcelana'];
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
    expect(podeFabricar(CAPA, comMaterial, HABS, SABE)).toEqual({ ok: true });
  });

  it('sem a habilidade, não dá — nem com o material todo', () => {
    expect(podeFabricar(CAPA, comMaterial, { metalurgia: 2 }, SABE))
      .toMatchObject({ ok: false, motivo: 'sem_habilidade' });
    // Nível 0 é não ter.
    expect(temAHabilidade({ artesanato: 0 }, 'artesanato')).toBe(false);
  });

  it('sem o material, não dá — e o motivo traz a lista', () => {
    const r = podeFabricar(CAPA, [pilha('algodao', 19)], HABS, SABE);
    expect(r.motivo).toBe('sem_material');
    expect(r.faltando).toEqual([{ slug: 'algodao', precisa: 20, tem: 19 }]);
  });

  it('item sem receita não se fabrica', () => {
    expect(podeFabricar(null, comMaterial, HABS)).toMatchObject({ ok: false, motivo: 'sem_receita' });
  });

  /* 31/10/2026, usuário: "só é possível fabricar com a receita, e eu quero
     saber como compra na loja. Mude o nome para 'Receita de Anel de Cobre'". */
  it('sem ter aprendido a receita, não dá — nem com material e habilidade', () => {
    expect(podeFabricar(CAPA, [pilha('algodao', 20)], HABS, []))
      .toMatchObject({ ok: false, motivo: 'sem_receita_item' });
    /* 31/10/2026, usuário: "Quando o personagem aprende uma receita, o item
       da receita some e o personagem fica com a receita salva". O item na
       mochila, ainda por aprender, não fabrica — mas o motivo diz o caminho. */
    expect(podeFabricar(CAPA, [pilha('algodao', 20), pilha('receita_capa_simples', 1)], HABS, []))
      .toMatchObject({ ok: false, motivo: 'receita_por_aprender' });
    // Aprendida, o item já não precisa existir.
    expect(podeFabricar(CAPA, [pilha('algodao', 20)], HABS, ['capa_simples'])).toEqual({ ok: true });
  });

  it('a receita se chama "Receita de <item>" e tem o slug receita_<item>', () => {
    expect(window.receitaItemSlug(CAPA)).toBe('receita_capa_simples');
    expect(window.nomeDaReceita({ nome: 'Anel de Cobre' })).toBe('Receita de Anel de Cobre');
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
    const r = fabricar(itens(), ADAGA, HABS, true, 24, ids(), SABE);
    expect(r).toMatchObject({ ok: true, sucesso: true });
    expect(r.itens.filter((x) => x.slug === 'aco')).toHaveLength(0);
    const feito = r.itens.find((x) => x.instanceId === 'novo1');
    expect(feito).toMatchObject({ slug: 'adaga', quantidade: 1 });
    expect(feito.construindo).toEqual({ horas: 24, horas_restantes: 24 });
    expect(emConstrucao(feito)).toBe(true);
  });

  it('na FALHA: material gasto do mesmo jeito, e nada de item', () => {
    const r = fabricar(itens(), ADAGA, HABS, false, 24, ids(), SABE);
    expect(r).toMatchObject({ ok: true, sucesso: false });
    expect(r.itens.filter((x) => x.slug === 'aco')).toHaveLength(0);
    expect(r.itens.some((x) => x.slug === 'adaga')).toBe(false);
  });

  it('sem habilidade ou sem material, NADA é gasto — a tentativa nem começa', () => {
    const semHab = fabricar(itens(), ADAGA, { artesanato: 1 }, true, 24, ids(), SABE);
    expect(semHab).toMatchObject({ ok: false, motivo: 'sem_habilidade' });
    expect(semHab.itens).toBeUndefined();

    const semMat = fabricar([pilha('aco', 19)], ADAGA, HABS, true, 24, ids(), SABE);
    expect(semMat).toMatchObject({ ok: false, motivo: 'sem_material' });
    expect(semMat.itens).toBeUndefined();
  });

  it('a receita aprendida fabrica quantas vezes quiser', () => {
    const uma = fabricar(itens(), ADAGA, HABS, true, 24, ids(), SABE);
    const outra = fabricar([...uma.itens, ...itens()], ADAGA, HABS, true, 24, ids(), SABE);
    expect(outra).toMatchObject({ ok: true, sucesso: true });
  });

  it('a receita que rende mais de um entrega a pilha (1 Quartzo → 5 Porcelanas)', () => {
    const PORC = { resultado_slug: 'porcelana', habilidade_key: 'artesanato', dificuldade: 'D', dias: 1,
      rende: 5, materiais: [{ slug: 'quartzo', qtd: 1 }] };
    const r = fabricar([pilha('quartzo', 1)], PORC, HABS, true, 12, ids(), SABE);
    expect(r.itens.find((x) => x.slug === 'porcelana')).toMatchObject({ quantidade: 5 });
    expect(r.itens.some((x) => x.slug === 'quartzo')).toBe(false);
  });

  it('sem horas, o item nasce pronto — o lado seguro', () => {
    const r = fabricar(itens(), ADAGA, HABS, true, null, ids(), SABE);
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

});

/* O TEMPO EM HORAS, PELO GRUPO (31/10/2026, usuário: "Classifique o tempo de
   fabricação dos itens com base em seu grupo, armaduras 36 horas, armas 24
   horas, por aí vai"). As horas só andam na atividade Fabricar. */
describe('o tempo pela atividade Fabricar', () => {
  it('a régua por grupo: armadura 36, arma 24, e o resto entre elas', () => {
    expect(horasDeFabricacao({ grupo: 'Armaduras' })).toBe(36);
    expect(horasDeFabricacao({ grupo: 'Armas' })).toBe(24);
    expect(horasDeFabricacao({ grupo: 'Instrumentos' })).toBe(24);
    expect(horasDeFabricacao({ grupo: 'Vestimentas' })).toBe(12);
    expect(horasDeFabricacao({ grupo: 'Recipientes' })).toBe(8);
    expect(horasDeFabricacao({ grupo: 'Outro' })).toBe(12);
    expect(horasDeFabricacao(null)).toBe(12);
  });

  const naBancadaH = (id, horas, restantes) => ({
    instanceId: id, slug: id, quantidade: 1, construindo: { horas, horas_restantes: restantes },
  });

  it('as horas vão para o primeiro da bancada, e a sobra passa ao seguinte', () => {
    const lista = [pilha('seda', 3), naBancadaH('barda', 36, 10), naBancadaH('adaga', 24, 24)];
    const { itens, prontos } = avancarFabricacao(lista, 16);
    expect(itens[1].construindo).toBeUndefined();          // a barda ficou pronta
    expect(itens[1]).toMatchObject({ slug: 'barda', quantidade: 1 });
    expect(itens[2].construindo.horas_restantes).toBe(18); // a adaga levou as 6 que sobraram
    expect(prontos.map((p) => p.slug)).toEqual(['barda']);
    expect(itens[0]).toBe(lista[0]);
  });

  it('a linha mede o que já andou', () => {
    expect(progressoDaConstrucao(naBancadaH('barda', 36, 27), null)).toBe(25);
  });

  it('sem nada na bancada, devolve a MESMA lista (alterarInventario não grava)', () => {
    const lista = [pilha('seda', 3)];
    expect(avancarFabricacao(lista, 8).itens).toBe(lista);
    const comItem = [naBancadaH('barda', 36, 36)];
    expect(avancarFabricacao(comItem, 0).itens).toBe(comItem);
  });

  it('o carimbo antigo, por data, não come hora nenhuma', () => {
    const antigo = { instanceId: 'b1', slug: 'barda', quantidade: 1,
      construindo: { dias: 13, desde: DIA(1), pronto_em: DIA(14) } };
    const lista = [antigo];
    expect(avancarFabricacao(lista, 50).itens).toBe(lista);
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

/* ── RECEITA POR PEÇA, TESTE POR CLASSE, GRAU NA PEÇA (31/10/2026) ──────────
   "Para criar itens de armadura/arma pesada é necessário um teste Difícil de
    Metalurgia e um teste Difícil de Artesanato." · "Espetacular e Absurdo +2
    Defesa, Resistência, Absorção e +6 Dano. [...] Rotineiro −3 [...] e −9
    Dano. Falha Crítica perde os itens e não cria nada." · Com dois testes,
    vale o pior. (usuário) */
describe('a peça com grau', () => {
  const COTA = {
    resultado_slug: 'peca_cota_completa', habilidade_key: 'metalurgia', dificuldade: 'D', dias: 1,
    materiais: [{ slug: 'aco', qtd: 1 }], testes: ['metalurgia', 'artesanato'],
  };
  const SABE_COTA = ['peca_cota_completa'];

  it('a peça pesada pede as duas habilidades', () => {
    expect(window.testesDaReceita(COTA)).toEqual(['metalurgia', 'artesanato']);
    expect(podeFabricar(COTA, [pilha('aco', 1)], { metalurgia: 2 }, SABE_COTA))
      .toMatchObject({ ok: false, motivo: 'sem_habilidade' });
    expect(podeFabricar(COTA, [pilha('aco', 1)], { metalurgia: 2, artesanato: 1 }, SABE_COTA)).toEqual({ ok: true });
  });

  it('receita sem testes continua com o teste único de sempre', () => {
    expect(window.testesDaReceita(CAPA)).toEqual(['artesanato']);
    expect(window.receitaComGrau(CAPA)).toBe(false);
    expect(window.receitaComGrau(COTA)).toBe(true);
  });

  it('vale o PIOR dos testes', () => {
    expect(window.grauDosTestes([7, 3])).toBe('M');      // Absurdo + Médio → Médio
    expect(window.grauDosTestes(['E', 'A'])).toBe('E');
    expect(window.grauDosTestes([0, 7])).toBe('FC');
  });

  it('a peça leva o grau e o nome de quem fez', () => {
    const r = fabricar([pilha('aco', 1)], COTA, { metalurgia: 2, artesanato: 1 }, true, 36, ids(), SABE_COTA,
      { por: 'Aldren', grau: 'A' });
    const peca = r.itens.find((x) => x.slug === 'peca_cota_completa');
    expect(peca.fabricado).toEqual({ por: 'Aldren', grau: 'A' });
    expect(window.nomeDaPecaFabricada(peca, { nome: 'Cota Completa' })).toBe('Cota Completa de Aldren');
  });

  it('o grau mexe em Defesa, Absorção e Resistência da armadura, e no Dano da arma', () => {
    const cota = { grupo: 'Armaduras', defesa: 1, absorcao: 4, resistencia: 4 };
    const absurda = { slug: 'x', fabricado: { grau: 'A' } };
    const rotineira = { slug: 'x', fabricado: { grau: 'R' } };
    expect(window.defesaDaPeca(absurda, cota)).toBe(3);
    expect(window.absorcaoDaPeca(absurda, cota)).toBe(6);
    expect(window.resistenciaDaPeca(absurda, cota)).toBe(6);
    // Nenhum atributo desce de zero.
    expect(window.defesaDaPeca(rotineira, cota)).toBe(0);
    expect(window.absorcaoDaPeca(rotineira, cota)).toBe(1);
    // Difícil é o padrão; peça comprada não tem grau.
    expect(window.absorcaoDaPeca({ fabricado: { grau: 'D' } }, cota)).toBe(4);
    expect(window.absorcaoDaPeca({}, cota)).toBe(4);
    const adaga = { grupo: 'Armas', resistencia: 1 };
    expect(window.ajusteDeFabrica({ fabricado: { grau: 'MD' } }, adaga)).toEqual({ defesa: 0, absorcao: 0, resistencia: 1, dano: 3 });
    expect(window.ajusteDeFabrica({ fabricado: { grau: 'F' } }, adaga).dano).toBe(-6);
  });
});

/* ── MATERIAL À ESCOLHA E FERRAMENTA (31/10/2026) ──────────────────────────
   "5x Osso Animal, Osso Profano, etc > 1x Marfim" · "Equipamentos podem ser
   usados 10 vezes antes de sumir." (usuário) */
describe('material à escolha e ferramenta', () => {
  const MARFIM = {
    resultado_slug: 'marfim_animal', habilidade_key: 'artesanato', dificuldade: 'D', dias: 1,
    materiais: [{ slugs: ['osso_animal', 'osso_demoniaco'], qtd: 5, nome: 'Ossos' }],
  };
  const SABE_M = ['marfim_animal'];

  it('qualquer mistura dos ossos serve, e sai da que estiver primeiro', () => {
    const itens = [pilha('osso_animal', 3), pilha('osso_demoniaco', 4)];
    expect(conferirMateriais(MARFIM, itens).ok).toBe(true);
    const out = consumirMateriais(itens, MARFIM);
    expect(out.find((x) => x.slug === 'osso_animal')).toBeUndefined();
    expect(out.find((x) => x.slug === 'osso_demoniaco').quantidade).toBe(2);
    expect(conferirMateriais(MARFIM, [pilha('osso_animal', 4)]).faltando[0]).toMatchObject({ precisa: 5, tem: 4 });
    expect(podeFabricar(MARFIM, itens, HABS, SABE_M)).toEqual({ ok: true });
  });

  it('a ferramenta perde um uso por tentativa e some no décimo', () => {
    const ARCO = {
      resultado_slug: 'arco', habilidade_key: 'artesanato', dificuldade: 'D', dias: 1,
      materiais: [{ slug: 'lenha', qtd: 1 }, { slug: 'equipamento_de_carpinteiro', qtd: 1, ferramenta: true }],
    };
    let itens = [pilha('lenha', 20), pilha('equipamento_de_carpinteiro', 1)];
    itens = consumirMateriais(itens, ARCO);
    expect(itens.find((x) => x.slug === 'equipamento_de_carpinteiro')).toMatchObject({ quantidade: 1, usos: 9 });
    for (let i = 0; i < 9; i++) itens = consumirMateriais(itens, ARCO);
    expect(itens.find((x) => x.slug === 'equipamento_de_carpinteiro')).toBeUndefined();
    expect(itens.find((x) => x.slug === 'lenha').quantidade).toBe(10);
    // Sem a ferramenta à mão, não dá.
    expect(conferirMateriais(ARCO, itens).ok).toBe(false);
  });
});
