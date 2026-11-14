/* ============================================================
   motivo-evocacao-perdida.test.js — auditoria 13/11/2026, item 38
   ============================================================
   A evocação perdida dizia "sofreu dano na Energia Física" também quando o
   conjurador desmaiou com a EH zerada, sem a EF ser tocada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.quebrarConcentracaoPorDano).toBeTypeOf('function'); });

const mago = (over = {}) => ({ inst_id: 'm', nome: 'Mago', tipo: 'pj', status: 'ativo', ef: 10, ef_max: 10, eh: 5, eh_max: 5,
  status_temp: [], evocando: { magia_key: 'meteoros', magia_nome: 'Meteoros', rodadas_rest: 3, alvos: [] }, ...over });
const motivoDe = (antes, depois) => {
  const [p] = M.quebrarConcentracaoPorDano([depois], antes, depois);
  return p.evocacao_quebrada && p.evocacao_quebrada.motivo;
};

describe('o motivo da evocação perdida', () => {
  it('desmaiou pela EH, sem dano na EF: "desmaiado"', () => {
    expect(motivoDe(mago(), mago({ eh: 0, status: 'desmaiado' }))).toBe('desmaiado');
  });
  it('dano na EF, de pé: "dano"', () => {
    expect(motivoDe(mago(), mago({ ef: 6 }))).toBe('dano');
  });
  it('morreu: "morto"', () => {
    expect(motivoDe(mago(), mago({ ef: -15, status: 'morto' }))).toBe('morto');
  });
});
