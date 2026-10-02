/* ============================================================
   tabuleiro-globais-batalha.test.js — o tabuleiro enxerga o motor
   ============================================================
   tabuleiro.jsx chama vbParaMovimento e statusTemEfeito por trás de um
   `typeof ... === 'function'`. As duas moram em batalha.jsx, que é um módulo
   ES: sem publicar no window, o typeof dá sempre 'undefined' e o tabuleiro
   caía no vb cru (o 2º passo do cavaleiro saía com as pernas dele, não as do
   cavalo) e deixava andar quem está com sem_acoes. Varredura de 28/09/2026.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const base = (over = {}) => ({
  inst_id: 'pj:1', tipo: 'pj', nome: 'Cavaleiro', status: 'ativo',
  vb: 8, pos: { x: 1, y: 1 }, pa_rest: 1, ...over,
});

describe('tabuleiro usa as regras do motor da batalha', () => {
  it('2º movimento do cavaleiro usa a velocidade da montaria', () => {
    const p = base({ montaria: { velocidade: 40 }, movimentos_na_rodada: 1 });
    expect(window.movimentoDisponivel(p)).toBe(10) // 40 × 5/20; o vb 8 dele daria o piso 5;
  });

  it('quem está com sem_acoes não anda', () => {
    const p = base({ atual: true, mov_rest: 5, status_temp: [{ efeito: { tipo: 'sem_acoes' } }] });
    const r = window.MotorTabuleiro.validarMovimento(p, { x: 2, y: 1 }, [p]);
    expect(r).toMatchObject({ ok: false, motivo: 'sem_acoes' });
  });
});
