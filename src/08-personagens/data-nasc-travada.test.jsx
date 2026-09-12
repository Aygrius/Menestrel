/* ============================================================
   data-nasc-travada.test.jsx — a data de nascimento não se edita depois
   ============================================================
   Pedido do usuário (12/09/2026): "os inputs de data de nascimento não devem
   ficar disponíveis para editar depois de criar o personagem, pode bloquear
   (mesmo para o mestre)".

   Exceção guardada aqui também: personagem antigo SEM data. A Identidade só
   avança com data preenchida, então travar um campo vazio deixaria a edição
   impossível de salvar.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

beforeAll(() => {
  const box = () => {
    const b = {
      select: () => b, eq: () => b, in: () => b, order: () => b, limit: () => b,
      range: () => Promise.resolve({ data: [], error: null }),
      then: (ok, f) => Promise.resolve({ data: [], error: null }).then(ok, f),
    };
    return b;
  };
  window.supabaseClient = { from: box, rpc: async () => ({ data: [], error: null }) };
});
afterEach(cleanup);

const PJ = { id: 'p1', user_id: 'u', nome: 'Thalia', raca: 'Humano', profissao: 'Guerreiro', reino: 'Verrogar', experiencia: 0 };

async function montar(props) {
  render(<div className="menestrel-ui"><window.NovoPersonagemModal lang="pt" onClose={() => {}} onSaved={() => {}} {...props} /></div>);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  const grade = document.querySelector('.fdp-grid');
  return {
    botoes: [...grade.querySelectorAll('button.select-pill-btn')],
    ano: grade.querySelector('input.fdp-ano'),
  };
}

describe('data de nascimento', () => {
  it('na criação, os campos ficam livres', async () => {
    const { botoes, ano } = await montar({});
    expect(botoes.every((b) => !b.disabled)).toBe(true);
    expect(ano.disabled).toBe(false);
  });

  it('ao editar, trava — inclusive para o Mestre', async () => {
    const { botoes, ano } = await montar({ personagemExistente: { ...PJ, data_nasc: { dia: 3, mes: 2, ano: 1180 } }, isMaster: true });
    expect(botoes.length).toBe(2);
    expect(botoes.every((b) => b.disabled)).toBe(true);
    expect(ano.disabled).toBe(true);
  });

  it('personagem antigo sem data pode preencher uma vez', async () => {
    const { botoes, ano } = await montar({ personagemExistente: { ...PJ, data_nasc: null }, isMaster: true });
    expect(botoes.every((b) => !b.disabled)).toBe(true);
    expect(ano.disabled).toBe(false);
  });
});
