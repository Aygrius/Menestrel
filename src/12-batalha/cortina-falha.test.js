/* ============================================================
   cortina-falha.test.js — auditoria 13/11/2026, item 24
   ============================================================
   Qualquer erro ao gravar a cortina desligava a aprovação do Mestre para
   sempre naquela tela — uma queda de rede bastava. Só a coluna ausente no
   banco desliga; erro passageiro mantém a cortina e tenta de novo uma vez.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.cortinaIndisponivel).toBeTypeOf('function'); });

describe('cortinaIndisponivel', () => {
  it('coluna ausente desliga', () => {
    expect(M.cortinaIndisponivel({ code: '42703', message: 'column "cortina" does not exist' })).toBe(true);
    expect(M.cortinaIndisponivel({ code: 'PGRST204', message: "Could not find the 'cortina' column" })).toBe(true);
    expect(M.cortinaIndisponivel({ message: "Could not find the 'cortina' column of 'batalhas'" })).toBe(true);
  });
  it('rede e afins não desligam', () => {
    expect(M.cortinaIndisponivel({ message: 'Failed to fetch' })).toBe(false);
    expect(M.cortinaIndisponivel({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(false);
    expect(M.cortinaIndisponivel(null)).toBe(false);
  });
});

describe('gravarCortina (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  const corpo = fonte.slice(fonte.indexOf('const gravarCortina = async'), fonte.indexOf('const gravarCortina = async') + 900);
  it('só liga semCortina quando a coluna falta', () => {
    expect(corpo).toMatch(/if \(cortinaIndisponivel\(err\)\) \{[\s\S]*?setSemCortina\(true\);/);
    expect((corpo.match(/setSemCortina\(true\)/g) || []).length).toBe(1);
  });
  it('erro passageiro tenta de novo, uma vez, e só se nada mais novo chegou', () => {
    expect(corpo).toMatch(/if \(tentativa < 1\)/);
    expect(corpo).toMatch(/ultimaCortinaRef\.current === c/);
  });
});
