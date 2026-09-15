/* ============================================================
   revisao-batalha-1309.test.js — bugs achados na revisão de 13/09/2026
   ============================================================
   "Faça uma verificação em busca de bugs no sistema de batalha." Cada caso
   abaixo falhava antes da correção.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, fonte;
beforeAll(() => {
  M = window.MotorBatalha;
  fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
});

describe('crítico de criatura: o 175% sai do dano_100', () => {
  it('q7 de criatura não diz mais "(0 EF)"', () => {
    const ataque = { fonte: 'criatura', dano_100: 12 };
    const msg = M.interpolarCritico(M.CRITICOS_TABELA.DESARMADO[7], ataque);
    // "com N de dano adicional" desde 14/09/2026 (era "(N EF)").
    expect(msg).toContain('com 21 de dano adicional');   // ceil(12 × 1,75)
  });

  it('arma segue lendo `dano`', () => {
    expect(M.interpolarCritico('${d175}', { dano: 10 })).toBe('18');
  });
});

describe('buff de EF que expira não cura quem está caído', () => {
  it('EF negativa continua negativa quando mod_ef_temp sai', () => {
    const p = { ef: -8, ef_max: 26, eh: 5, eh_max: 5 };
    const removido = [{ efeito: { tipo: 'mod_ef_temp', valor: 6 } }];
    const r = M.expirarEhTemp(p, removido);
    expect(r.ef_max).toBe(20);
    expect(r.ef).toBe(-8);
  });
});

describe('jogador que desiste sendo o último da ordem', () => {
  it('a virada que ele provoca leva o dano por rodada para o log', () => {
    const i = fonte.indexOf('const handleDesistir = () => {');
    const corpo = fonte.slice(i, i + 2400);
    expect(corpo).toMatch(/registrarViradaNoLog\(log, virada\.eventos/);
  });
});

describe('largada da batalha usa a iniciativa EFETIVA', () => {
  it('iniciar ordena com ordenarIniciativaEfetiva', () => {
    const i = fonte.indexOf('const iniciar = async () => {');
    expect(fonte.slice(i, i + 3500)).toMatch(/ordenarIniciativaEfetiva\(snaps\)/);
  });
});
