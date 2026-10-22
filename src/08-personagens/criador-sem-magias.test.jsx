/* ============================================================
   criador-sem-magias.test.jsx — reforma de 22/10/2026
   ============================================================
   "Não teremos mais o stepper de magia na criação do personagem." Magia se
   aprende pelo item (inventário → Estudar). E a edição NÃO regrava
   `magias`: a RPC aprender_magia grava por fora, e um wizard aberto antes
   apagaria o que foi aprendido depois.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

// Supabase falso mínimo: lê vazio e guarda o que for gravado em personagens.
let gravados;
beforeEach(() => {
  gravados = [];
  const box = (tabela) => {
    const b = {
      select: () => b, eq: () => b, in: () => b, order: () => b, limit: () => b, single: () => b,
      range: () => Promise.resolve({ data: [], error: null }),
      update: (p) => { gravados.push({ tabela, op: 'update', payload: p }); return b; },
      insert: (p) => { gravados.push({ tabela, op: 'insert', payload: p }); return b; },
      then: (ok, f) => Promise.resolve({ data: [], error: null }).then(ok, f),
    };
    return b;
  };
  window.supabaseClient = {
    from: box,
    rpc: async () => ({ data: [], error: null }),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
  };
});
afterEach(cleanup);

const PJ = {
  id: 'p1', user_id: 'u', nome: 'Thalia', sobrenome: '', raca: 'Humano', genero: 'Feminino',
  reino: 'Verrogar', profissao: 'Mago', experiencia: 0, data_nasc: { dia: 3, mes: 2, ano: 1180 },
  intelecto_base: 0, aura_base: 0, carisma_base: 0, forca_base: 0, fisico_base: 0, agilidade_base: 0, percepcao_base: 0,
  habilidades: {}, magias: { luz: 1 }, tecnicas: {}, grupos_armas: {}, aprimoramentos: {}, caracterizacao: {},
};

async function montar(props) {
  render(<div className="menestrel-ui"><window.NovoPersonagemModal lang="pt" onClose={() => {}} onSaved={() => {}} {...props} /></div>);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
}
const passos = () => [...document.querySelectorAll('.wiz-progress-seg')].map((b) => b.getAttribute('aria-label'));

describe('criador sem magias', () => {
  it('Mago na criação: nenhum passo de magias', async () => {
    await montar({});
    expect(passos().join('|')).not.toMatch(/Magia|Spell/);
  });

  it('Mago na edição: nenhum passo de magias', async () => {
    await montar({ personagemExistente: PJ });
    expect(passos().join('|')).not.toMatch(/Magia|Spell/);
  });

  it('StepMagias saiu', () => {
    expect(window.StepMagias).toBeUndefined();
  });
});

describe('payload da edição', () => {
  it('não manda magias (a RPC aprender_magia grava por fora)', async () => {
    await montar({ personagemExistente: PJ, isMaster: true });
    // Edição: todos os passos liberados — vai direto à Revisão e salva.
    const segs = [...document.querySelectorAll('.wiz-progress-seg')];
    await act(async () => { fireEvent.click(segs[segs.length - 1]); });
    const salvar = document.querySelector('.ms-footer .btn-primary');
    expect(salvar.textContent).toMatch(/Salvar/);
    await act(async () => { fireEvent.click(salvar); await new Promise((r) => setTimeout(r, 20)); });
    const upd = gravados.find((g) => g.tabela === 'personagens' && g.op === 'update');
    expect(upd, 'nenhum update em personagens').toBeTruthy();
    expect('magias' in upd.payload).toBe(false);
  });
});
