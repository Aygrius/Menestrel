/* ============================================================
   automatico-reveza.test.js — a criatura reveza magia e arma (09/11/2026)
   ============================================================
   Usuário: "No modo automático, eu quero que as criaturas revezem entre
   usar magia e atacar com arma." Depois de uma magia vem a arma; depois da
   arma, a magia. Lido da última ação da própria criatura no log.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
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
beforeAll(() => { M = window.MotorBatalha; });

const base = { status: 'ativo', status_temp: [], pa_max: 1, pa_rest: 1, mov_rest: 5, ef: 20, ef_max: 20, eh: 0, eh_max: 0, karma: 0 };
const mago = (over = {}) => ({ ...base, tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Xamã', ordem: 1, atual: true, pos: { x: 0, y: 0 }, ...over });
const alvo = { ...base, tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Lirael', ordem: 2, pos: { x: 1, y: 0 } };
const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', alcance: '20 metros', evocacao: 'Instantânea',
  nivel_1: 'Causa 8 de dano elemental de fogo.' };
const CAT = {
  criById: { 1: { id: 1, nome: 'Xamã', estagio: 1, magia: 'Bola de Fogo', ataque: 'Cajado', dano_100: 6, dano_l: 1, dano_m: 2, dano_p: 3 } },
  pjById: {}, catalogoBySlug: {}, tecnicasByKey: {}, magiasByKey: { bola_de_fogo: BOLA },
};

describe('a criatura no automático reveza magia e arma', () => {
  it('sem histórico: começa pela magia', () => {
    expect(M.decidirJogadaAutomatica(mago(), [mago(), alvo], CAT)).toMatchObject({ aba: 'magia' });
  });
  it('depois de uma magia: arma', () => {
    const log = [{ acao: 'magia', autor_inst_id: 'cri:1', alvo_inst_id: 'pj:7' }];
    expect(M.decidirJogadaAutomatica(mago(), [mago(), alvo], CAT, [], log)).toMatchObject({ aba: 'arma' });
  });
  it('depois da arma: magia de novo', () => {
    const log = [{ acao: 'magia', autor_inst_id: 'cri:1' }, { acao: 'arma', autor_inst_id: 'cri:1' }];
    expect(M.decidirJogadaAutomatica(mago(), [mago(), alvo], CAT, [], log)).toMatchObject({ aba: 'magia' });
  });
  it('a ação de OUTRO combatente não conta', () => {
    const log = [{ acao: 'magia', autor_inst_id: 'cri:9' }];
    expect(M.ultimaAcaoDeAtaque(mago(), log)).toBeNull();
  });
  it('sem arma que alcance, repete a magia', () => {
    const longe = { ...alvo, pos: { x: 6, y: 0 } };
    const log = [{ acao: 'magia', autor_inst_id: 'cri:1' }];
    expect(M.decidirJogadaAutomatica(mago(), [mago(), longe], CAT, [], log)).toMatchObject({ aba: 'magia' });
  });
});
