/* ============================================================
   saque-mestre-servidor.test.js — auditoria 13/11/2026, item 41
   ============================================================
   O saque do Mestre gravava o item e só depois anotava o `saqueado`: se a
   anotação falhasse, dava para saquear de novo, e dois saques simultâneos se
   sobrescreviam. Fora do treino, agora vai pela RPC saquear_criatura (item e
   anotação numa transação), como o do Jogador.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
const i = fonte.indexOf('<SaqueModal alvo={alvo} criatura={catalogos.criById[alvo.ref_id]}');
const corpo = fonte.slice(i, i + 2600);

describe('o saque do Mestre', () => {
  it('fora do treino, vai pela RPC, e só então a tela anota', () => {
    expect(i).toBeGreaterThan(0);
    const rpc = corpo.indexOf('await saquearPeloServidor(batalha.id, pj.ref_id, alvo.inst_id, slug, qtd, isEn)');
    expect(rpc).toBeGreaterThan(0);
    expect(corpo.indexOf('setParticipantes(next)')).toBeGreaterThan(rpc);
  });
  it('no treino, segue o cache (a RPC recusa treino)', () => {
    expect(corpo).toMatch(/if \(!batalha\.treinamento\) \{[\s\S]*?\} else \{[\s\S]*?gravarSaqueNoPj\(/);
  });
  // Revisão de 14/11/2026: a RPC lê a mesa do banco — a gravação em voo vai antes.
  it('Mestre e Jogador esperam a gravação em voo antes da RPC', () => {
    const chamadas = fonte.split('await saquearPeloServidor(').slice(1);
    expect(chamadas.length).toBe(2);
    const antes = fonte.split('await saquearPeloServidor(').slice(0, -1);
    antes.forEach((trecho) => {
      expect(trecho.slice(-900)).toMatch(/await filaGravacao\.current;\s*(?:\/\/[^\n]*\n\s*)*const r = $/);
    });
  });
});

const sql = fs.readFileSync(path.resolve(__dirname, '../../scripts/sql/saque-so-na-pilha-comum-2026-11-14.sql'), 'utf8');
describe('a RPC saquear_criatura só soma na pilha comum', () => {
  it('pula a pilha com estado próprio, como adicionarAoInventario', () => {
    ['montado', 'apelido', 'fabricado', 'quebrada', 'veneno', 'bonus'].forEach((k) => {
      expect(sql).toContain(`AND NOT public._menestrel_js_verdade(v_it->'${k}')`);
    });
    expect(sql).toContain("COALESCE(jsonb_typeof(v_it->'usos'), 'null') = 'null'");
    expect(sql).toContain("COALESCE(jsonb_typeof(v_it->'res'), 'null') = 'null'");
  });
});
