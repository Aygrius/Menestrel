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
// Centro (em células) do token cuja posição é o canto do bloco 2×2.
const centro = (pos) => ({ x: pos.x + T.TAB_TOKEN / 2, y: pos.y + T.TAB_TOKEN / 2 });

describe('clicar para mover centraliza o avatar no ponto clicado', () => {
  /* Token 2×2 desde 14/09/2026: o centro de um bloco par é um cruzamento de
     linhas, não o meio de uma célula. O avatar vai para o cruzamento mais
     perto do clique. */
  it('clique dentro do círculo: o centro do avatar cai no cruzamento mais perto', () => {
    const onMover = vi.fn(() => true);
    const { grade } = montar(heroi(), onMover);
    fireEvent.click(grade, { clientX: 18.3 * cel(), clientY: 14.8 * cel() });
    expect(onMover).toHaveBeenCalledTimes(1);
    const destino = onMover.mock.calls[0][2];
    expect(centro(destino)).toEqual({ x: 18, y: 15 });
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

  /* "O avatar dos participantes devem ter 2x2, aumente um pouco o nome. Remova
     a sombra dourada do avatar, deixe apenas o pulsar para indicar de quem é
     a vez." (usuário, 14/09/2026) */
  it('quem está na vez: só o anel pulsante, sem sombra dourada no avatar', () => {
    const { c } = montar(heroi(), () => true);
    const token = c.querySelector('.batalha-token--atual');
    expect(token.querySelector('.batalha-token-vez-ring')).toBeTruthy();
    expect(token.querySelector('.batalha-token-rosto').style.boxShadow).not.toMatch(/201,\s*164,\s*78/);
  });

  it('o avatar mede 2 células e o nome ficou maior', () => {
    const { c } = montar(heroi(), () => true);
    const size = Math.round(T.TAB_TOKEN_ESCALA * cel() * 0.95);
    const avatar = c.querySelector('.batalha-token-avatar');
    expect(parseFloat(avatar.style.width)).toBe(size);
    expect(T.TAB_TOKEN).toBe(T.TAB_TOKEN_ESCALA);
    expect(parseFloat(c.querySelector('.batalha-token-nome').style.fontSize)).toBe(Math.round(size * 0.32));
  });

  /* "No campo de batalha, quando eu clicar em 'mover', remova a opção de
     clicar em um adversário. Clicar em mover restringe apenas à
     movimentação." (usuário, 14/09/2026) */
  it('com o Mover armado, nenhum token recebe clique e Escape desarma', () => {
    const inimigo = { tipo: 'criatura', ref_id: 'o', inst_id: 'o', nome: 'Orc', status: 'ativo', atual: false,
      pos: { x: 14, y: 10 }, ef: 10, ef_max: 10 };
    const onMovendoChange = vi.fn();
    const menuDe = vi.fn(() => React.createElement('div', null, 'menu'));
    const render2 = (movendo) => render(React.createElement(Tabuleiro, {
      entradas: [{ p: heroi(), i: 0 }, { p: inimigo, i: 1 }], meta: {},
      podeSelecionar: (q) => q.inst_id === 'h', alcanceDe: (q) => T.movimentoDisponivel(q),
      onMover: () => true, salvando: false, isEn: false, tb: {},
      movendoControlado: movendo, onMovendoChange, menuDe,
    })).container;

    const armado = render2(0);
    const tokens = [...armado.querySelectorAll('.batalha-token')];
    expect(tokens.map((t) => t.style.pointerEvents)).toEqual(['none', 'none']);
    fireEvent.click(tokens[1]);
    expect(menuDe).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onMovendoChange).toHaveBeenCalledWith(null);
    cleanup();

    // Desarmado, o adversário volta a abrir o menu.
    const livre = render2(null);
    expect([...livre.querySelectorAll('.batalha-token')].map((t) => t.style.pointerEvents)).toEqual(['auto', 'auto']);
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
