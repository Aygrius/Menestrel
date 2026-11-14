/* ============================================================
   realtime-batalha.test.js — auditoria 13/11/2026, item 42
   ============================================================
   O realtime do Mestre ouvia só UPDATE (a batalha encerrada em outra aba
   seguia na tela) e o nome do canal era fixo — duas abas da mesma pessoa
   disputavam a assinatura, no Mestre e no Jogador.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const batalha = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
const personagens = fs.readFileSync(path.resolve(__dirname, '../08-personagens/personagens.jsx'), 'utf8');

describe('o realtime da batalha', () => {
  it('o canal do Mestre tem nome único por aba', () => {
    expect(batalha).toMatch(/\.channel\('batalha_mestre_' \+ batalha\.id \+ '_' \+ Math\.random\(\)/);
  });
  it('o Mestre ouve o DELETE da própria batalha e sai dela', () => {
    expect(batalha).toMatch(/event: 'DELETE', schema: 'public', table: 'batalhas'/);
    expect(batalha).toMatch(/String\(velha\.id\) !== String\(batalha\.id\)/);
  });
  it('o canal do Jogador também tem nome único', () => {
    expect(personagens).toMatch(/\.channel\('batalha_jogador_' \+ pjAtivoId \+ '_' \+ Math\.random\(\)/);
  });
});
