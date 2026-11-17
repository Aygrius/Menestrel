/* ============================================================
   dado-d20-critico.test.jsx — rolar de novo só no crítico
   ============================================================
   "Remova os botões 'rolar de novo' dos dados animados." e, depois, "Nos
   dados animados, falhas críticas e sucessos críticos dão direito a rolar o
   dado novamente." (usuário, 26/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './dado-d20.jsx';

let Overlay;
beforeAll(() => { Overlay = window.RolagemD20Overlay; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

// Fixa o sorteio: 0,99 → 20; 0 → 1; 0,5 → 11.
const rolar = (aleatorio, props = {}) => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(aleatorio);
  render(<div className="menestrel-ui"><Overlay nome="Teste" total={5} dificuldade="medio" lang="pt" onClose={() => {}} {...props} /></div>);
  act(() => { vi.advanceTimersByTime(260 + 800); });
};
const botao = () => document.querySelector('[data-rolar-de-novo]');

describe('rolar de novo: só no crítico', () => {
  it('20 (Absurdo) dá direito a rolar de novo', () => {
    rolar(0.99);
    expect(botao()).toBeTruthy();
  });

  it('1 (Falha Crítica) também', () => {
    rolar(0);
    expect(botao()).toBeTruthy();
  });

  it('um resultado comum não tem o botão', () => {
    rolar(0.5);
    expect(botao()).toBeNull();
  });

  it('no modo livre, o 1 e o 20 do dado', () => {
    rolar(0.99, { livre: true });
    expect(botao()).toBeTruthy();
    cleanup(); vi.useRealTimers(); vi.restoreAllMocks();
    rolar(0.5, { livre: true });
    expect(botao()).toBeNull();
  });
});

/* 17/11/2026, usuário: "Rolar novamente, quando o resultado é crítico, não é
   uma escolha. É consequência. Mas o jogador deve clicar para rolar." */
describe('no crítico, rolar de novo é obrigatório (e é no clique)', () => {
  const concluir = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Concluir');
  it('no crítico não há Concluir: o único botão é o de rolar', () => {
    rolar(0.99);
    expect(botao()).toBeTruthy();
    expect(concluir()).toBeUndefined();
  });
  it('no crítico o Esc não fecha', () => {
    const onClose = vi.fn();
    rolar(0, { onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
  it('fora do crítico, Concluir fecha e o Esc também', () => {
    const onClose = vi.fn();
    rolar(0.5, { onClose });
    expect(concluir()).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
  it('o dado só rola de novo quando o jogador clica', () => {
    const onResultado = vi.fn();
    rolar(0.99, { onResultado });
    expect(onResultado).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onResultado).toHaveBeenCalledTimes(1);
    fireEvent.click(botao());
    act(() => { vi.advanceTimersByTime(1200); });
    expect(onResultado).toHaveBeenCalledTimes(2);
  });
});
