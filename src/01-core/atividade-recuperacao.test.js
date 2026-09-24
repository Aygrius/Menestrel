/* ============================================================
   atividade-recuperacao.test.js — Dormindo, Meditando, Orando…
   ============================================================
   Pedido do usuário (24/09/2026): o jogador escolhe na ficha uma atividade, e
   cada hora que o relógio da mesa anda recupera o personagem.

     Dormindo   EH +10+Carisma · EF +1+Físico · KA +5+Aura a cada 8h;
                sono +5 por hora (NO LUGAR do −2 da noite)
     Meditando  EH +2+Carisma · KA +1+Aura por hora
     Orando     sanidade +5 por hora
     Estudando  reputação +5 por hora
     Treinando  reputação +5 por hora
     Guerreiro e Ladino não recuperam karma.

   Decisões (24/09/2026): as horas de sono ACUMULAM (4h + 4h fecham um ciclo);
   o +5 de sono substitui o cansaço da noite; ninguém passa do máximo.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './clima-desgaste.jsx';

const { recuperacaoPorAtividade, decaimentoPorHoras, ATIVIDADES } = window;

const ctx = (extra) => ({
  atributos: { carisma: 2, fisico: 3, aura: 1 },
  maximos: { ef: 30, eh: 60, ka: 40 },
  semKarma: false,
  ...extra,
});
const est = (atividade, extra) => ({
  condicoes: { animo: 0, sanidade: 0, reputacao: 0 },
  vitalidade: { ef: 0, eh: 0, ka: 0 },
  atividade: atividade ? { tipo: atividade } : undefined,
  ...extra,
});

describe('ATIVIDADES — as cinco do pedido', () => {
  it('lista na ordem do pedido', () => {
    expect(ATIVIDADES.map((a) => a.id)).toEqual(['dormindo', 'meditando', 'orando', 'estudando', 'treinando']);
  });
});

describe('sem atividade não recupera nada', () => {
  it('estado passa intacto', () => {
    const e = est(null);
    expect(recuperacaoPorAtividade(e, 8, ctx())).toEqual(e);
  });
  it('zero horas não muda nada', () => {
    const e = est('meditando');
    expect(recuperacaoPorAtividade(e, 0, ctx())).toEqual(e);
  });
});

describe('Dormindo', () => {
  it('sono +5 por hora', () => {
    expect(recuperacaoPorAtividade(est('dormindo'), 3, ctx()).condicoes.animo).toBe(15);
  });

  it('a cada 8h: EH 10+Car, EF 1+Fís, KA 5+Aura', () => {
    const d = recuperacaoPorAtividade(est('dormindo'), 8, ctx());
    expect(d.vitalidade).toEqual({ ef: 4, eh: 12, ka: 6 });
    expect(d.atividade.horas_sono).toBe(0);
  });

  it('antes de fechar 8h não recupera energia, mas guarda as horas', () => {
    const d = recuperacaoPorAtividade(est('dormindo'), 5, ctx());
    expect(d.vitalidade).toEqual({ ef: 0, eh: 0, ka: 0 });
    expect(d.atividade.horas_sono).toBe(5);
  });

  it('horas quebradas somam: 5h + 3h fecham um ciclo', () => {
    const a = recuperacaoPorAtividade(est('dormindo'), 5, ctx());
    const b = recuperacaoPorAtividade(a, 3, ctx());
    expect(b.vitalidade).toEqual({ ef: 4, eh: 12, ka: 6 });
    expect(b.atividade.horas_sono).toBe(0);
  });

  it('17 horas são 2 ciclos e sobra 1', () => {
    const d = recuperacaoPorAtividade(est('dormindo'), 17, ctx());
    expect(d.vitalidade).toEqual({ ef: 8, eh: 24, ka: 12 });
    expect(d.atividade.horas_sono).toBe(1);
  });

  it('não passa do máximo', () => {
    const d = recuperacaoPorAtividade(est('dormindo', { vitalidade: { ef: 29, eh: 55, ka: 39 } }), 8, ctx());
    expect(d.vitalidade).toEqual({ ef: 30, eh: 60, ka: 40 });
  });

  it('barra sem valor gravado já está cheia e continua cheia', () => {
    const d = recuperacaoPorAtividade(est('dormindo', { vitalidade: {} }), 8, ctx());
    expect(d.vitalidade).toEqual({ ef: 30, eh: 60, ka: 40 });
  });

  it('sono para em +50', () => {
    const d = recuperacaoPorAtividade(est('dormindo', { condicoes: { animo: 48 } }), 2, ctx());
    expect(d.condicoes.animo).toBe(50);
  });
});

describe('Meditando', () => {
  it('EH 2+Car e KA 1+Aura por hora', () => {
    const d = recuperacaoPorAtividade(est('meditando'), 3, ctx());
    expect(d.vitalidade.eh).toBe(12);
    expect(d.vitalidade.ka).toBe(6);
    expect(d.vitalidade.ef).toBe(0);
  });
});

describe('Orando, Estudando, Treinando', () => {
  it('orando: sanidade +5 por hora', () => {
    expect(recuperacaoPorAtividade(est('orando'), 2, ctx()).condicoes.sanidade).toBe(10);
  });
  it('estudando: reputação +5 por hora', () => {
    expect(recuperacaoPorAtividade(est('estudando'), 2, ctx()).condicoes.reputacao).toBe(10);
  });
  it('treinando: reputação +5 por hora', () => {
    expect(recuperacaoPorAtividade(est('treinando'), 2, ctx()).condicoes.reputacao).toBe(10);
  });
  it('não tocam na energia', () => {
    expect(recuperacaoPorAtividade(est('orando'), 8, ctx()).vitalidade).toEqual({ ef: 0, eh: 0, ka: 0 });
  });
});

describe('Guerreiro e Ladino não recuperam karma', () => {
  it('dormindo', () => {
    expect(recuperacaoPorAtividade(est('dormindo'), 8, ctx({ semKarma: true })).vitalidade.ka).toBe(0);
  });
  it('meditando', () => {
    const d = recuperacaoPorAtividade(est('meditando'), 2, ctx({ semKarma: true }));
    expect(d.vitalidade.ka).toBe(0);
    expect(d.vitalidade.eh).toBe(8);
  });
});

describe('atributo negativo', () => {
  it('diminui a recuperação, mas nunca abaixo de zero', () => {
    const d = recuperacaoPorAtividade(est('dormindo'), 8, ctx({ atributos: { carisma: -3, fisico: -5, aura: 0 } }));
    expect(d.vitalidade.eh).toBe(7);
    expect(d.vitalidade.ef).toBe(0);
  });
});

describe('dormindo substitui o cansaço da noite', () => {
  it('decaimentoPorHoras não tira sono de quem dorme', () => {
    expect(decaimentoPorHoras({ animo: 0 }, 22, 4, null, 'dormindo').animo).toBe(0);
    expect(decaimentoPorHoras({ animo: 0 }, 22, 4, null).animo).toBe(-8);
  });
  it('fome e sede seguem valendo', () => {
    const d = decaimentoPorHoras({ nutricao: 0, hidratacao: 0 }, 22, 4, null, 'dormindo');
    expect(d.nutricao).toBe(-4);
    expect(d.hidratacao).toBe(-4);
  });
});

describe('textoEventoAtividade — a linha do log da mesa', () => {
  const { textoEventoAtividade } = window;
  it('começar, parar e trocar', () => {
    expect(textoEventoAtividade('Eco', null, 'dormindo')).toBe('Eco começou a dormir.');
    expect(textoEventoAtividade('Eco', 'meditando', null)).toBe('Eco parou de meditar.');
    expect(textoEventoAtividade('Eco', 'orando', 'estudando')).toBe('Eco parou de orar e começou a estudar.');
  });
  it('nada mudou não vira linha', () => {
    expect(textoEventoAtividade('Eco', null, null)).toBeNull();
  });
});

/* Revisão de 24/09/2026. A EF atual vai até −15 (a morte, EF_MORTE da
   batalha). A primeira versão prendia o resultado em 0: EF −10 dormindo
   saltava para 0 — e um morto voltava só desmaiado. */
describe('EF negativa e personagem morto', () => {
  it('EF negativa sobe o que a receita dá, sem saltar para zero', () => {
    const d = recuperacaoPorAtividade(est('dormindo', { vitalidade: { ef: -10, eh: 0, ka: 0 } }), 8, ctx());
    expect(d.vitalidade.ef).toBe(-6);
  });

  it('morto não recupera nada, nem sono', () => {
    const e = est('dormindo', { vitalidade: { ef: -15, eh: 0, ka: 0 } });
    expect(recuperacaoPorAtividade(e, 8, ctx({ morto: true }))).toEqual(e);
  });

  it('acima do máximo (elixir) não é puxado para baixo', () => {
    const d = recuperacaoPorAtividade(est('meditando', { vitalidade: { ef: 0, eh: 70, ka: 0 } }), 1, ctx());
    expect(d.vitalidade.eh).toBe(70);
  });
});
