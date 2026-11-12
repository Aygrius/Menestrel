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
    // Ferido e crítico com a voz de cada golpe e da magia (11/11/2026).
    for (const g of ['CORTE', 'PERFURACAO', 'ESMAGAMENTO', 'DESARMADO', 'magia']) {
      for (const fim of ['ferido', 'critico']) expect(N().desfechoDoGolpe[g][fim].length, g + '/' + fim).toBeGreaterThanOrEqual(3);
    }
  });
  /* "deixe a narração mais fluida, mais humanizada e mais emocionante"
     (usuário, 11/11/2026; voz da skill cronista-de-tagmar): sem exclamação e
     sem palavra moderna. */
  it('a voz: sem exclamação nem palavra moderna', () => {
    const todas = [
      ...Object.values(N().encontro).flatMap((d) => Object.values(d).flat()),
      ...Object.values(N().desfecho).flat(),
      ...Object.values(N().desfechoDoGolpe).flatMap((d) => Object.values(d).flat()),
    ];
    todas.forEach((f) => {
      expect(f).not.toMatch(/!/);
      expect(f).not.toMatch(/\b(ok|basicamente|focar|impactar|processo|sistema)\b/i);
    });
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
    expect(t).toBe('Kael estuda as placas de Orc por um instante e corta onde o aço não cobre, na dobra do joelho. A lâmina passa, e um talho se abre no corpo de Orc, vermelho e quente.');
  });
  it('bola de fogo contra couro, e o alvo esquiva', () => {
    const t = window.narrarGolpe({
      tipo: 'magia', elemento: 'fogo', defesaSigla: 'L', autorNome: 'Lirael', alvoNome: 'Lobo',
      resultado: { codigo: 'R', erra: true }, dano: 0, sortear: primeira,
    });
    expect(t).toMatch(/^Lirael abre as mãos e o fogo nasce entre os dedos, .* couro de Lobo\. Mas Lobo lê o golpe no último instante, gira o corpo, e o ataque morde só o vento\.$/);
  });
  it('cada desfecho: falha crítica, crítico, só a armadura, só a energia heroica', () => {
    const d = N().qualDesfecho;
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
    // A magia ferindo usa a voz da magia, não a da arma.
    expect(window.narrarGolpe({ tipo: 'magia', elemento: 'luz', defesaSigla: 'M', autorNome: 'Sena', alvoNome: 'Orc',
      resultado: { codigo: 'M' }, dano: 8, onde: { ef: 8 }, sortear: () => 0 })).toMatch(/A magia atravessa a defesa, e Orc sente o corpo queimar por dentro\.$/);
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
