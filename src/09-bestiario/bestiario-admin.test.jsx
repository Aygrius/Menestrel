/* ============================================================
   bestiario-admin.test.jsx — o gate de admin nas listas do catálogo
   ============================================================
   O gate é CONVENIÊNCIA, não segurança: quem trava a escrita é a RLS
   (scripts/sql/admin-catalogo-rls.sql). Este arquivo cobre só que os
   controles aparecem pra admin e somem pros demais.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';

let respostaEhAdmin = false;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin'
      ? { data: respostaEhAdmin, error: null }
      : { data: null, error: null }),
    from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }),
  };
  await import('./criatura-formulas.jsx');
  await import('./catalogo-descritores.jsx');
  await import('./bestiario.jsx');
});
afterEach(() => { cleanup(); respostaEhAdmin = false; });

describe('useEhAdmin', () => {
  it('devolve false antes da RPC responder e para não-admin', async () => {
    respostaEhAdmin = false;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it('devolve true quando a RPC diz que é admin', async () => {
    respostaEhAdmin = true;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(true));
  });
});

// Helper mínimo: renderiza um componente que só chama o hook.
function renderHook() {
  const result = { current: undefined };
  function Sonda() { result.current = window.useEhAdmin(); return null; }
  render(<Sonda />);
  return { result };
}
