/* ============================================================
   select-pill-unico.test.js — um dropdown só no sistema
   ============================================================
   "Em todos os menus dropdown do sistema, use o mesmo estilo de dropdown do
    seletor de data do início do jogo, em editar história." (usuário, 25/09/2026)

   Havia quatro cópias de SelectPill e mais dois desenhos próprios (GpSelect,
   IcSelect), e elas divergiram. Este teste trava que ninguém volte a copiar:
   SelectPill só é DEFINIDO em 01-core/select-pill.jsx.

   Sem regex literal de propósito: este arquivo passa pelo leitor de JSX, que
   tropeça em barras e em "<Tag" dentro de regex.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const raiz = join(__dirname, '..');
const ehFonte = (n) => (n.endsWith('.jsx') || n.endsWith('.tsx')) && !n.includes('.test.');
const fontes = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return n === 'test' ? [] : fontes(p);
  return ehFonte(n) ? [p] : [];
});
const define = (texto, nome) => texto.split('\n').some((l) => l.startsWith('function ' + nome + '('));

describe('SelectPill é um só', () => {
  it('só 01-core/select-pill.jsx define SelectPill e SelectPillDrop', () => {
    const donos = fontes(raiz)
      .filter((f) => { const t = readFileSync(f, 'utf8'); return define(t, 'SelectPill') || define(t, 'SelectPillDrop'); })
      .map((f) => relative(raiz, f).split(sep).join('/'));
    expect(donos).toEqual(['01-core/select-pill.jsx']);
  });

  it('GpSelect e IcSelect são cascas do SelectPill', () => {
    const corpo = (arquivo, nome) => {
      const t = readFileSync(join(raiz, arquivo), 'utf8');
      const ini = t.indexOf('function ' + nome + '(');
      expect(ini).toBeGreaterThan(-1);
      return t.slice(ini, t.indexOf('\n}', ini));
    };
    const tag = '<' + 'SelectPill';
    expect(corpo('08-personagens/guia_personagem.jsx', 'GpSelect')).toContain(tag);
    expect(corpo('09-bestiario/itens-campanha.jsx', 'IcSelect')).toContain(tag);
  });
});
