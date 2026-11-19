/* ============================================================
   magia-sem-pa.test.js — auditoria 13/11/2026, item 7
   ============================================================
   Com pa_rest 0 e um pa_ataque_extra sobrando (Golpe Duplo e irmãs), o
   painel deixava lançar MAGIA: podeAplicar não pedia PA nesse ramo e
   debitarCustoAtaque só gasta o extra em arma — o débito caía num pa_rest
   já zerado e a magia saía de graça. O modo automático escolhia a magia no
   mesmo caso. paParaAtaque é a conta única: o extra só paga arma.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.paParaAtaque).toBeTypeOf('function'); });

describe('paParaAtaque', () => {
  it('com PA, paga arma e magia', () => {
    expect(M.paParaAtaque({ pa_rest: 1 }, 'arma')).toBe(true);
    expect(M.paParaAtaque({ pa_rest: 1 }, 'magia')).toBe(true);
  });
  it('só com o ataque extra: arma sim, magia não', () => {
    const p = { pa_rest: 0, pa_ataque_extra: 1 };
    expect(M.paParaAtaque(p, 'arma')).toBe(true);
    expect(M.paParaAtaque(p, 'magia')).toBe(false);
  });
  it('sem nada: nenhum dos dois', () => {
    expect(M.paParaAtaque({ pa_rest: 0, pa_ataque_extra: 0 }, 'arma')).toBe(false);
    expect(M.paParaAtaque(null, 'arma')).toBe(false);
  });
});

describe('modo automático com só o ataque extra', () => {
  const base = { status: 'ativo', status_temp: [], pa_max: 1, pa_rest: 1, mov_rest: 5, ef: 20, ef_max: 20, eh: 0, eh_max: 0, karma: 10 };
  const mago = (over = {}) => ({ ...base, tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Xamã', ordem: 1, atual: true, pos: { x: 0, y: 0 }, ...over });
  const alvo = { ...base, tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Lirael', ordem: 2, pos: { x: 1, y: 0 } };
  const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', alcance: '20 metros', evocacao: 'Instantânea',
    nivel_1: 'Causa 8 de dano elemental de fogo.' };
  const CAT = {
    criById: { 1: { id: 1, nome: 'Xamã', estagio: 1, magia: 'Bola de Fogo', ataque: 'Cajado', dano_100: 6, dano_l: 1, dano_m: 2, dano_p: 3 } },
    pjById: {}, catalogoBySlug: {}, tecnicasByKey: {}, magiasByKey: { bola_de_fogo: BOLA },
  };

  it('com PA, começa pela magia (controle)', () => {
    expect(M.decidirJogadaAutomatica(mago(), [mago(), alvo], CAT)).toMatchObject({ aba: 'magia' });
  });
  it('com pa_rest 0, um extra e a instantânea já usada, ataca com a arma', () => {
    const eu = mago({ pa_rest: 0, pa_ataque_extra: 1, instantanea_usada: true });
    expect(M.decidirJogadaAutomatica(eu, [eu, alvo], CAT)).toMatchObject({ tipo: 'acao', aba: 'arma' });
  });
  it('com pa_rest 0 e a instantânea livre, lança a magia (18/11/2026)', () => {
    const eu = mago({ pa_rest: 0, pa_ataque_extra: 1 });
    expect(M.decidirJogadaAutomatica(eu, [eu, alvo], CAT)).toMatchObject({ tipo: 'acao', aba: 'magia' });
  });
});

/* 18/11/2026 — "Magias de Evocação Instantânea não gastam ponto de ação, mas
   limitado em uma magia na rodada." */
describe('evocação instantânea: sem PA, uma por rodada', () => {
  const INST = { key: 'dardos', nome: 'Dardos', evocacao: 'Instantânea' };
  const CANAL = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };
  it('reconhece a instantânea (e a sem evocação), não a canalizada nem o ritual', () => {
    expect(M.ehMagiaInstantanea(INST)).toBe(true);
    expect(M.ehMagiaInstantanea({ key: 'x' })).toBe(true);
    expect(M.ehMagiaInstantanea({ catalogo: INST })).toBe(true);
    expect(M.ehMagiaInstantanea(CANAL)).toBe(false);
    expect(M.ehMagiaInstantanea({ evocacao: 'Ritual' })).toBe(false);
  });
  it('a instantânea paga sem PA, uma vez; a segunda trava', () => {
    expect(M.paParaAtaque({ pa_rest: 0 }, 'magia', INST)).toBe(true);
    const r = M.debitarCustoAtaque({ pa_rest: 1, karma: 5 }, 'magia', 2, INST);
    expect(r).toMatchObject({ pa_rest: 1, karma: 3, instantanea_usada: true });
    expect(M.paParaAtaque(r, 'magia', INST)).toBe(false);
  });
  it('a canalizada segue pagando 1 PA', () => {
    expect(M.paParaAtaque({ pa_rest: 0 }, 'magia', CANAL)).toBe(false);
    expect(M.debitarCustoAtaque({ pa_rest: 1, karma: 5 }, 'magia', 0, CANAL)).toMatchObject({ pa_rest: 0 });
  });
  it('a virada devolve a cota', () => {
    expect(M.acoesDaRodadaNova({ pa_max: 1, instantanea_usada: true }).instantanea_usada).toBe(false);
  });
});

/* O painel é um componente grande: a trava é conferida na fonte. */
describe('AcaoPanel exige PA para lançar magia', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  it('semPaParaAtaque nasce de paParaAtaque', () => {
    expect(fonte).toMatch(/const semPaParaAtaque = \(tab === 'arma' \|\| tab === 'magia'\) && !paParaAtaque\(ator, tab, tab === 'magia' \? magia : null\);/);
  });
  it('o Atacar (resolução) e o dado de arma e de magia conferem', () => {
    expect(fonte).toMatch(/!!res && !semKarma && !semPaParaAtaque && alvo/);
    expect(fonte).toMatch(/tab === 'arma' \? !\(arma && alvo\) \|\| foraDeAlcance \|\| semFlecha \|\| semPaParaAtaque/);
    expect(fonte).toMatch(/tab === 'magia' \? \([^)]*foraDeAlcance \|\| semPaParaAtaque\)/);
  });
});
