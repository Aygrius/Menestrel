/* treino-relogio.test.js — o relógio da mesa move a fila de treino (22/10/2026)
   Quando o Mestre avança o tempo, o laço que já aplica desgaste e
   recuperação por atividade também chama aplicarTreinoNoPj e grava a fila e
   os níveis concluídos no MESMO update do personagem. A regra em si está
   testada em 01-core/treinos.test.js; aqui trava a ligação. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const fonte = readFileSync('src/10-shell/shell.jsx', 'utf8').replace(/\r\n/g, '\n');

describe('laço do relógio', () => {
  it('chama aplicarTreinoNoPj com a atividade e as horas', () => {
    expect(fonte).toMatch(/aplicarTreinoNoPj\(pj, tipoAtividade, horas\)/);
  });
  it('morto não treina', () => {
    expect(fonte).toMatch(/const treino = \(tipoAtividade && !morto/);
  });
  it('o update grava treinos, tecnicas e magias junto do estado', () => {
    expect(fonte).toMatch(/update\(\{ estado_atual: novo, \.\.\.\(treino \|\| \{\}\) \}\)/);
  });
});
