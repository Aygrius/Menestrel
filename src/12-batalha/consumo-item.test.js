/* ============================================================
   consumo-item.test.js — baixa de item sem ressuscitar o que já foi
   ============================================================
   Bug que motivou o arquivo (auditoria 01/09/2026):

   O Mestre carrega `catalogos.pjById` UMA vez, quando a batalha vira
   'ativa', e o mantinha como fonte do inventário ao consumir um item. O
   jogador, na tela dele, consome pelo próprio cache. Os dois escrevem a
   linha INTEIRA de personagens.inventario.

   Resultado: jogador usa duas poções pela tela dele → o Mestre usa uma pelo
   painel → a escrita do Mestre parte do inventário de minutos atrás e as
   duas poções do jogador VOLTAM pra mochila.

   `consumirItemDoPJ` relê a linha imediatamente antes de escrever, então a
   baixa parte sempre do estado corrente.
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

const M = () => window.MotorBatalha;

const pjCom = (itens) => ({ id: 1, nome: 'Victor', inventario: { itens } });
const poc = (instanceId, quantidade) => ({ instanceId, slug: 'pocao', quantidade });

describe('consumirItemDoPJ', () => {
  it('baixa a quantidade e devolve o inventário novo', async () => {
    const tabelas = { personagens: [pjCom([poc('a', 3)])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const r = await M().consumirItemDoPJ(1, 'pocao', 2);
    expect(r.ok).toBe(true);
    expect(r.inventario.itens).toEqual([poc('a', 1)]);
    // E persistiu de fato.
    expect(tabelas.personagens[0].inventario.itens).toEqual([poc('a', 1)]);
  });

  it('distribui a baixa entre pilhas do mesmo slug', async () => {
    const tabelas = { personagens: [pjCom([poc('a', 2), poc('b', 3)])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const r = await M().consumirItemDoPJ(1, 'pocao', 4);
    expect(r.inventario.itens).toEqual([poc('b', 1)]);
  });

  it('NÃO ressuscita item que outra tela consumiu no meio do caminho', async () => {
    // O cenário do bug: a batalha começou com 5 poções e o Mestre tem esse
    // número no cache. O jogador gastou 2 pela tela dele. O Mestre gasta 1.
    // O certo é sobrar 2, não 4.
    const tabelas = { personagens: [pjCom([poc('a', 5)])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);

    // ...jogador consome 2 por fora, direto na tabela.
    tabelas.personagens[0] = pjCom([poc('a', 3)]);

    const r = await M().consumirItemDoPJ(1, 'pocao', 1);
    expect(r.inventario.itens).toEqual([poc('a', 2)]);
    expect(tabelas.personagens[0].inventario.itens).toEqual([poc('a', 2)]);
  });

  it('preserva os outros campos do inventário (moedas e cia.)', async () => {
    const tabelas = { personagens: [{ id: 1, inventario: { moedas: { ouro: 3 }, itens: [poc('a', 1)] } }] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const r = await M().consumirItemDoPJ(1, 'pocao', 1);
    expect(r.inventario.moedas).toEqual({ ouro: 3 });
    expect(r.inventario.itens).toEqual([]);
  });

  it('PJ sem inventário nenhum não quebra', async () => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [{ id: 1 }] });
    const r = await M().consumirItemDoPJ(1, 'pocao', 1);
    expect(r.ok).toBe(true);
    expect(r.inventario.itens).toEqual([]);
  });

  it('erro de leitura não vira escrita', async () => {
    let escreveu = false;
    globalThis.supabaseClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) }),
        update: () => ({ eq: () => { escreveu = true; return Promise.resolve({ error: null }); } }),
      }),
    };
    const r = await M().consumirItemDoPJ(1, 'pocao', 1);
    expect(r.ok).toBe(false);
    expect(escreveu).toBe(false);
  });
});

describe('os dois lados usam a função', () => {
  let fonte;
  it('Mestre e Jogador consomem pela mesma porta', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    expect((fonte.match(/consumirItemDoPJ\(/g) || []).length).toBeGreaterThanOrEqual(3);
    // E ninguém montou o inventário a partir do cache de novo.
    expect(fonte).not.toMatch(/const invAtual = \(pjAtual\.inventario/);
  });
});
