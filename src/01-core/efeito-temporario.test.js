/* ============================================================
   efeito-temporario.test.js — o bônus que passa do teto e vence
   ============================================================
   Pedido do usuário (06/10/2026), com os três materiais de Elemental:
     "Fogo Vivo é um líquido que aumenta 5 de EH por unidade consumida, pode ir
      além do seu máximo, dura 2 dias."
     "Karma Líquido é um líquido que aumenta 10 de KA por unidade consumida,
      pode ir além do seu máximo, dura 2 dias."
     "Energia Cinética é um sólido que aumenta 1 de VB por unidade consumida,
      pode ir além do seu máximo, dura 2 dias."

   Duas regras que não cabiam na barra: passar do máximo (a barra trava no teto
   derivado) e vencer (a barra guarda número, não prazo). Por isso o bônus com
   prazo vive em estado_atual.efeitos_temporarios e é somado na LEITURA.
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
import './efeito-temporario.jsx';

let ehEfeitoComPrazo, efeitosTemporariosDoItem, efeitosTemporariosVigentes;
let bonusTemporarios, comEfeitosTemporarios, semEfeitoTemporario;
let aplicarEfeitosItem, parseEfeito;
beforeAll(() => {
  ({ ehEfeitoComPrazo, efeitosTemporariosDoItem, efeitosTemporariosVigentes,
     bonusTemporarios, comEfeitosTemporarios, semEfeitoTemporario,
     aplicarEfeitosItem, parseEfeito } = window);
  expect(efeitosTemporariosDoItem).toBeTypeOf('function');
  expect(bonusTemporarios).toBeTypeOf('function');
});

// As três linhas reais do catálogo (scripts/sql/saque-por-tipo-e-materias-primas-2026-10-06.sql).
const FOGO_VIVO = {
  slug: 'fogo_vivo', nome: 'Fogo Vivo', grupo: 'Consumíveis', tipo: 'L',
  efeito_positivo: 'Aumenta 5 de Energia Heroica.', efeito_transborda: true, efeito_duracao_dias: 2,
};
const KARMA_LIQUIDO = {
  slug: 'karma_liquido', nome: 'Karma Líquido', grupo: 'Consumíveis', tipo: 'L',
  efeito_positivo: 'Aumenta 10 de Karma.', efeito_transborda: true, efeito_duracao_dias: 2,
};
const ENERGIA_CINETICA = {
  slug: 'energia_cinetica', nome: 'Energia Cinética', grupo: 'Consumíveis', tipo: 'S',
  efeito_positivo: 'Aumenta 1 de Velocidade.', efeito_transborda: true, efeito_duracao_dias: 2,
};
// Um consumível normal, para a comparação: sem prazo, vai direto para a barra.
const ELIXIR = {
  slug: 'morrigalti', nome: 'Elixir Morrigalti', grupo: 'Consumíveis', tipo: 'L',
  efeito_positivo: 'Aumenta 100 de Energia Física.',
};

const DIA = (dia) => ({ dia, mes: 1, ano: 100 });
const ids = () => { let n = 0; return () => `t${++n}`; };

describe('o vocabulário aprendeu Velocidade', () => {
  it('"Aumenta 1 de Velocidade" vira escopo velocidade / chave vb', () => {
    expect(parseEfeito('Aumenta 1 de Velocidade.'))
      .toEqual([{ scope: 'velocidade', key: 'vb', valor: 1, verbo: 1, inverte: false }]);
  });
});

describe('ehEfeitoComPrazo', () => {
  it('é o que efeito_duracao_dias diz', () => {
    expect(ehEfeitoComPrazo(FOGO_VIVO)).toBe(true);
    expect(ehEfeitoComPrazo(ELIXIR)).toBe(false);
    expect(ehEfeitoComPrazo({ efeito_duracao_dias: 0 })).toBe(false);
    expect(ehEfeitoComPrazo(null)).toBe(false);
  });
});

describe('o item com prazo vira linha, não valor de barra', () => {
  it('Fogo Vivo: +5 de EH, com vencimento em 2 dias', () => {
    const [l] = efeitosTemporariosDoItem(FOGO_VIVO, 1, DIA(10), ids());
    expect(l).toMatchObject({ slug: 'fogo_vivo', nome: 'Fogo Vivo', key: 'eh', valor: 5, dias: 2 });
    expect(l.vence_em).toEqual(DIA(12));
  });

  it('a quantidade multiplica: duas doses são +10', () => {
    expect(efeitosTemporariosDoItem(FOGO_VIVO, 2, DIA(10), ids())[0].valor).toBe(10);
  });

  it('Karma Líquido mexe em ka; Energia Cinética, em vb', () => {
    expect(efeitosTemporariosDoItem(KARMA_LIQUIDO, 1, DIA(1), ids())[0])
      .toMatchObject({ key: 'ka', valor: 10 });
    expect(efeitosTemporariosDoItem(ENERGIA_CINETICA, 1, DIA(1), ids())[0])
      .toMatchObject({ key: 'vb', valor: 1 });
  });

  it('item sem prazo não gera linha nenhuma', () => {
    expect(efeitosTemporariosDoItem(ELIXIR, 1, DIA(1), ids())).toEqual([]);
  });

  it('sem data de jogo, a linha entra sem vencimento — e vale até alguém tirar', () => {
    const [l] = efeitosTemporariosDoItem(FOGO_VIVO, 1, null, ids());
    expect(l.vence_em).toBeNull();
    expect(bonusTemporarios([l], DIA(9999)).eh).toBe(5);
  });
});

describe('vencimento preguiçoso, na leitura', () => {
  const linhas = [
    { id: 'a', key: 'eh', valor: 5, vence_em: DIA(12) },
    { id: 'b', key: 'ka', valor: 10, vence_em: DIA(20) },
  ];

  it('vence NO DIA: vale no 11, vale no dia anterior, não vale no 12', () => {
    expect(bonusTemporarios(linhas, DIA(11)).eh).toBe(5);
    expect(bonusTemporarios(linhas, DIA(12)).eh).toBe(0);
    // A outra linha não venceu junto.
    expect(bonusTemporarios(linhas, DIA(12)).ka).toBe(10);
  });

  it('soma por barra, e chave sem bônus sai 0', () => {
    expect(bonusTemporarios(linhas, DIA(11)))
      .toEqual({ ef: 0, eh: 5, ka: 10, ar: 0, vb: 0 });
    expect(bonusTemporarios([], DIA(1)))
      .toEqual({ ef: 0, eh: 0, ka: 0, ar: 0, vb: 0 });
  });

  it('duas doses da mesma coisa somam, cada uma com o seu prazo', () => {
    const duas = [
      { id: 'a', key: 'eh', valor: 5, vence_em: DIA(12) },
      { id: 'b', key: 'eh', valor: 5, vence_em: DIA(30) },
    ];
    expect(bonusTemporarios(duas, DIA(11)).eh).toBe(10);
    expect(bonusTemporarios(duas, DIA(12)).eh).toBe(5);
    expect(bonusTemporarios(duas, DIA(30)).eh).toBe(0);
  });

  it('sem data de jogo nada vence — o lado seguro', () => {
    expect(efeitosTemporariosVigentes(linhas, null)).toHaveLength(2);
  });
});

describe('aplicarEfeitosItem escolhe a porta certa', () => {
  const maximos = { ef: 100, eh: 30, ka: 50 };

  it('item com prazo NÃO toca a barra: vai para efeitos_temporarios', () => {
    const estado = { vitalidade: { eh: 30 } };
    const novo = aplicarEfeitosItem(estado, FOGO_VIVO, 1, maximos, DIA(10));
    // A barra gravada continua a mesma — nada de +5 preso nela para sempre.
    expect(novo.vitalidade.eh).toBe(30);
    expect(novo.efeitos_temporarios).toHaveLength(1);
    // E o bônus aparece na leitura, PASSANDO do máximo de 30.
    expect(30 + bonusTemporarios(novo.efeitos_temporarios, DIA(10)).eh).toBe(35);
  });

  it('item sem prazo continua travando no máximo, como sempre', () => {
    const novo = aplicarEfeitosItem({ vitalidade: { ef: 50 } }, ELIXIR, 1, maximos, DIA(10));
    expect(novo.vitalidade.ef).toBe(100);          // 50 + 100, travado em 100
    expect(novo.efeitos_temporarios).toBeUndefined();
  });

  it('beber de novo acumula, e o que já venceu é varrido na gravação', () => {
    const estado = { efeitos_temporarios: [{ id: 'velho', key: 'eh', valor: 5, vence_em: DIA(2) }] };
    const novo = aplicarEfeitosItem(estado, FOGO_VIVO, 1, maximos, DIA(10));
    expect(novo.efeitos_temporarios.map((e) => e.id)).not.toContain('velho');
    expect(novo.efeitos_temporarios).toHaveLength(1);
  });
});

describe('comEfeitosTemporarios / semEfeitoTemporario', () => {
  it('acrescenta sem mutar o estado original', () => {
    const estado = { vitalidade: { eh: 10 } };
    const novo = comEfeitosTemporarios(estado, [{ id: 'x', key: 'eh', valor: 5, vence_em: null }], DIA(1));
    expect(estado.efeitos_temporarios).toBeUndefined();
    expect(novo.efeitos_temporarios).toHaveLength(1);
    expect(novo.vitalidade).toBe(estado.vitalidade);
  });

  it('o Mestre pode cortar um bônus antes do prazo', () => {
    const estado = { efeitos_temporarios: [{ id: 'x', key: 'eh', valor: 5 }, { id: 'y', key: 'ka', valor: 10 }] };
    expect(semEfeitoTemporario(estado, 'x').efeitos_temporarios.map((e) => e.id)).toEqual(['y']);
  });
});

/* ── O BÔNUS COM PRAZO NA LEITURA DA FICHA (29/10/2026) ─────────────────────
   `calcularFicha` é quem soma o bônus vigente nas derivadas. Duas pontas
   estavam frouxas quando ele entrou:

     • o KARMA ressuscitava. "Sem karma se aura < 1: aí o poço não EXISTE, e o
       bônus de condição não o ressuscita" — mas o Karma Líquido somava 10 em
       quem não tem poço nenhum, e o "sem Karma" da ficha virava mentira.
     • a ABSORÇÃO só entrava em `derivadas.absorcao`, e a barra AR da ficha lê
       `derivadas.armadura` (11-ficha/ficha.jsx). O item de duração que soma AR
       era invisível na única tela que o mostra. */
describe('calcularFicha com bônus vigente', () => {
  const PJ = (extra) => ({
    raca: 'Humano', profissao: 'Guerreiro', experiencia: 0,
    forca_base: 2, fisico_base: 1, agilidade_base: 0, percepcao_base: 0,
    intelecto_base: 0, aura_base: 1, carisma_base: 0,
    inventario: { itens: [] }, ...extra,
  });
  const comBonus = (key, valor) => ({ efeitos_temporarios: [{ id: 'b', key, valor, vence_em: null }] });

  it('absorção com prazo aparece em `armadura`, que é a barra AR da ficha', () => {
    const d = window.calcularFicha(PJ({ estado_atual: comBonus('ar', 4) }), {}, null, null, null, DIA(1)).derivadas;
    expect(d.absorcao).toBe(4);
    expect(d.armadura, 'é esta que a ficha lê').toBe(4);
  });

  it('sem aura não há poço, e o prazo não o ressuscita', () => {
    const semAura = PJ({ aura_base: 0, estado_atual: comBonus('ka', 10) });
    const d = window.calcularFicha(semAura, {}, null, null, null, DIA(1)).derivadas;
    expect(d.karma).toBe(0);
    expect(d.karmamax).toBe(0);
  });

  it('com aura, o prazo soma no poço como sempre', () => {
    const base = window.calcularFicha(PJ({}), {}, null, null, null, DIA(1)).derivadas;
    const d = window.calcularFicha(PJ({ estado_atual: comBonus('ka', 10) }), {}, null, null, null, DIA(1)).derivadas;
    expect(d.karma).toBe(base.karma + 10);
    expect(d.karmamax).toBe(base.karmamax + 10);
  });
});
