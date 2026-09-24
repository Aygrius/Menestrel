/* ============================================================
   luz-do-horario.test.js — a luz do fundo segue a hora do jogo
   ============================================================
   "a iluminação dourada mais à direita representa o sol nascendo no leste, e a
    luz mais à esquerda se pondo no oeste. Já a iluminação fria mais à direita é
    o início da noite e a iluminação fria mais à esquerda é o fim da noite.
    Para ambos, a iluminação ao meio representa meio dia e meia noite, horário
    onde a luz ficará mais forte." (usuário, 20/09/2026)

   A hora mora no MESMO jsonb da data (historias.data_jogo_atual.hora), como o
   clima e o período antes dela — por isso chega a todo mundo pelo realtime que
   o CardDataJogoAtual já assinava, sem coluna nova nem migração.

   O período DEIXOU de ser um botão e passou a ser derivado da hora (6h–17h
   dia, 18h–5h noite). Mesa antiga não tem `hora` nenhuma, e é isso que o
   fallback cobre: enquanto ninguém definir a hora, vale o `periodo` que já
   estava gravado — senão toda mesa em curso amanheceria à meia-noite.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let periodoDaHora, faseDoPeriodo, luzDaHora;
beforeAll(() => {
  ({ periodoDaHora, faseDoPeriodo, luzDaHora } = globalThis);
  expect(periodoDaHora, 'periodoDaHora precisa estar no window').toBeTypeOf('function');
  expect(faseDoPeriodo, 'faseDoPeriodo precisa estar no window').toBeTypeOf('function');
  expect(luzDaHora, 'luzDaHora precisa estar no window').toBeTypeOf('function');
});

describe('periodoDaHora — onde o dia começa e termina', () => {
  it('6h é a primeira hora de dia e 17h a última', () => {
    expect(periodoDaHora(6)).toBe('dia');
    expect(periodoDaHora(12)).toBe('dia');
    expect(periodoDaHora(17)).toBe('dia');
  });

  it('18h é a primeira hora de noite e 5h a última', () => {
    expect(periodoDaHora(18)).toBe('noite');
    expect(periodoDaHora(23)).toBe('noite');
    expect(periodoDaHora(0)).toBe('noite');
    expect(periodoDaHora(5)).toBe('noite');
  });
});

describe('faseDoPeriodo — a travessia do céu, de 0 (nascente) a 1 (poente)', () => {
  it('o dia nasce em 6h, cruza o meio às 12h e se põe às 18h', () => {
    expect(faseDoPeriodo(6)).toBeCloseTo(0);
    expect(faseDoPeriodo(12)).toBeCloseTo(0.5);
    expect(faseDoPeriodo(17)).toBeCloseTo(11 / 12);
  });

  it('a noite começa em 18h, cruza o meio à meia-noite e termina às 6h', () => {
    // A virada de 23h para 0h é onde uma subtração ingênua manda a fase para
    // um número negativo e a luz salta do centro para fora da tela.
    expect(faseDoPeriodo(18)).toBeCloseTo(0);
    expect(faseDoPeriodo(23)).toBeCloseTo(5 / 12);
    expect(faseDoPeriodo(0)).toBeCloseTo(0.5);
    expect(faseDoPeriodo(5)).toBeCloseTo(11 / 12);
  });
});

describe('luzDaHora — de onde a luz vem e quão forte ela é', () => {
  it('nasce à direita, cruza o centro e se põe à esquerda', () => {
    expect(luzDaHora({ hora: 6 }).origemX).toBeCloseTo(100);
    expect(luzDaHora({ hora: 12 }).origemX).toBeCloseTo(50);
    expect(luzDaHora({ hora: 18 }).origemX).toBeCloseTo(100); // já é a noite nascendo
  });

  it('a noite percorre o mesmo caminho: início à direita, fim à esquerda', () => {
    expect(luzDaHora({ hora: 18 }).origemX).toBeGreaterThan(luzDaHora({ hora: 0 }).origemX);
    expect(luzDaHora({ hora: 0 }).origemX).toBeGreaterThan(luzDaHora({ hora: 5 }).origemX);
  });

  it('é mais forte ao meio-dia e à meia-noite do que no horizonte', () => {
    const meioDia = luzDaHora({ hora: 12 }).forca;
    const meiaNoite = luzDaHora({ hora: 0 }).forca;
    expect(meioDia).toBeGreaterThan(luzDaHora({ hora: 6 }).forca);
    expect(meioDia).toBeGreaterThan(luzDaHora({ hora: 17 }).forca);
    expect(meiaNoite).toBeGreaterThan(luzDaHora({ hora: 18 }).forca);
    expect(meiaNoite).toBeGreaterThan(luzDaHora({ hora: 5 }).forca);
  });

  it('nunca apaga de vez — mesmo no horizonte sobra luz na tela', () => {
    for (let h = 0; h < 24; h++) {
      const { forca } = luzDaHora({ hora: h });
      expect(forca).toBeGreaterThan(0);
      expect(forca).toBeLessThanOrEqual(1);
    }
  });

  it('o dia é quente e a noite é fria', () => {
    expect(luzDaHora({ hora: 12 }).quente).toBe(true);
    expect(luzDaHora({ hora: 0 }).quente).toBe(false);
  });
});

describe('mesa que ainda não tem hora', () => {
  it('cai no período que já estava gravado, no auge da luz', () => {
    // Sem esta regra, toda mesa em curso amanheceria à meia-noite no dia em
    // que o recurso subir.
    const dia = luzDaHora({ periodo: 'dia' });
    expect(dia.periodo).toBe('dia');
    expect(dia.hora).toBe(12);

    const noite = luzDaHora({ periodo: 'noite' });
    expect(noite.periodo).toBe('noite');
    expect(noite.hora).toBe(0);
  });

  it('mesa sem data nenhuma é meio-dia', () => {
    expect(luzDaHora(null).periodo).toBe('dia');
    expect(luzDaHora(null).hora).toBe(12);
    expect(luzDaHora({}).hora).toBe(12);
  });

  it('hora gravada ganha do período velho que sobrou no jsonb', () => {
    // O jsonb é reescrito inteiro a cada update e o `periodo` continua lá por
    // compatibilidade; quem manda na luz é a hora.
    expect(luzDaHora({ hora: 3, periodo: 'dia' }).periodo).toBe('noite');
  });

  it('hora inválida não derruba a tela', () => {
    expect(luzDaHora({ hora: 99 }).hora).toBe(12);
    expect(luzDaHora({ hora: -1 }).hora).toBe(12);
    expect(luzDaHora({ hora: 'tarde' }).hora).toBe(12);
  });
});

describe('estiloLuzFundo — o que o fundo do console recebe pronto', () => {
  /* O AdminConsole não faz conta: ele recebe os cinco valores que mudam e
     aplica. É o que permite testar a iluminação sem montar o console inteiro,
     com sessão, perfil e mesa. */
  let estiloLuzFundo;
  beforeAll(() => {
    estiloLuzFundo = globalThis.estiloLuzFundo;
    expect(estiloLuzFundo, 'estiloLuzFundo precisa estar no window').toBeTypeOf('function');
  });

  it('a máscara nasce à direita e se põe à esquerda', () => {
    expect(estiloLuzFundo({ hora: 6 }).mask).toContain('at 100% 0%');
    expect(estiloLuzFundo({ hora: 12 }).mask).toContain('at 50% 0%');
    expect(estiloLuzFundo({ hora: 17 }).mask).toMatch(/at 8\.3\d+% 0%/);
  });

  it('os raios deitam no horizonte e ficam a pino no auge', () => {
    expect(estiloLuzFundo({ hora: 6 }).transform).toBe('skewX(-45deg)');
    expect(estiloLuzFundo({ hora: 12 }).transform).toBe('skewX(0deg)');
    expect(estiloLuzFundo({ hora: 17 }).transform).toMatch(/^skewX\(3[0-9.]+deg\)$/);
  });

  it('a opacidade acompanha a força da luz', () => {
    expect(estiloLuzFundo({ hora: 12 }).opacity).toBeGreaterThan(estiloLuzFundo({ hora: 6 }).opacity);
    expect(estiloLuzFundo({ hora: 0 }).opacity).toBeGreaterThan(estiloLuzFundo({ hora: 18 }).opacity);
  });

  it('o dia é ouro e bronze; a noite, luar de aço', () => {
    const dia = estiloLuzFundo({ hora: 12 });
    expect(dia.corA).toBe('rgba(201,164,78,1)');
    expect(dia.corB).toBe('rgba(184,112,46,1)');

    const noite = estiloLuzFundo({ hora: 0 });
    expect(noite.corA).not.toBe(dia.corA);
    expect(noite.corA).toMatch(/^rgba\(\d+,\d+,\d+,1\)$/);
  });

  /* Os filetes são um degradê que some para baixo — a cor opaca em cima, a
     MESMA cor transparente embaixo. Trocar só a de cima deixaria o rastro
     dourado no pé de uma noite de luar. */
  it('os filetes desvanecem na própria cor', () => {
    const { gradA, gradB } = estiloLuzFundo({ hora: 0 });
    expect(gradA).toBe('linear-gradient(rgba(143,166,196,1) 0%, rgba(143,166,196,0) 100%)');
    expect(gradB).toBe('linear-gradient(rgba(92,115,146,1) 0%, rgba(92,115,146,0) 100%)');
  });

  it('mesa sem hora nenhuma continua pintando (meio-dia)', () => {
    expect(estiloLuzFundo(null).mask).toContain('at 50% 0%');
  });
});

describe('o auge da travessia é o ponto alto da luz (20/09/2026)', () => {
  /* "Torne os horários 12h e 24h mais claros" (usuário). A opacidade batia em
     0.1 ao meio-dia — teto baixo demais pra quem passa a sessão inteira nesta
     tela. O que subiu foi o AUGE: o horizonte segue discreto, senão o dia
     inteiro vira um borrão claro e o meio-dia deixa de ser um lugar. */
  let estiloLuzFundo;
  beforeAll(() => { estiloLuzFundo = globalThis.estiloLuzFundo; });

  it('o meio-dia brilha muito mais do que brilhava', () => {
    expect(estiloLuzFundo({ hora: 12 }).opacity).toBeGreaterThan(0.2);
  });

  it('e a meia-noite recebe exatamente o mesmo auge', () => {
    expect(estiloLuzFundo({ hora: 0 }).opacity)
      .toBeCloseTo(estiloLuzFundo({ hora: 12 }).opacity);
  });

  it('o nascente e o poente seguem discretos', () => {
    expect(estiloLuzFundo({ hora: 6 }).opacity).toBeLessThan(0.05);
    expect(estiloLuzFundo({ hora: 12 }).opacity)
      .toBeGreaterThan(estiloLuzFundo({ hora: 6 }).opacity * 5);
  });

  /* A corcova estreitou: o auge tem que se destacar das horas vizinhas, não
     levantar a tarde inteira junto. */
  it('duas horas antes do auge a luz já cedeu', () => {
    const r = estiloLuzFundo({ hora: 10 }).opacity / estiloLuzFundo({ hora: 12 }).opacity;
    expect(r).toBeLessThan(0.85);
  });

  it('a máscara abre no auge e fecha no horizonte', () => {
    expect(estiloLuzFundo({ hora: 12 }).mask).toContain('175%');
    expect(estiloLuzFundo({ hora: 6 }).mask).toContain('125%');
  });
});
