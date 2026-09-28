/* ============================================================
   dado-d20-critico.test.jsx — rolar de novo só no crítico
   ============================================================
   "Remova os botões 'rolar de novo' dos dados animados." e, depois, "Nos
   dados animados, falhas críticas e sucessos críticos dão direito a rolar o
   dado novamente." (usuário, 26/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
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
