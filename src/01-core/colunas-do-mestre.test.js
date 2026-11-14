/* ============================================================
   colunas-do-mestre.test.js — o gatilho do banco espelha o game-data
   ============================================================
   Auditoria de 13/11/2026, item 3: o gatilho personagens_colunas_do_mestre
   (scripts/sql/colunas-do-mestre-e-saque-por-rpc-2026-11-14.sql) recusa
   atributos que passam dos pontos do estágio. A conta do banco é
     15 + ⌊(estágio−1)/2⌋ + TETO − Σ custo(base)
   com a tabela de custo e o TETO racial COPIADOS do game-data. Mexer num
   lado sem o outro faz o banco recusar uma evolução que a tela aceitou —
   este teste quebra antes.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './game-data.jsx';

const sql = readFileSync(resolve(__dirname, '../../scripts/sql/colunas-do-mestre-e-saque-por-rpc-2026-11-14.sql'), 'utf8');
const G = window;

describe('gatilho das colunas do Mestre ↔ game-data', () => {
  it('a tabela de custo do banco é a do game-data', () => {
    const corpo = sql.match(/_menestrel_custo_atributo\(v integer\)[\s\S]*?\$\$([\s\S]*?)\$\$/)[1];
    const doBanco = Object.fromEntries([...corpo.matchAll(/WHEN (-?\d+) THEN (-?[\d.]+)/g)]
      .map(([, v, c]) => [v, Number(c)]));
    expect(doBanco).toEqual(Object.fromEntries(
      Object.entries(G.GAME_DATA.custoAtributo).map(([v, c]) => [v, Number(c)])));
  });

  it('o TETO racial do banco é o do game-data', () => {
    const teto = Number(sql.match(/\+ (\d+) \/\* TETO racial \*\//)[1]);
    // valor dos níveis iniciais + bônus = o teto, para qualquer raça jogável.
    const racas = Object.entries(G.GAME_DATA.racas).filter(([, r]) => r && !r.forma);
    expect(racas.length).toBeGreaterThan(0);
    racas.forEach(([nome, r]) => {
      const valor = Object.values(r.mods || {}).reduce((s, v) => s + G.custoAtributo(v), 0);
      expect(valor + G.bonusPontosRaca(nome)).toBe(teto);
    });
  });

  it('a pool do banco é pontosDisponiveis sem a parte da raça', () => {
    expect(sql).toMatch(/15 \+ \(public\._menestrel_estagio\(xp\) - 1\) \/ 2/);
    expect(G.pontosAtributosTotal(1, undefined)).toBe(15);
    expect(G.pontosAtributosTotal(3, undefined)).toBe(16);
  });
});
