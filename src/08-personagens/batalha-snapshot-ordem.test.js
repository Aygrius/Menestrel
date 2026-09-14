/* ============================================================
   batalha-snapshot-ordem.test.js — snapshot atrasado não volta a tela
   ============================================================
   "Resultado do ataque anterior está influenciando o novo ataque." (usuário,
   13/09/2026). Na tela do jogador cada evento da batalha dispara uma busca;
   duas buscas quase juntas podem voltar fora de ordem, e a mais velha
   chegando por último trazia de volta uma rolagem já aplicada — o Adrian
   atacou duas vezes com o mesmo d20 13 em 7 segundos.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

let novo;
beforeAll(() => { novo = window.maisNovaOuIgual; expect(novo).toBeTypeOf('function'); });

const b = (updated_at, id = 96) => ({ id, updated_at });

describe('maisNovaOuIgual', () => {
  it('snapshot mais velho da MESMA batalha não substitui o da tela', () => {
    expect(novo(b('2026-09-13T18:26:10Z'), b('2026-09-13T18:26:12Z'))).toBe(false);
  });
  it('mais novo ou igual substitui', () => {
    expect(novo(b('2026-09-13T18:26:12Z'), b('2026-09-13T18:26:10Z'))).toBe(true);
    expect(novo(b('2026-09-13T18:26:12Z'), b('2026-09-13T18:26:12Z'))).toBe(true);
  });
  it('outra batalha, batalha encerrada (null) ou tela vazia: aceita', () => {
    expect(novo(b('2026-09-13T18:00:00Z', 97), b('2026-09-13T18:26:12Z', 96))).toBe(true);
    expect(novo(null, b('2026-09-13T18:26:12Z'))).toBe(true);
    expect(novo(b('2026-09-13T18:26:12Z'), null)).toBe(true);
  });
});
