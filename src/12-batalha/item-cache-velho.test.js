/* ============================================================
   item-cache-velho.test.js — auditoria 13/11/2026, item 27
   ============================================================
   A aba Item lê `catalogos.pjById`, carregado uma vez na largada. O Mestre
   usava a poção que o jogador já tinha bebido: o efeito saía e a baixa, sem
   achar o item, dizia ok. Agora a mochila é relida antes de aplicar.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.itemAindaNaMochila).toBeTypeOf('function'); });
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

const pocao = (q, extra) => ({ instanceId: 'p' + q, slug: 'pocao', quantidade: q, ...extra });

describe('itemAindaNaMochila', () => {
  it('o cache diz 2, o banco diz 0: não está mais', async () => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [{ id: 1, inventario: { itens: [] } }] });
    const catalogos = { pjById: { 1: { id: 1, inventario: { itens: [pocao(2)] } } } };
    expect(await M.itemAindaNaMochila(1, 'pocao', 1, catalogos)).toBe(false);
    // e o cache ficou com o que o banco tem, para a lista do painel
    expect(catalogos.pjById[1].inventario.itens).toEqual([]);
  });
  it('está no banco: segue', async () => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [{ id: 1, inventario: { itens: [pocao(3)] } }] });
    expect(await M.itemAindaNaMochila(1, 'pocao', 2, { pjById: {} })).toBe(true);
  });
  it('a pilha à venda não conta', async () => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [{ id: 1, inventario: { itens: [pocao(3, { anuncio_id: 9 })] } }] });
    expect(await M.itemAindaNaMochila(1, 'pocao', 1, { pjById: {} })).toBe(false);
  });
  it('no treino, o cache é a verdade', async () => {
    const catalogos = { treinamento: true, pjById: { 1: { inventario: { itens: [pocao(1)] } } } };
    expect(await M.itemAindaNaMochila(1, 'pocao', 1, catalogos)).toBe(true);
    expect(await M.itemAindaNaMochila(1, 'pocao', 2, catalogos)).toBe(false);
  });
});

describe('a trava de clique duplo espera o handler assíncrono', () => {
  it('o segundo clique durante a conferência é ignorado', async () => {
    let fila = Promise.resolve();
    const trava = M.criarTravaDeAcao(() => fila);
    let liberar; const leitura = new Promise((r) => { liberar = r; });
    let usos = 0;
    const usar = trava(async () => { await leitura; usos += 1; });
    usar(); usar();
    liberar(); await leitura; await Promise.resolve(); await Promise.resolve();
    expect(usos).toBe(1);
    usar(); await Promise.resolve(); await Promise.resolve();
    expect(usos).toBe(2);
  });
});

describe('os dois lados conferem antes de aplicar (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  it('Mestre e Jogador entregam a versão conferida ao painel', () => {
    expect(fonte).toContain('onAplicarItem={aplicarItemConferido}');
    expect(fonte).toContain('onAplicarItem={umaAcaoPorVez(handleItemConferido)}');
  });
});
