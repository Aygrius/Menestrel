/* ============================================================
   alvo-por-id.test.js — auditoria 13/11/2026, item 26
   ============================================================
   O painel guardava o alvo pelo índice em `alvos`: quando alguém antes dele
   na lista caía ou saía, a mira pulava para o vizinho. Agora guarda o
   inst_id; a posição sai dele a cada render, e o escolhido que sumiu deixa a
   mira vazia.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');

describe('AcaoPanel guarda o alvo por inst_id', () => {
  it('o estado é o inst_id, não o índice', () => {
    expect(fonte).toMatch(/const \[alvoSelId, setAlvoSelId\] = useState\(/);
    expect(fonte).not.toMatch(/const \[alvoIdx, setAlvoIdx\]\s*=\s*useState/);
  });
  it('a posição sai do inst_id; o escolhido que sumiu dá -1 (mira vazia)', () => {
    expect(fonte).toMatch(/const alvoIdx = alvoSelId \? alvos\.findIndex\(\(p\) => p\.inst_id === alvoSelId\) : 0;/);
  });
  it('os seletores seguem passando um índice, convertido em inst_id', () => {
    expect(fonte).toMatch(/const setAlvoIdx = \(k\) => setAlvoSelId\(alvos\[k\] \? alvos\[k\]\.inst_id : null\);/);
  });
});
