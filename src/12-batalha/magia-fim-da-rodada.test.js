/* ============================================================
   magia-fim-da-rodada.test.js — evocação de 1 rodada
   ============================================================
   "Magias instantâneas são conjuradas no exato momento da ação do evocador,
    magias de evocação 1 rodada são executadas antes do último combatente da
    rodada." e "A rolagem do dado é na vez do jogador normalmente, o efeito da
    magia que é no final da rodada." (usuário, 28/09/2026)
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const M = window.MotorBatalha;
const UMA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', evocacao: '1 rodada' };
const DUAS = { key: 'meteoros', nome: 'Meteoros', evocacao: '2 rodadas' };
const INST = { key: 'x', nome: 'X', evocacao: 'Instantânea' };

const p = (id, ordem, extra = {}) => ({ inst_id: id, nome: id, ordem, status: 'ativo', atual: false,
  pa_rest: 1, karma: 10, ef: 30, eh: 10, ...extra });

describe('fase da evocação', () => {
  it('instantânea e 1 rodada rolam agora; 2+ rodadas largam', () => {
    expect(M.faseDeEvocacao(p('a', 1), INST)).toBe('resolucao');
    expect(M.faseDeEvocacao(p('a', 1), UMA)).toBe('resolucao');
    expect(M.faseDeEvocacao(p('a', 1), DUAS)).toBe('largada');
    expect(M.ehEvocacaoDeFimDaRodada(UMA)).toBe(true);
    expect(M.ehEvocacaoDeFimDaRodada(INST)).toBe(false);
  });
});

describe('guardar a magia pendente', () => {
  it('cobra PA e karma e guarda o pedido com o alvo enxuto', () => {
    const arr = [p('a', 1, { atual: true }), p('b', 2)];
    const payload = { tipo: 'magia', magia: UMA, alvo: { ...arr[1], status_temp: [1, 2, 3] }, dano: 12 };
    const next = M.guardarMagiaPendente(arr, 0, 'acao', payload, 3, 4);
    expect(next[0].pa_rest).toBe(0);
    expect(next[0].karma).toBe(7);
    expect(next[0].magia_pendente).toMatchObject({ tipo: 'acao', rodada: 4, magia_key: 'bola_de_fogo', magia_nome: 'Bola de Fogo' });
    expect(next[0].magia_pendente.payload.alvo).toEqual({ inst_id: 'b', tipo: undefined, ref_id: undefined, nome: 'b' });
    expect(next[1]).toBe(arr[1]);
  });

  it('cai pelos gatilhos da evocação (quebrarEvocacao)', () => {
    const arr = [p('a', 1, { magia_pendente: { magia_key: 'bola_de_fogo', magia_nome: 'Bola de Fogo', rodada: 1 } })];
    const next = M.quebrarEvocacao(arr, 'a', 'dano');
    expect(next[0].magia_pendente).toBeUndefined();
    expect(next[0].evocacao_quebrada).toMatchObject({ magia_key: 'bola_de_fogo', motivo: 'dano' });
  });
});

describe('quando a pendente sai', () => {
  const pend = { magia_key: 'bola_de_fogo', rodada: 2 };

  it('ainda não, enquanto a vez não chega ao último da ordem', () => {
    const arr = [p('a', 1, { magia_pendente: pend }), p('b', 2, { atual: true }), p('c', 3)];
    expect(M.pendenteParaResolver(arr, 2)).toBeNull();
  });

  it('antes do último combatente agir', () => {
    const arr = [p('a', 1, { magia_pendente: pend }), p('b', 2), p('c', 3, { atual: true })];
    expect(M.pendenteParaResolver(arr, 2).inst_id).toBe('a');
  });

  it('o conjurador é o último: espera a virada', () => {
    const arr = [p('b', 1), p('a', 2, { atual: true, magia_pendente: pend })];
    expect(M.pendenteParaResolver(arr, 2)).toBeNull();
    // Na rodada seguinte, a de uma rodada anterior sai já.
    expect(M.pendenteParaResolver([p('b', 1, { atual: true }), p('a', 2, { magia_pendente: pend })], 3).inst_id).toBe('a');
  });
});
