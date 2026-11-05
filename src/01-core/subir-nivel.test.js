/* ============================================================
   subir-nivel.test.js — "Subir nível" pela ficha (05/11/2026)
   ============================================================
   "Pode concluir o 'subir de nível' das magias, técnicas e habilidades"
   (usuário). Regra de 28/10: só a compra NOVA aprende (fila); com o nível 1
   na ficha, o próximo vale na hora. Habilidade nova: 12 h em Treinar.
   bloqueioSubirNivel espelha a RPC subir_nivel
   (scripts/sql/subir-nivel-2026-11-05.sql).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './clima-desgaste.jsx';

let G;
beforeAll(() => { G = window; });

// Estágio 5 (46 XP), Ladino: 20 pontos de habilidade por estágio = 100.
const pjBase = (extra = {}) => ({
  profissao: 'Ladino', experiencia: 46, intelecto_base: 0, aura_base: 0,
  fisico_base: 0, agilidade_base: 0, deus: 'Crezir', subraca: null,
  magias: {}, tecnicas: {}, habilidades: {}, treinos: [], ...extra,
});
const HABS = {
  nadar: { key: 'nadar', custo: 2, nivel_inicial: 0 },
  furtar: { key: 'furtar', custo: 3, nivel_inicial: 0 },
};
const TECS = [{ key: 'esquiva', custo: 2 }];
const MAG = { key: 'luz', custo: 1, classe: 'Feitiço', nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: '', nivel_9: '' };

describe('bloqueioSubirNivel', () => {
  it('habilidade com nível sobe na hora; nova também pode (vai para a fila)', () => {
    const pj = pjBase({ habilidades: { furtar: 2 } });
    expect(G.bloqueioSubirNivel('habilidade', HABS.furtar, pj, HABS)).toBeNull();
    expect(G.bloqueioSubirNivel('habilidade', HABS.nadar, pj, HABS)).toBeNull();
    expect(G.subirNivelEhAprendizado('habilidade', HABS.nadar, pj)).toBe(true);
    expect(G.subirNivelEhAprendizado('habilidade', HABS.furtar, pj)).toBe(false);
  });
  it('habilidade: teto do estágio e pontos', () => {
    expect(G.bloqueioSubirNivel('habilidade', HABS.furtar, pjBase({ habilidades: { furtar: 5 } }), HABS))
      .toEqual({ motivo: 'acima_do_estagio' });
    // 100 pontos: furtar 5 (15) + nadar com o resto gasto.
    const cheio = pjBase({ habilidades: { furtar: 5, nadar: 4 }, experiencia: 46 });
    // 4 × 22 + 4 × 3 = 100, o orçamento inteiro: o 5º nível de furtar não cabe.
    const caro = { ...HABS, nadar: { ...HABS.nadar, custo: 22 } };
    expect(G.bloqueioSubirNivel('habilidade', caro.furtar, { ...cheio, habilidades: { furtar: 4, nadar: 4 } }, caro).motivo)
      .toBe('pontos_insuficientes');
  });
  it('em treino não sobe', () => {
    const pj = pjBase({ treinos: [{ id: 'x', tipo: 'habilidade', key: 'nadar', nivel: 1, atividade: 'treinando', horas_restantes: 12 }] });
    expect(G.bloqueioSubirNivel('habilidade', HABS.nadar, pj, HABS)).toEqual({ motivo: 'em_treino' });
  });
  it('magia e técnica sem o nível 1 vêm pelo item', () => {
    expect(G.bloqueioSubirNivel('tecnica', TECS[0], pjBase(), TECS)).toEqual({ motivo: 'nao_aprendida' });
    expect(G.bloqueioSubirNivel('magia', MAG, pjBase({ profissao: 'Mago' }), [MAG])).toEqual({ motivo: 'nao_aprendida' });
  });
  it('técnica e magia com nível sobem; magia respeita o texto do nível', () => {
    expect(G.bloqueioSubirNivel('tecnica', TECS[0], pjBase({ tecnicas: { esquiva: 1 } }), TECS)).toBeNull();
    const mago = pjBase({ profissao: 'Mago', magias: { luz: 1 } });
    expect(G.bloqueioSubirNivel('magia', MAG, mago, [MAG])).toBeNull();
    expect(G.bloqueioSubirNivel('magia', MAG, { ...mago, experiencia: 200, magias: { luz: 3 } }, [MAG]))
      .toEqual({ motivo: 'nivel_sem_texto' });
  });
  it('custo do próximo nível: magia sobe dois níveis efetivos', () => {
    expect(G.custoSubirNivel('magia', MAG, pjBase({ magias: { luz: 1 } }))).toBe(2);
    expect(G.custoSubirNivel('tecnica', TECS[0], pjBase())).toBe(2);
    expect(G.custoSubirNivel('habilidade', HABS.furtar, pjBase())).toBe(3);
  });
  it('o porquê em palavras', () => {
    expect(G.motivoSubirNivelLabel('pontos_insuficientes', 'habilidade', false)).toBe('Pontos de habilidade insuficientes.');
    expect(G.motivoSubirNivelLabel('em_treino', 'magia', false)).toMatch(/aprendizado/);
  });
});

describe('fila: habilidade concluída vai para habilidades', () => {
  it('12 h treinando', () => {
    const pj = pjBase({ habilidades: { furtar: 2 },
      treinos: [{ id: 'h', tipo: 'habilidade', key: 'nadar', nivel: 1, atividade: 'treinando', horas_restantes: 12 }] });
    const r = G.aplicarTreinoNoPj(pj, 'treinando', 12);
    expect(r.treinos).toEqual([]);
    expect(r.habilidades).toEqual({ furtar: 2, nadar: 1 });
  });
  it('Treinar explica as duas compras', () => {
    expect(G.explicacaoDaAtividade('treinando', null, false).aprendizado).toMatch(/técnica.*36 horas.*habilidade, 12/);
  });
});

describe('a edição do personagem não grava habilidades', () => {
  const fonte = readFileSync(resolve(__dirname, '../08-personagens/personagens.jsx'), 'utf8');
  it('etapa só na criação e coluna só no insert', () => {
    expect(fonte).toMatch(/\.\.\.\(isEdit \? \[\] : GRUPOS_HABILIDADES_ORDEM\.map/);
    expect(fonte).toMatch(/if \(!isEdit\) payload\.habilidades = /);
    expect(fonte).not.toMatch(/^\s+habilidades: form\.habilidades \|\| \{\},\r?$/m);
  });
});
