/* ============================================================
   movimento-centro.test.jsx — o avatar para onde o clique caiu
   ============================================================
   "Quando eu clico em mover meu personagem na batalha, eu quero que ele fique
   centralizado onde eu clicar. A área redonda deve ser o limite do centro do
   avatar." (usuário, 13/09/2026)

   Em jsdom o getBoundingClientRect da grade é zero, então clientX/clientY são
   os pixels da própria grade. Uma célula tem TAB_CELULA × zoom padrão.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let T, Tabuleiro;
beforeAll(() => { T = window.MotorTabuleiro; Tabuleiro = window.TabuleiroBatalha; });
afterEach(cleanup);

const heroi = (extra) => ({
  tipo: 'pj', ref_id: 'h', inst_id: 'h', nome: 'Herói', status: 'ativo', atual: true,
  pos: { x: 10, y: 10 }, vb: 20, mov_rest: 10, pa_rest: 2,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ...extra,
});

function montar(p, onMover) {
  const c = render(React.createElement(Tabuleiro, {
    entradas: [{ p, i: 0 }], meta: {},
    podeSelecionar: () => true, alcanceDe: (q) => T.movimentoDisponivel(q),
    onMover, salvando: false, isEn: false, tb: {},
    movendoControlado: 0, onMovendoChange: () => {},
  })).container;
  return { c, grade: c.querySelector('.batalha-tabuleiro-scroll > div') };
}

const cel = () => T.TAB_CELULA * T.TAB_ZOOMS[3];
// Centro (em células) do token cuja posição é o canto do bloco 3×3.
const centro = (pos) => ({ x: pos.x + T.TAB_TOKEN / 2, y: pos.y + T.TAB_TOKEN / 2 });

describe('clicar para mover centraliza o avatar no ponto clicado', () => {
  it('clique dentro do círculo: o centro do avatar cai no meio da célula clicada', () => {
    const onMover = vi.fn(() => true);
    const { grade } = montar(heroi(), onMover);
    const alvo = { x: 18, y: 14 };
    fireEvent.click(grade, { clientX: (alvo.x + 0.5) * cel(), clientY: (alvo.y + 0.5) * cel() });
    expect(onMover).toHaveBeenCalledTimes(1);
    const destino = onMover.mock.calls[0][2];
    expect(centro(destino)).toEqual({ x: alvo.x + 0.5, y: alvo.y + 0.5 });
  });

  it('o círculo tem raio igual ao passo, medido do CENTRO do avatar', () => {
    const { c } = montar(heroi(), () => true);
    const halo = c.querySelector('.batalha-tabuleiro-alcance');
    expect(halo).toBeTruthy();
    const raio = 10 * cel();
    expect(parseFloat(halo.style.width)).toBe(raio * 2);
    const cx = parseFloat(halo.style.left) + raio;
    const cy = parseFloat(halo.style.top) + raio;
    expect(cx).toBe(centro({ x: 10, y: 10 }).x * cel());
    expect(cy).toBe(centro({ x: 10, y: 10 }).y * cel());
  });

  it('todo centro dentro do círculo é aceito, e nenhum fora dele', () => {
    const p = heroi();
    for (let dx = -12; dx <= 12; dx++) {
      for (let dy = -12; dy <= 12; dy++) {
        if (!dx && !dy) continue;
        const ok = T.validarMovimento(p, { x: 10 + dx, y: 10 + dy }, [p]).ok;
        expect([dx, dy, ok]).toEqual([dx, dy, Math.hypot(dx, dy) <= 10]);
      }
    }
  });
});
