/* ============================================================
   escopo-do-card.test.js — o próprio card só mostra o de uso pessoal
   ============================================================
   10/11/2026, usuário: "Quando o combatente clica em seu próprio card, será
   visto apenas magias, técnicas, etc de uso pessoal." O card do aliado ganha
   Magia e Técnica de apoio (ver apoioNoEscopo / tecnicaNoEscopo).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';

const M = window.MotorBatalha;

describe('apoioNoEscopo', () => {
  const cura = { alvo: 'aliado', pessoal: false };
  const pessoal = { alvo: 'self', pessoal: true };
  const debuff = { alvo: 'inimigo', pessoal: false };
  it('sem escopo, tudo passa', () => {
    [cura, pessoal, debuff].forEach((m) => expect(M.apoioNoEscopo(m, null)).toBe(true));
  });
  it('próprio card: o que pode mirar em si, nunca o de inimigo', () => {
    expect(M.apoioNoEscopo(cura, 'pessoal')).toBe(true);
    expect(M.apoioNoEscopo(pessoal, 'pessoal')).toBe(true);
    expect(M.apoioNoEscopo(debuff, 'pessoal')).toBe(false);
  });
  it('card do aliado: só o que vai a outro', () => {
    expect(M.apoioNoEscopo(cura, 'aliado')).toBe(true);
    expect(M.apoioNoEscopo(pessoal, 'aliado')).toBe(false);
    expect(M.apoioNoEscopo(debuff, 'aliado')).toBe(false);
  });
});

describe('tecnicaNoEscopo', () => {
  it('próprio card: tira as de inimigo', () => {
    expect(M.tecnicaNoEscopo({ key: 'esquiva' }, 'pessoal')).toBe(window.tecnicaEfeitoDe('esquiva').alvo !== 'inimigo');
    const deInimigo = Object.keys(window.TECNICA_EFEITO_MAP).find((k) => window.TECNICA_EFEITO_MAP[k].alvo === 'inimigo');
    expect(M.tecnicaNoEscopo({ key: deInimigo }, 'pessoal')).toBe(false);
    // Fora do registro é teste do próprio combatente.
    expect(M.tecnicaNoEscopo({ key: 'nao_existe' }, 'pessoal')).toBe(true);
  });
  it('card do aliado: só a de aliados (Voz de Comando)', () => {
    expect(M.tecnicaNoEscopo({ key: 'voz_de_comando' }, 'aliado')).toBe(true);
    expect(M.tecnicaNoEscopo({ key: 'esquiva' }, 'aliado')).toBe(false);
  });
});

describe('ligação na tela do jogador', () => {
  const src = fs.readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  it('o próprio card abre em escopo pessoal', () => {
    expect(src).toMatch(/onAcao=\{\(aba\) => abrirAcao\(aba, undefined, 'pessoal'\)\} mover=\{mover\} escopo="pessoal"/);
  });
  it('o card do aliado abre apoio com ele de alvo', () => {
    expect(src).toMatch(/abrirAcao\('apoio', p\.inst_id, 'aliado'\)/);
    expect(src).toMatch(/escopo=\{ataqueContra \? ataqueContra\.escopo \|\| null : null\}/);
  });
});
