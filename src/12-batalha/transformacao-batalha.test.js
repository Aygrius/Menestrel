/* ============================================================
   transformacao-batalha.test.js — Licantropia no meio da luta (22/10/2026)
   ============================================================
   "Tem que ser possível transformar no meio da batalha." (usuário)
   O status de transformação troca o corpo do snapshot (ajustarFormaSnapshot)
   e, ao fim da luta, vira magia ativa na ficha (transformacaoAoEncerrar).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Números de cada forma como montarSnapshots os prepara.
const FORMAS = {
  '':        { ef: 20, eh: 10, ka: 4, vb: 20, rf: 2, rm: 1, def: 3 },
  Lobisomem: { ef: 26, eh: 12, ka: 0, vb: 21, rf: 4, rm: 0, def: 3 },
  Vampiro:   { ef: 17, eh: 11, ka: 2, vb: 23, rf: 0, rm: 0, def: 5 },
};
const snap = (over) => ({
  tipo: 'pj', inst_id: 'i1', nome: 'Victor', status: 'ativo',
  ef: 15, ef_max: 20, eh: 10, eh_max: 10, karma: 4, karma_max: 4,
  vb: 22, rf: 2, rm: 1, defesa_valor: 3, defesa_sigla: 'L',
  subraca: null, subraca_base: null, formas: FORMAS, status_temp: [],
  ...over,
});
const LICANTROPIA = { id: 'mag_licantropia_lupina', nome: 'Licantropia Lupina', rodadas_rest: null,
  magia_key: 'licantropia_lupina', nivel: 1, dura_dias: 1,
  efeito: { tipo: 'transformacao', valor: true, subraca: 'Lobisomem' } };

describe('ajustarFormaSnapshot', () => {
  it('o status de Licantropia transforma: soma a diferença e mantém o dano levado', () => {
    const p = M.ajustarFormaSnapshot(snap({ status_temp: [LICANTROPIA] }));
    expect(p.subraca).toBe('Lobisomem');
    expect(p.ef_max).toBe(26);
    expect(p.ef).toBe(21);          // 15 + 6: os 5 de dano continuam
    expect(p.karma_max).toBe(0);
    expect(p.karma).toBe(0);
    expect(p.vb).toBe(23);          // 22 (com bônus de iniciativa) + 1
    expect(p.rf).toBe(4);
    expect(p.rm).toBe(0);
  });

  it('tirar o status devolve o corpo de antes (a do Mestre, se houver)', () => {
    const lobo = M.ajustarFormaSnapshot(snap({ status_temp: [LICANTROPIA] }));
    const volta = M.ajustarFormaSnapshot({ ...lobo, status_temp: [] });
    expect(volta.subraca).toBeNull();
    expect(volta.ef_max).toBe(20);
    expect(volta.ef).toBe(15);

    const vampiroQueVirouLobo = M.ajustarFormaSnapshot(snap({ subraca: 'Lobisomem', subraca_base: 'Vampiro',
      ef: 20, ef_max: 26, karma: 0, karma_max: 0 }));
    expect(vampiroQueVirouLobo.subraca).toBe('Vampiro');
    expect(vampiroQueVirouLobo.ef_max).toBe(17);
  });

  it('trocar de forma não derruba quem está de pé', () => {
    const p = M.ajustarFormaSnapshot(snap({ subraca: 'Lobisomem', ef: 2, ef_max: 26,
      status_temp: [], subraca_base: 'Vampiro' }));
    expect(p.ef_max).toBe(17);
    expect(p.ef).toBe(1);
  });

  it('quem já está caído continua caído', () => {
    const p = M.ajustarFormaSnapshot(snap({ ef: 0, status: 'desmaiado', status_temp: [LICANTROPIA] }));
    expect(p.ef).toBe(0);
  });

  it('sem `formas` (snapshot antigo) ou criatura: não mexe', () => {
    const antigo = snap({ formas: undefined, status_temp: [LICANTROPIA] });
    expect(M.ajustarFormaSnapshot(antigo)).toBe(antigo);
    const cri = { tipo: 'criatura', status_temp: [LICANTROPIA] };
    expect(M.ajustarFormaSnapshot(cri)).toBe(cri);
  });

  it('já na forma certa: devolve o mesmo objeto', () => {
    const p = snap({ subraca: 'Lobisomem', status_temp: [LICANTROPIA] });
    expect(M.ajustarFormaSnapshot(p)).toBe(p);
  });
});

describe('aplicarEfeitoMagia — o status da Licantropia', () => {
  it('leva a forma, o nível e a duração em dias', () => {
    const mag = { key: 'licantropia_lupina', nome: 'Licantropia Lupina', duracao: '1 dia',
      nivel_3: 'Transforma o evocador em Lobisomem.' };
    const p = M.aplicarEfeitoMagia(snap(), mag, 3);
    const st = p.status_temp.find((s) => s.efeito.tipo === 'transformacao');
    expect(st).toMatchObject({ magia_key: 'licantropia_lupina', nivel: 3, dura_dias: 1,
      efeito: { subraca: 'Lobisomem' } });
  });
});

describe('transformacaoAoEncerrar', () => {
  const fim = { dia: 10, mes: 3, ano: 1000 };

  it('evocada na luta: vira magia ativa com vencimento a partir do fim', () => {
    const r = M.transformacaoAoEncerrar([], snap({ status_temp: [LICANTROPIA] }), fim);
    expect(r.magias_ativas).toEqual([
      { key: 'licantropia_lupina', nome: 'Licantropia Lupina', nivel: 1, vence_em: { dia: 11, mes: 3, ano: 1000 } },
    ]);
  });

  it('vinda da ficha (semeada): fica como estava', () => {
    const naFicha = [{ key: 'licantropia_lupina', nivel: 1, vence_em: { dia: 11, mes: 3, ano: 1000 } }];
    expect(M.transformacaoAoEncerrar(naFicha, snap({ status_temp: [{ ...LICANTROPIA, semeada: true }] }), fim))
      .toEqual({});
  });

  it('tirada pelo Mestre na luta: sai também da ficha', () => {
    const bencao = { key: 'bencao', nivel: 1 };
    const naFicha = [{ key: 'licantropia_lupina', nivel: 1, vence_em: { dia: 11, mes: 3, ano: 1000 } }, bencao];
    expect(M.transformacaoAoEncerrar(naFicha, snap(), fim)).toEqual({ magias_ativas: [bencao] });
  });

  it('estadoAoEncerrar grava a magia ativa junto da vitalidade', () => {
    const novo = M.estadoAoEncerrar({}, snap({ status_temp: [LICANTROPIA] }), fim);
    expect(novo.magias_ativas).toHaveLength(1);
    expect(novo.vitalidade.ef).toBe(15);
  });
});
