/* ============================================================
   entrada-pools.test.js — o PJ entra em combate com a ficha
   ============================================================
   A outra ponta de ciclo-ficha-batalha.test.js: aqui é a IDA. O invariante
   é que o personagem entra em combate com os valores ATUAIS da ficha
   (personagens.estado_atual), não com barras cheias.

   Foco em AR. Decisão do usuário (01/09/2026): "o buff pode ficar acima
   fora de combate" — um elixir de Absorção leva o `ar` acima do ar_max de
   propósito (aplicarEfeitosItem e aplicarEfeitoItemSnapshot já não põem
   teto nesse escopo). A entrada cortava esse excedente com
   Math.min(arMax, ...) e o buff evaporava entre um combate e o seguinte.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

import { fakeSupabase } from '../test/fake-supabase.js';

// PJ mínimo: Humano Guerreiro estágio 1 (derivadas congeladas em
// game-data.test.js — EF 18, EH 14, karma 0).
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

describe('AR: o buff acima do máximo atravessa pro combate', () => {
  it('ar guardado acima do ar_max entra INTEIRO', () => {
    // Sem armadura equipada o ar_max é 0; o elixir deixou 8 na ficha.
    return entrar({ vitalidade: { ar: 8 } }).then(([s]) => {
      expect(s.ar).toBe(8);
      expect(s.ar_max).toBe(0);   // o teto continua sendo o da armadura real
    });
  });

  it('ar dentro do máximo entra como está', async () => {
    const [s] = await entrar({ vitalidade: { ar: 0 } });
    expect(s.ar).toBe(0);
  });

  it('ar negativo continua barrado pelo piso 0', async () => {
    const [s] = await entrar({ vitalidade: { ar: -5 } });
    expect(s.ar).toBe(0);
  });

  it('sem ar guardado, entra no máximo da armadura', async () => {
    const [s] = await entrar({ vitalidade: {} });
    expect(s.ar).toBe(0);
  });

  /* "Porque o Yuldrous tem 21 de absorção e 32 de resistência?" (usuário,
     14/09/2026): a ficha guardava ar 21, resto do tempo em que a absorção
     esvaziava; ele veste 32. Abaixo das peças, o valor gravado não vale. */
  it('ar guardado ABAIXO da armadura vestida entra no valor das peças', async () => {
    const pj = { ...PJ({ vitalidade: { ar: 21 } }), inventario: { itens: [
      { instanceId: 'c1', slug: 'cota', slot: 'peito', equipado: true },
    ] } };
    globalThis.supabaseClient = fakeSupabase({
      personagens: [pj], criaturas: [],
      itens: [{ slug: 'cota', nome: 'Cota', categoria_equip: 'armadura', absorcao: 32, resistencia: 32 }],
    });
    const [s] = await window.montarSnapshots([{ tipo: 'pj', ref_id: 1, nome: 'Victor' }], null);
    expect(s.ar_max).toBe(32);
    expect(s.ar).toBe(32);
    expect(s.res_max).toBe(32);
  });
});

describe('as demais pools continuam com teto', () => {
  it('EF e EH guardadas entram como estão', async () => {
    const [s] = await entrar({ vitalidade: { ef: 7, eh: 3 } });
    expect(s.ef).toBe(7);
    expect(s.eh).toBe(3);
  });

  it('EF/EH acima do máximo SÃO cortadas — só o AR é buffável', async () => {
    const [s] = await entrar({ vitalidade: { ef: 999, eh: 999 } });
    expect(s.ef).toBe(s.ef_max);
    expect(s.eh).toBe(s.eh_max);
  });

  it('EF sobrevive negativa até o piso de morte (caído/morto)', async () => {
    const [s] = await entrar({ vitalidade: { ef: -15 } });
    expect(s.ef).toBe(-15);
    expect(s.status).toBe('morto');
  });
});
