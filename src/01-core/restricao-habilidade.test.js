/* ============================================================
   restricao-habilidade.test.js — as letras N/M/P da habilidade
   ============================================================
   Usuário, 30/10/2026: "N significa que para usar a habilidade, é necessário
   ter pelo menos comprado ela. As outras letras, M, P, etc, dizem que elas
   sofrem dificuldade extra se o personagem estiver usando esse tipo de
   armadura. [...] a penalidade é sempre 1 nível mais difícil que ele
   escolher."
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './inventario-helpers.jsx';

const W = window;
const NADAR = { nome: 'Nadar', restricao: 'M, P, N' };
const ARTE = { nome: 'Arte', restricao: 'N' };
const CORRER = { nome: 'Correr', restricao: null };
const CAT = {
  colete: { slug: 'colete', grupo: 'Armaduras', tipo_armadura: 'L' },
  cota: { slug: 'cota', grupo: 'Armaduras', tipo_armadura: 'M' },
  pipa: { slug: 'pipa', grupo: 'Armaduras', tipo_armadura: 'P' },
  anel: { slug: 'anel', grupo: 'Vestimentas' },
};
const eq = (slug) => ({ instanceId: slug, slug, equipado: true, slot: 'x' });

describe('as letras da restrição', () => {
  it('lê N e as classes de armadura, com ou sem espaço', () => {
    expect(W.restricaoDaHabilidade(NADAR)).toEqual({ exigeCompra: true, armaduras: ['M', 'P'] });
    expect(W.restricaoDaHabilidade(ARTE)).toEqual({ exigeCompra: true, armaduras: [] });
    expect(W.restricaoDaHabilidade(CORRER)).toEqual({ exigeCompra: false, armaduras: [] });
  });

  it('N sem compra bloqueia; comprada (nível > 0) libera', () => {
    expect(W.bloqueioDaHabilidade(ARTE, 0)).toMatch(/comprado/);
    expect(W.bloqueioDaHabilidade(ARTE, undefined)).toMatch(/comprado/);
    expect(W.bloqueioDaHabilidade(ARTE, 2)).toBeNull();
    expect(W.bloqueioDaHabilidade(CORRER, 0)).toBeNull();
  });
});

describe('a armadura vestida', () => {
  it('é a classe da peça mais pesada no corpo; sem armadura, null', () => {
    expect(W.classeDaArmaduraVestida([eq('colete'), eq('cota')], CAT)).toBe('M');
    expect(W.classeDaArmaduraVestida([eq('colete'), eq('pipa')], CAT)).toBe('P');
    expect(W.classeDaArmaduraVestida([eq('anel')], CAT)).toBeNull();
    expect(W.classeDaArmaduraVestida([{ instanceId: 'c', slug: 'cota' }], CAT), 'guardada não conta').toBeNull();
  });

  it('peça quebrada ainda está no corpo e ainda pesa', () => {
    expect(W.classeDaArmaduraVestida([{ ...eq('cota'), quebrada: true }], CAT)).toBe('M');
  });

  it('a classe da restrição põe UM grau a mais; as outras, nenhum', () => {
    expect(W.passosDaArmaduraNaHabilidade(NADAR, 'M')).toBe(1);
    expect(W.passosDaArmaduraNaHabilidade(NADAR, 'P')).toBe(1);
    expect(W.passosDaArmaduraNaHabilidade(NADAR, 'L')).toBe(0);
    expect(W.passosDaArmaduraNaHabilidade(NADAR, null)).toBe(0);
    expect(W.passosDaArmaduraNaHabilidade(ARTE, 'P')).toBe(0);
  });
});

describe('a restrição em palavras', () => {
  it('diz a regra, e diz quando a armadura de agora já pesa', () => {
    expect(W.textoDaRestricao(NADAR, null)).toBe(
      'Só pode ser usada por quem a comprou. Com armadura média ou pesada, fica um grau mais difícil.');
    expect(W.textoDaRestricao(NADAR, 'P')).toMatch(/Você está de armadura pesada: a dificuldade sobe um grau\./);
    expect(W.textoDaRestricao(CORRER, 'P')).toBeNull();
  });
});
