/* ============================================================
   condicoes-encerrar.test.js — auditoria 13/11/2026, item 25
   ============================================================
   O encerramento gravava as condições do snapshot (a foto da entrada + o que
   a luta mexeu) por cima da ficha: as horas que o Mestre avançou no meio da
   batalha (fome, sede, sono) sumiam. Agora vale a ficha de agora mais o que
   a luta mudou.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.condicoesAoEncerrar).toBeTypeOf('function'); });

describe('condicoesAoEncerrar', () => {
  it('a fome cobrada no meio da luta fica; o que a luta mudou soma por cima', () => {
    const entrada = { nutricao: 40, hidratacao: 40, euforia: 0 };
    const finais = { nutricao: 40, hidratacao: 40, euforia: 10 };      // bebeu Fogo Vivo na luta
    const atuais = { nutricao: 32, hidratacao: 30, euforia: 0 };       // o relógio andou 4 horas
    expect(M.condicoesAoEncerrar(atuais, finais, entrada)).toEqual({ nutricao: 32, hidratacao: 30, euforia: 10 });
  });
  it('respeita o teto e o piso (a Temperatura tem sinal)', () => {
    const lim = window.COND_LIMITE || 50;
    const out = M.condicoesAoEncerrar({ nutricao: lim - 2, termorregulacao: -lim + 1 },
      { nutricao: 20, termorregulacao: -10 }, { nutricao: 10, termorregulacao: 0 });
    expect(out.nutricao).toBe(lim);
    expect(out.termorregulacao).toBe(-lim);
  });
  it('snapshot antigo, sem a foto da entrada: grava as finais, como antes', () => {
    expect(M.condicoesAoEncerrar({ nutricao: 1 }, { nutricao: 40 }, undefined)).toEqual({ nutricao: 40 });
  });
});

describe('estadoAoEncerrar usa a regra', () => {
  it('a ficha de agora + a diferença da luta', () => {
    const p = { tipo: 'pj', status: 'ativo', ef: 10, eh: 0, ar: 0, karma: 0, status_temp: [],
      condicoes: { nutricao: 40, animo: 35 }, condicoes_entrada: { nutricao: 40, animo: 40 } };
    const est = M.estadoAoEncerrar({ condicoes: { nutricao: 30, animo: 38 }, vitalidade: {} }, p, null);
    expect(est.condicoes).toMatchObject({ nutricao: 30, animo: 33 });
  });
});
