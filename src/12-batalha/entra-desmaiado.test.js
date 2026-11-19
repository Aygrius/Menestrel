/* ============================================================
   entra-desmaiado.test.js — auditoria 13/11/2026, item 22
   ============================================================
   O PJ que entrava na luta com a EF em zero ou menos (vivo) ficava desmaiado
   a luta inteira: entrava sem o `desmaio_ef` de 4 rodadas, e é o fim dele que
   o acorda. Agora entra contando, como quem cai no meio da luta.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

// Mesmo PJ mínimo de entrada-pools.test.js (Humano Guerreiro, EF 18).
const PJ = (estadoAtual) => ({
  id: 1, nome: 'Victor', user_id: 'u1',
  raca: 'Humano', profissao: 'Guerreiro', genero: 'Neutro', experiencia: 0,
  forca_base: 2, fisico_base: 1, agilidade_base: 0, percepcao_base: 0,
  intelecto_base: 0, aura_base: 0, carisma_base: 0,
  inventario: { itens: [] },
  estado_atual: estadoAtual,
});
const entrar = (estadoAtual) => {
  globalThis.supabaseClient = fakeSupabase({ personagens: [PJ(estadoAtual)], itens: [], criaturas: [] });
  return window.montarSnapshots([{ tipo: 'pj', ref_id: 1, nome: 'Victor' }], null);
};
const zz = (s) => (s.status_temp || []).filter((st) => st && st.efeito && st.efeito.tipo === 'desmaio_ef');

describe('o PJ que entra caído', () => {
  it('EF negativa: entra desmaiado E contando as 4 rodadas', async () => {
    const [s] = await entrar({ vitalidade: { ef: -3 } });
    expect(s.status).toBe('desmaiado');
    expect(zz(s)).toHaveLength(1);
    expect(zz(s)[0].rodadas_rest).toBe(4);
  });
  it('e acorda quando as 4 rodadas acabam', async () => {
    const [s] = await entrar({ vitalidade: { ef: -3 } });
    let p = s;
    for (let i = 0; i < 4; i++) p = window.MotorBatalha.processarViradaDeRodada(p).participante;
    expect(p.status).toBe('ativo');
    expect(p.desmaio_cumprido).toBe(true);
  });
  it('EF zero não conta: entra de pé (18/11/2026)', async () => {
    const [s] = await entrar({ vitalidade: { ef: 0 } });
    expect(zz(s)).toHaveLength(0);
  });
  it('de pé não ganha zz; morto também não', async () => {
    const [vivo] = await entrar({ vitalidade: { ef: 10 } });
    expect(zz(vivo)).toHaveLength(0);
    const [morto] = await entrar({ vitalidade: { ef: -15 } });
    expect(morto.status).toBe('morto');
    expect(zz(morto)).toHaveLength(0);
  });
});
