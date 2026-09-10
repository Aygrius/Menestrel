/* ============================================================
   bestiario-admin.test.jsx — o gate de admin nas listas do catálogo
   ============================================================
   O gate é CONVENIÊNCIA, não segurança: quem trava a escrita é a RLS
   (scripts/sql/admin-catalogo-rls.sql). Este arquivo cobre que o hook
   `useEhAdmin` resolve certo E que uma lista real (TecnicasList, a que
   pede menos fixture das 5) mostra/esconde o botão "Novo" e o lápis de
   acordo com ele — sem isso, o hook podia estar certo e a lista ainda
   ignorá-lo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';

// Uma técnica só, o bastante pra render de linha existir e o lápis ter onde aparecer.
const UMA_TECNICA = { id: 1, key: 'mira', nome: 'Mira', uso: 'Único', grupo_armas: '', grupo_armaduras: '', custo: 2 };

let respostaEhAdmin = false;
let TecnicasList;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin'
      ? { data: respostaEhAdmin, error: null }
      : { data: null, error: null }),
    from: (tabela) => ({ select: () => ({ order: async () => ({ data: tabela === 'tecnicas' ? [UMA_TECNICA] : [], error: null }) }) }),
  };
  // window.UI normalmente vem de components/ui-bridge.ts (kit shadcn), que
  // importa via alias "@/..." não configurado no vitest — dublê local com
  // tags nativas é suficiente pro que este arquivo verifica (presença dos
  // controles de admin, não estilo do kit).
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  await import('./ataques-criatura.jsx');
  await import('./criatura-formulas.jsx');
  await import('./catalogo-descritores.jsx');
  await import('./bestiario.jsx');
  TecnicasList = window.TecnicasList;
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

describe('TecnicasList — botão "Novo" e lápis de edição', () => {
  const ac = () => window.ADMIN_COPY.pt;
  const montar = () => render(<TecnicasList ac={ac()} lang="pt" />);
  const esperarLista = () => vi.waitFor(() => expect(document.body.textContent).toMatch(/Mira/));

  it('aparecem quando eh_admin devolve true', async () => {
    respostaEhAdmin = true;
    montar();
    await esperarLista();
    expect(document.querySelector('.btn-ghost.btn-sm')).toBeTruthy();
    expect(document.querySelector('.btn-icon.btn-sm[aria-label="Editar"]')).toBeTruthy();
  });

  it('somem quando eh_admin devolve false', async () => {
    respostaEhAdmin = false;
    montar();
    await esperarLista();
    expect(document.querySelector('.btn-ghost.btn-sm')).toBeNull();
    expect(document.querySelector('.btn-icon.btn-sm[aria-label="Editar"]')).toBeNull();
  });
});
