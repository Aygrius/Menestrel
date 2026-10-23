/* ============================================================
   criador-sem-tecnicas.test.jsx — técnicas pelo item (22/10/2026)
   ============================================================
   Técnica se aprende como magia: pergaminho ou manual no inventário, e o
   nível comprado entra na fila de treino. O criador perde o passo de
   técnicas, e a edição NÃO regrava "tecnicas" (a RPC aprender_tecnica e o
   relógio da mesa gravam por fora).
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
// As fases do topo e o passo atual (23/10/2026: os tracinhos viraram fases com nome).
const passos = () => [...document.querySelectorAll('.wiz-fase')].map((b) => b.getAttribute('aria-label'))
  .concat([...document.querySelectorAll('.wiz-passo-nome')].map((s) => s.textContent));

describe('criador sem técnicas', () => {
  it('criação: nenhum passo de técnicas', async () => {
    await montar({});
    expect(passos().join('|')).not.toMatch(/Técnica|Technique/);
  });
  it('edição: nenhum passo de técnicas', async () => {
    await montar({ personagemExistente: { ...PJ, profissao: 'Guerreiro' } });
    expect(passos().join('|')).not.toMatch(/Técnica|Technique/);
  });
  it('StepTecnicas saiu', () => {
    expect(window.StepTecnicas).toBeUndefined();
  });
});

describe('payload da edição', () => {
  it('não manda tecnicas', async () => {
    await montar({ personagemExistente: { ...PJ, tecnicas: { golpe: 1 } }, isMaster: true });
    const segs = [...document.querySelectorAll('.wiz-fase')];
    await act(async () => { fireEvent.click(segs[segs.length - 1]); });
    const salvar = document.querySelector('.ms-footer .btn-primary');
    await act(async () => { fireEvent.click(salvar); await new Promise((r) => setTimeout(r, 20)); });
    const upd = gravados.find((g) => g.tabela === 'personagens' && g.op === 'update');
    expect(upd, 'nenhum update em personagens').toBeTruthy();
    expect('tecnicas' in upd.payload).toBe(false);
  });
});
