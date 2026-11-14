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
});
