/* ============================================================
   lore-abas.test.jsx — o Lore da aventura sem Item e Treinamento
   ============================================================
   "No menu lore de uma aventura, remova as abas 'treinamento' e 'item', pois
   a regra é que os personagens vão acessar apenas aquilo que eles possuem ou
   viram na loja, no menu lateral esquerdo." (usuário, 14/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './diario.jsx';

const consultadas = [];
beforeAll(() => {
  window.supabaseClient = {
    rpc: async (nome) => ({
      data: nome === 'listar_lore_historia' ? { ok: true, entradas: [] } : { ok: true, entradas: [] },
      error: null,
    }),
    from: (tabela) => {
      consultadas.push(tabela);
      return { select: () => ({ order: async () => ({ data: [], error: null }) }) };
    },
  };
});
afterEach(cleanup);

describe('GerenciarLoreView — abas', () => {
  it('só Criatura, NPC e Lugar: Item e Treinamento saíram', async () => {
    render(
      <div className="menestrel-ui">
        <window.GerenciarLoreView historia={{ id: 1, titulo: 'A Noite', protagonista_ids: [] }}
          lang="pt" onClose={() => {}} />
      </div>
    );
    const abas = await vi.waitFor(() => {
      const bs = [...document.querySelectorAll('.diario-subtabs button')];
      expect(bs.length).toBeGreaterThan(0);
      return bs;
    });
    expect(abas.map((b) => b.textContent.trim())).toEqual(['Criatura', 'NPC', 'Lugar']);
    expect(document.body.textContent).not.toMatch(/Treinamento/);
    // E nenhum catálogo de item/magia/habilidade/técnica é carregado por aqui.
    expect(consultadas.filter((t) => ['itens', 'itens_historia', 'magias', 'habilidades', 'tecnicas'].includes(t)))
      .toEqual([]);
  });
});
