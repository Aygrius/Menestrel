/* ============================================================
   efeito-item-escala.test.js — o MESMO item nas duas telas
   ============================================================
   aplicarEfeitosItem (01-core, mira pj.estado_atual, fora de combate) e
   aplicarEfeitoItemSnapshot (aqui, mira o snapshot do participante) são
   duas funções porque os SHAPES de destino são diferentes. O que elas NÃO
   podem ter de diferente é a conta: quem usa uma Água na aba Inventário e
   quem usa a MESMA Água no combate tem que terminar com a mesma condição.

   Isso importa de verdade porque aplicarItem/handleItem (batalha.jsx) fazem
   write-through das condições do snapshot pra personagens.estado_atual — se
   as escalas divergirem, o combate grava por cima da ficha em outra unidade.

   Bug que motivou o arquivo (auditoria 01/09/2026): o 01-core ficou na
   escala velha 0–100 (default 100) enquanto a batalha já usava
   -COND_LIMITE..+COND_LIMITE. Ver 01-core/efeitos-item.test.js.
   ============================================================ */
import { describe, it, expect } from 'vitest';
// Mesma ordem de src/main.tsx.
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const G = globalThis;
const LIM = G.COND_LIMITE;

// Snapshot mínimo de participante, no shape que montarSnapshots produz.
const snap = (over) => ({
  tipo: 'pj', nome: 'Teste', status: 'ativo',
  eh: 10, eh_max: 10, ef: 20, ef_max: 20, ar: 2, ar_max: 2, karma: 5, karma_max: 5,
  condicoes: {}, status_temp: [],
  ...over,
});

describe('condições: Inventário e Batalha concordam no mesmo item', () => {
  const casos = [
    ['água',    { efeito_positivo: '35 Hidratação' },                              'hidratacao',  1],
    ['cerveja', { efeito_positivo: '5 Energia Heroica', efeito_negativo: '5 Sobriedade' }, 'euforia', 1],
    ['ração×3', { efeito_positivo: '4 Alimentação' },                              'nutricao',    3],
    ['veneno',  { efeito_negativo: '40 Saúde' },                                   'vitalidade',  1],
  ];

  it.each(casos)('%s: mesma condição final nas duas telas', (_nome, cat, chave, qtd) => {
    const fora   = G.aplicarEfeitosItem({ condicoes: {} }, cat, qtd, { ef: 20, eh: 10, ka: 5 });
    const dentro = G.MotorBatalha.aplicarEfeitoItemSnapshot(snap(), cat, qtd);
    expect(dentro.condicoes[chave]).toBe(fora.condicoes[chave]);
  });

  it('partem do mesmo default quando a condição nunca foi salva (0 = neutro)', () => {
    const cat = { efeito_positivo: '7 Sanidade' };
    expect(G.aplicarEfeitosItem({}, cat, 1, {}).condicoes.sanidade).toBe(7);
    expect(G.MotorBatalha.aplicarEfeitoItemSnapshot(snap(), cat, 1).condicoes.sanidade).toBe(7);
  });

  it('saturam no mesmo teto e no mesmo piso', () => {
    const muito = { efeito_positivo: '99 Hidratação' };
    const menos = { efeito_negativo: '99 Hidratação' };
    expect(G.aplicarEfeitosItem({}, muito, 1, {}).condicoes.hidratacao).toBe(LIM);
    expect(G.MotorBatalha.aplicarEfeitoItemSnapshot(snap(), muito, 1).condicoes.hidratacao).toBe(LIM);
    expect(G.aplicarEfeitosItem({}, menos, 1, {}).condicoes.hidratacao).toBe(-LIM);
    expect(G.MotorBatalha.aplicarEfeitoItemSnapshot(snap(), menos, 1).condicoes.hidratacao).toBe(-LIM);
  });
});

describe('aplicarEfeitoItemSnapshot — pools do snapshot (inalterado)', () => {
  it('vitalidade continua no _max do snapshot (respeita sequela)', () => {
    const poção = { efeito_positivo: '30 Energia Heroica' };
    const p = G.MotorBatalha.aplicarEfeitoItemSnapshot(snap({ eh: 2, eh_max: 6 }), poção, 1);
    expect(p.eh).toBe(6);
  });

  it('Karma cai no campo karma (EFEITO_CONDICAO_MAP usa a chave "ka")', () => {
    const p = G.MotorBatalha.aplicarEfeitoItemSnapshot(snap({ karma: 1 }), { efeito_positivo: '2 Karma' }, 1);
    expect(p.karma).toBe(3);
  });

  it('EF desce até o piso de morte e derruba o status', () => {
    const p = G.MotorBatalha.aplicarEfeitoItemSnapshot(snap({ ef: 3 }), { efeito_negativo: '50 Energia Física' }, 1);
    expect(p.ef).toBe(-15);
    expect(p.status).toBe('morto');
  });

  it('absorção é buff temporário: passa do ar_max, não fica negativa', () => {
    const p = G.MotorBatalha.aplicarEfeitoItemSnapshot(snap({ ar: 2, ar_max: 2 }), { efeito_positivo: '8 Absorção' }, 1);
    expect(p.ar).toBe(10);
  });

  it('item sem efeito devolve o MESMO participante', () => {
    const p = snap();
    expect(G.MotorBatalha.aplicarEfeitoItemSnapshot(p, { nome: 'Corda' }, 1)).toBe(p);
  });
});
