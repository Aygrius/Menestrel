/* ============================================================
   narracao-golpe.test.jsx — a narração do golpe para o Mestre (11/11/2026)
   ============================================================
   Usuário: "Adicione para a notificação do mestre, a narração personalizada
   da ação do combatente. Crie pelo menos três frases para cada tipo de
   arma/magia VS cada tipo de defesa."
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './narracao-golpe.jsx';

afterEach(cleanup);

const N = () => window.NARRACAO_GOLPE;

describe('as frases', () => {
  it('pelo menos três frases para cada arma/magia contra cada defesa, todas diferentes', () => {
    const tipos = ['CORTE', 'PERFURACAO', 'ESMAGAMENTO', 'DESARMADO', 'fogo', 'agua', 'ar', 'terra', 'luz', 'trevas', 'arcano'];
    expect(Object.keys(N().encontro).sort()).toEqual([...tipos].sort());
    const todas = [];
    for (const t of tipos) {
      for (const d of ['L', 'M', 'P']) {
        const lista = N().encontro[t][d];
        expect(lista.length, `${t}/${d}`).toBeGreaterThanOrEqual(3);
        lista.forEach((f) => { expect(f).toMatch(/\{a\}/); expect(f).toMatch(/\{b\}/); });
        todas.push(...lista);
      }
    }
    expect(new Set(todas).size).toBe(todas.length);
    Object.values(N().desfecho).forEach((lista) => expect(lista.length).toBeGreaterThanOrEqual(3));
  });
  it('o elemento da magia cai na família certa', () => {
    const f = N().familiaDoElemento;
    expect(f('Fogo')).toBe('fogo');
    expect(f('Água')).toBe('agua');
    expect(f('celestial')).toBe('luz');
    expect(f('infernal')).toBe('trevas');
    expect(f('Escuridão')).toBe('trevas');
    expect(f(null)).toBe('arcano');
  });
});

describe('a narração de um golpe', () => {
  const primeira = () => 0;   // sempre a primeira frase
  it('espada contra placas, ferindo: o encontro e o desfecho, com os primeiros nomes', () => {
    const t = window.narrarGolpe({
      tipo: 'arma', golpeTipo: 'CORTE', defesaSigla: 'P', autorNome: 'Kael Ventoleste', alvoNome: 'Orc Batedor',
      resultado: { codigo: 'M', erra: false }, dano: 12, onde: { eh: 0, ef: 12 }, sortear: primeira,
    });
    expect(t).toBe('Kael mira as juntas das placas de Orc, onde o aço não cobre. O golpe atravessa e abre uma ferida em Orc.');
  });
  it('bola de fogo contra couro, e o alvo esquiva', () => {
    const t = window.narrarGolpe({
      tipo: 'magia', elemento: 'fogo', defesaSigla: 'L', autorNome: 'Lirael', alvoNome: 'Lobo',
      resultado: { codigo: 'R', erra: true }, dano: 0, sortear: primeira,
    });
    expect(t).toMatch(/^As chamas de Lirael saltam .* couro de Lobo\. Mas Lobo se esquiva no último instante\.$/);
  });
  it('cada desfecho: falha crítica, crítico, só a armadura, só a energia heroica', () => {
    const d = N().desfechoDoGolpe;
    expect(d({ resultado: { codigo: 'FC', erra: true } })).toBe('falha');
    expect(d({ resultado: { codigo: 'A' }, dano: 30, critico: true })).toBe('critico');
    expect(d({ resultado: { codigo: 'F' }, dano: 0 })).toBe('armadura');
    expect(d({ resultado: { codigo: 'F' }, dano: 5, onde: { eh: 5, ef: 0 } })).toBe('heroica');
    expect(d({ resultado: { codigo: 'F' }, dano: 5, onde: { eh: 0, ef: 0 } })).toBe('armadura');
  });
  it('defesa desconhecida conta como leve; golpe desconhecido como desarmado', () => {
    const t = window.narrarGolpe({ tipo: 'arma', golpeTipo: '??', defesaSigla: null, autorNome: 'A', alvoNome: 'B',
      resultado: { codigo: 'R', erra: true }, sortear: primeira });
    expect(t.startsWith('A avança de mãos nuas')).toBe(true);
  });
});

describe('ligações', () => {
  const src = (p) => readFileSync(resolve(__dirname, p), 'utf8');
  it('a batalha grava a narração no meta dos dois registros de golpe (Mestre e Jogador)', () => {
    expect(src('./batalha.jsx').match(/\.\.\.metaNarracaoDoGolpe\(/g) || []).toHaveLength(2);
  });
  it('o módulo carrega antes da batalha', () => {
    const main = src('../main.tsx');
    expect(main.indexOf("'./12-batalha/narracao-golpe.jsx'")).toBeGreaterThan(-1);
    expect(main.indexOf("'./12-batalha/narracao-golpe.jsx'")).toBeLessThan(main.indexOf("'./12-batalha/batalha.jsx'"));
  });
  it('só o Mestre vê a narração no card e no histórico', () => {
    const shell = src('../10-shell/shell.jsx');
    expect(shell.match(/ehMestre && msg\.meta && typeof msg\.meta\.narracao === 'string'/g) || []).toHaveLength(2);
  });
});
