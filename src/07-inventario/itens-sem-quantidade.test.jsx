/* ============================================================
   itens-sem-quantidade.test.jsx — auditoria 13/11/2026, item 17
   ============================================================
   Item sem `quantidade` virava NaN: a soma da pilha dentro do recipiente
   (normalizarPilhas), a capacidade do recipiente (capacidadeContainer) e o
   "quanto cabe" de guardar e mover davam NaN, e a pilha guardada sumia. Agora
   sem quantidade (ou com lixo) vale 1, como a carga já assumia.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';

const CAT = {
  pocao:   { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
  adaga:   { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', tipo: 'S', ocupa: 1 },
  mochila: { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', tipo: 'S', armazena: 10 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, containerId: null, equipado: false, slot: null, ...extra });

describe('quantidadeDe', () => {
  it('ausente, vazio ou lixo vale 1; número vale ele mesmo', () => {
    expect(window.quantidadeDe({})).toBe(1);
    expect(window.quantidadeDe({ quantidade: null })).toBe(1);
    expect(window.quantidadeDe({ quantidade: 'abc' })).toBe(1);
    expect(window.quantidadeDe({ quantidade: '3' })).toBe(3);
    expect(window.quantidadeDe({ quantidade: 4 })).toBe(4);
    expect(window.quantidadeDe({ quantidade: 0 })).toBe(0);   // pilha vazia: quem gastou decide
  });
});

describe('a pilha sem quantidade não some', () => {
  it('normalizarPilhas: duas pilhas no recipiente, uma sem quantidade, somam como 1', () => {
    const out = window.normalizarPilhas([it_('m', 'mochila', { quantidade: 1 }),
      it_('a', 'pocao', { containerId: 'm', quantidade: 2 }), it_('b', 'pocao', { containerId: 'm' })], CAT);
    const pocoes = out.filter((x) => x.slug === 'pocao');
    expect(pocoes).toHaveLength(1);
    expect(pocoes[0].quantidade).toBe(3);
  });
  it('normalizarPilhas: a instância sai consertada (o autosave grava 1)', () => {
    const itens = [it_('a', 'adaga')];
    const out = window.normalizarPilhas(itens, CAT);
    expect(out).not.toBe(itens);
    expect(out[0].quantidade).toBe(1);
  });
  it('capacidadeContainer: o filho sem quantidade ocupa como 1, sem NaN', () => {
    const itens = [it_('m', 'mochila', { quantidade: 1 }), it_('p', 'pocao', { containerId: 'm' })];
    const cap = window.capacidadeContainer(itens[0], itens, CAT);
    expect(cap.usado).toBe(0.5);
    expect(cap.livre).toBe(9.5);
  });
  it('guardarNoRecipiente: a adaga sem quantidade entra inteira', () => {
    const itens = [it_('m', 'mochila', { quantidade: 1 }), it_('a', 'adaga')];
    const r = window.guardarNoRecipiente(itens, 'a', 'm', CAT);
    expect(r.ok).toBe(true);
    const adaga = r.itens.find((x) => x.slug === 'adaga');
    expect(adaga.containerId).toBe('m');
    expect(Number.isFinite(adaga.quantidade == null ? 1 : adaga.quantidade)).toBe(true);
  });
});

describe('moverParaContainer (fonte: mora dentro do componente)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'inventario.jsx'), 'utf8');
  const i = fonte.indexOf('const moverParaContainer = (instanceId, containerId, quantidade) => {');
  const corpo = fonte.slice(i, i + 3000);
  it('lê a quantidade por quantidadeDe antes de fazer conta', () => {
    expect(corpo).toMatch(/const it = \{ \.\.\.itens\[idx\], quantidade: quantidadeDe\(itens\[idx\]\) \};/);
  });
  it('a "mesma pilha" usa a regra do item 13 (bônus e estado), não a lista à mão', () => {
    expect(corpo).toMatch(/assinaturaDeEstado\(f\) === assinaturaDeEstado\(it\)/);
    expect(corpo).not.toMatch(/it\.resistencia == null/);
  });
});
