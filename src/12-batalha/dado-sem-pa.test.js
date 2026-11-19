/* ============================================================
   dado-sem-pa.test.js — verificação de 18/11/2026
   ============================================================
   1. Sem PA, nenhuma aba deixa rolar o dado. Rolar sem poder aplicar
      prendia o painel (o Cancelar some com a rolagem feita) — acontecia com
      só o ataque extra sobrando, ou com a instantânea da rodada já usada.
   2. O teste do Mestre passa a vez de quem ficou incapaz ou "sem ações",
      como o do Jogador (autoPassarSeNecessario) já fazia.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');

describe('o dado trava sem PA em toda aba', () => {
  it('habilidade, resistência, técnica com dado e apoio', () => {
    expect(fonte).toMatch(/tab === 'habilidade' \? !habilidadeSel \|\| semPA\b/);
    expect(fonte).toMatch(/tab === 'resistencia' \? alvoResist == null \|\| semPA\b/);
    expect(fonte).toMatch(/\(!tecSemDado && semPaParaTecnica\)\)/);
    expect(fonte).toMatch(/tab === 'apoio' \? alvoResist == null \|\| apoioForaDeAlcance \|\| semPaParaApoio/);
  });
});

describe('o teste do Mestre passa a vez de quem caiu', () => {
  it('confere status e sem_acoes, além do PA', () => {
    expect(fonte).toMatch(/if \(t\.atual && \(!temAcaoRestante\(t\) \|\| t\.status !== 'ativo' \|\| statusTemEfeito\(t, 'sem_acoes'\)\)\)/);
  });
});
