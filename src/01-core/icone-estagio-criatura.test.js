/* ============================================================
   icone-estagio-criatura.test.js — a patente pelo estágio
   ============================================================
   Pedido do usuário (25/09/2026): um ícone no nome das criaturas, pelo
   estágio — 1 a 5 C, 6 a 10 B, 11 a 15 A, 16 a 20 S, 21 a 25 X, 26 a 30 ✱.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './game-data.jsx';

const { iconeEstagioCriatura } = window;

describe('iconeEstagioCriatura', () => {
  it.each([
    [1, 'ti-hexagon-letter-c'], [5, 'ti-hexagon-letter-c'],
    [6, 'ti-hexagon-letter-b'], [10, 'ti-hexagon-letter-b'],
    [11, 'ti-hexagon-letter-a'], [15, 'ti-hexagon-letter-a'],
    [16, 'ti-hexagon-letter-s'], [20, 'ti-hexagon-letter-s'],
    [21, 'ti-hexagon-letter-x'], [25, 'ti-hexagon-letter-x'],
    [26, 'ti-hexagon-asterisk'], [30, 'ti-hexagon-asterisk'],
  ])('estágio %i → %s', (estagio, icone) => {
    expect(iconeEstagioCriatura(estagio)).toBe(icone);
  });

  it('acima de 30 continua no topo da escala', () => {
    expect(iconeEstagioCriatura(45)).toBe('ti-hexagon-asterisk');
  });

  it('estágio ausente ou inválido não tem ícone', () => {
    expect(iconeEstagioCriatura(null)).toBeNull();
    expect(iconeEstagioCriatura(0)).toBeNull();
    expect(iconeEstagioCriatura('x')).toBeNull();
  });

  it('aceita o estágio como texto', () => {
    expect(iconeEstagioCriatura('12')).toBe('ti-hexagon-letter-a');
  });
});
