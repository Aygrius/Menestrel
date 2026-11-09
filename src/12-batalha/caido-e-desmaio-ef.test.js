/* ============================================================
   caido-e-desmaio-ef.test.js — duas regras de 09/11/2026
   ============================================================
   1. "Combatentes caídos sofrem o dano ignorando a energia heroica."
      Caído = o status Caído (fc_caido / caido:) E o desmaiado.
   2. "O personagem que fica com energia física negativa, fica com 'zz'
      por 4 rodadas." Quando acabam, ele acorda — mesmo com a EF negativa.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const pj = (extra) => ({
  tipo: 'pj', inst_id: 'pj:1', nome: 'Nihil', status: 'ativo',
  ef: 10, ef_max: 10, eh: 20, eh_max: 20, ar: 0, res: 0,
  pa_max: 1, pa_rest: 0, vb: 10, status_temp: [], ...extra,
});
const atacante = { tipo: 'criatura', inst_id: 'cri:1', status: 'ativo', status_temp: [] };

describe('caído não se defende com a EH', () => {
  it('desmaiado: o golpe pula a EH', () => {
    expect(M.modsDoGolpe(atacante, pj({ status: 'desmaiado' })).ignoraEh).toBe(true);
  });
  it('status Caído, da Falha Crítica e do Mestre', () => {
    const fc = { id: 'fc_caido', nome: 'Caído', rodadas_rest: 1, efeito: { tipo: 'sem_acoes' } };
    const mestre = { id: 'caido:abc', nome: 'Caído', rodadas_rest: 2, efeito: { tipo: 'sem_acoes' } };
    expect(M.modsDoGolpe(atacante, pj({ status_temp: [fc] })).ignoraEh).toBe(true);
    expect(M.modsDoGolpe(atacante, pj({ status_temp: [mestre] })).ignoraEh).toBe(true);
  });
  it('de pé e sem status, a EH segue defendendo', () => {
    expect(M.modsDoGolpe(atacante, pj()).ignoraEh).toBe(false);
  });
});

describe('EF negativa: zz por 4 rodadas, depois acorda', () => {
  const virar = (p, n) => {
    let x = p;
    for (let i = 0; i < n; i += 1) x = M.processarViradaDeRodada(x).participante;
    return x;
  };

  it('o golpe que leva a EF abaixo de zero desmaia e conta 4 rodadas', () => {
    const p = M.aplicarDanoCascata(15, pj({ eh: 0 }), {});
    expect(p.ef).toBe(-5);
    expect(p.status).toBe('desmaiado');
    const zz = p.status_temp.find((s) => s.efeito.tipo === 'desmaio_ef');
    expect(zz.rodadas_rest).toBe(4);
  });

  it('segue desmaiado por 3 viradas e acorda na 4ª, com PA para agir', () => {
    const caido = M.aplicarDanoCascata(15, pj({ eh: 0 }), {});
    expect(virar(caido, 3).status).toBe('desmaiado');
    const acordado = virar(caido, 4);
    expect(acordado.status).toBe('ativo');
    expect(acordado.ef).toBe(-5);
    expect(acordado.pa_rest).toBeGreaterThan(0);
    expect(M.temDesmaioEf(acordado)).toBe(false);
  });

  it('a cura não acorda antes das 4 rodadas', () => {
    const caido = M.aplicarDanoCascata(15, pj({ eh: 0 }), {});
    const curado = M.statusPorPools({ ...caido, ef: 8, eh: 10 });
    expect(curado.status).toBe('desmaiado');
  });

  it('acordado com EF negativa: novo dano na EF derruba e conta de novo', () => {
    const acordado = virar(M.aplicarDanoCascata(15, pj({ eh: 0 }), {}), 4);
    const outra = M.aplicarDanoCascata(2, acordado, {});
    expect(outra.status).toBe('desmaiado');
    expect(outra.status_temp.find((s) => s.efeito.tipo === 'desmaio_ef').rodadas_rest).toBe(4);
  });

  it('o Mestre tirar o zz acorda na hora', () => {
    const caido = M.aplicarDanoCascata(15, pj({ eh: 0 }), {});
    const zz = caido.status_temp.find((s) => s.efeito.tipo === 'desmaio_ef');
    expect(M.removerStatusTempParticipante(caido, zz.id).status).toBe('ativo');
  });

  it('criatura segue a regra de antes (sem zz)', () => {
    const cri = M.aplicarDanoCascata(15, { ...pj({ eh: 0 }), tipo: 'criatura' }, {});
    expect(cri.status).toBe('desmaiado');
    expect(M.temDesmaioEf(cri)).toBe(false);
  });
});
