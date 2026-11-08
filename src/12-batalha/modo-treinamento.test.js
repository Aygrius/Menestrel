/* ============================================================
   modo-treinamento.test.js — a batalha de treino não grava na ficha
   ============================================================
   Pedido do usuário em 07/11/2026: "Crie na página de batalhas, um 'modo
   treinamento' para o mesmo simular e convidar jogadores. Esse modo não vai
   salvar os efeitos do combate na ficha."

   A batalha leva `treinamento` (scripts/sql/batalha-treinamento-2026-11-07.sql)
   e o flag viaja em `catalogos.treinamento`. Durante a luta, o item gasto, a
   flecha, o veneno e o saque mudam só o cache; no encerramento, a ficha, o
   inventário e as pools não são tocados, e o RPC só apaga a linha.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

const M = () => window.MotorBatalha;
const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');
const pjCom = (itens) => ({ id: 1, nome: 'Victor', inventario: { itens } });
const poc = (instanceId, quantidade) => ({ instanceId, slug: 'pocao', quantidade });

describe('no treino, o inventário muda só no cache da batalha', () => {
  it('consumir item não escreve no banco', async () => {
    const tabelas = { personagens: [pjCom([poc('a', 3)])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const catalogos = { treinamento: true, pjById: { 1: pjCom([poc('a', 3)]) } };
    const r = await M().consumirItemDoPJ(1, 'pocao', 2, catalogos);
    expect(r.ok).toBe(true);
    expect(r.inventario.itens).toEqual([poc('a', 1)]);
    expect(tabelas.personagens[0].inventario.itens).toEqual([poc('a', 3)]);
  });

  it('o saque não chega ao inventário do personagem', async () => {
    const tabelas = { personagens: [pjCom([])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const r = await M().gravarSaqueNoPj(1, 'pocao', 1, { treinamento: true, pjById: { 1: pjCom([]) } });
    expect(r.error).toBeNull();
    expect(tabelas.personagens[0].inventario.itens).toEqual([]);
  });

  it('batalha comum continua gravando', async () => {
    const tabelas = { personagens: [pjCom([poc('a', 3)])] };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const r = await M().consumirItemDoPJ(1, 'pocao', 1, { pjById: {} });
    expect(r.ok).toBe(true);
    expect(M().ehTreino({ pjById: {} })).toBe(false);
    expect(M().ehTreino({ treinamento: true })).toBe(true);
  });
});

describe('a fiação do treino', () => {
  it('as duas telas levam o flag da batalha para os catálogos', () => {
    expect(fonte.match(/cat\.treinamento = !!batalha\.treinamento;/g)).toHaveLength(2);
  });
  it('o encerramento pula a ficha, os animais, o desgaste e as pools', () => {
    expect(fonte).toMatch(/const treino = !!batalha\.treinamento;/);
    expect(fonte).toMatch(/if \(!treino && pjsDaBatalha\.length > 0\)/);
    expect(fonte).toMatch(/if \(!treino && donos\.length > 0\)/);
    expect(fonte).toMatch(/if \(!treino && comDesgaste\.length > 0\)/);
    expect(fonte).toMatch(/if \(!treino && historia && historia\.id\)/);
  });
  it('a escrita direta no inventário durante a luta só sobra no encerramento', () => {
    // alterarInventario( aparece no desvio do treino e nos dois passos do
    // encerramento (animais mortos e desgaste), que o treino já pula.
    const usos = fonte.split('\n').filter((l) => /\balterarInventario\(/.test(l) && !/^\s*(\/\/|\*)/.test(l));
    expect(usos).toHaveLength(3);
  });
  it('Batalha ou Treino é um rádio no topo da montagem, não um interruptor no trilho', () => {
    expect(fonte).toMatch(/className="nova-batalha-modo" role="radiogroup"/);
    expect(fonte).toMatch(/treino=\{treino\}\r?\n\s*onTreino=\{setTreino\}/);
    expect(fonte).not.toMatch(/batalha-treino-toggle/);
  });
  it('a batalha nova leva o flag só quando é treino', () => {
    expect(fonte).toMatch(/\.\.\.\(treino \? \{ treinamento: true \} : \{\}\)/);
  });
});
