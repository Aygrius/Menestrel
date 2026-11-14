/* ============================================================
   virada-velocidade.test.js — auditoria 13/11/2026, item 21
   ============================================================
   A virada calculava PA e passo ANTES de decrementar os status, com a
   Velocidade que vencia naquela mesma virada: a ação extra (velocidade 30+)
   e o passo maior valiam uma rodada a mais.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.processarViradaDeRodada).toBeTypeOf('function'); });

const velocidade = (valor, rodadas) => ({ id: 'mag_velocidade', nome: 'Velocidade', rodadas_rest: rodadas,
  efeito: { tipo: 'mod_vb', valor } });
const lutador = (over = {}) => ({ inst_id: 'a', tipo: 'pj', status: 'ativo', vb: 20, pa_max: 1, pa_rest: 0,
  mov_rest: 0, ef: 20, ef_max: 20, eh: 0, eh_max: 0, status_temp: [], ...over });

describe('o bônus de velocidade que vence na virada', () => {
  it('última rodada do bônus: a rodada nova já vem SEM a ação extra', () => {
    const { participante } = M.processarViradaDeRodada(lutador({ status_temp: [velocidade(15, 1)] }));
    expect(participante.status_temp).toHaveLength(0);
    expect(participante.pa_rest).toBe(1);                  // 20 de velocidade: sem a ação extra
    expect(participante.mov_rest).toBe(M.processarViradaDeRodada(lutador()).participante.mov_rest);
  });
  it('bônus que continua: a ação extra segue valendo', () => {
    const { participante } = M.processarViradaDeRodada(lutador({ status_temp: [velocidade(15, 2)] }));
    expect(participante.pa_rest).toBe(2);
  });
  it('a lentidão que vence também solta já na virada', () => {
    const rapido = lutador({ vb: 35 });
    const { participante } = M.processarViradaDeRodada({ ...rapido, status_temp: [velocidade(-10, 1)] });
    expect(participante.pa_rest).toBe(2);                  // voltou aos 35
  });
});
