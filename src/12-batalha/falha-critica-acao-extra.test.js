/* ============================================================
   falha-critica-acao-extra.test.js — duas regras de 18/11/2026
   ============================================================
   1. "Quando alguém rola uma falha crítica, todos os outros inimigos (do
      outro time) ganham 1 ação extra (respeitando o teto de 2 ações por
      rodada no máximo)."
   2. "O item não gasta PA, mas só pode ser usado 1 por ação, igual magia
      instantânea."
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
beforeAll(() => { M = window.MotorBatalha; });
const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');

const base = { status: 'ativo', status_temp: [], vb: 10, pa_max: 1, pa_rest: 1 };
const pj = (n, over = {}) => ({ ...base, tipo: 'pj', ref_id: n, inst_id: 'pj:' + n, nome: 'Pj' + n, ...over });
const orc = (n, over = {}) => ({ ...base, tipo: 'criatura', ref_id: 7, inst_id: 'cri:7:' + n, nome: 'Orc ' + n, ...over });

describe('a falha crítica dá 1 ação ao outro time', () => {
  it('só o outro time, e só quem está de pé', () => {
    const arr = [pj(1), pj(2), orc(1), orc(2, { status: 'morto' }), orc(3, { status: 'desmaiado' })];
    const r = M.acaoExtraPorFalhaCritica(arr, arr[0]);
    expect(r.ganharam).toEqual(['Orc 1']);
    expect(r.participantes[2]).toMatchObject({ pa_rest: 2, acoes_extra_fc: 1 });
    expect(r.participantes[1].pa_rest).toBe(1);   // o time de quem errou não ganha
    expect(r.participantes[3].pa_rest).toBe(1);
  });
  it('teto de 2 ações na rodada: a segunda falha crítica não dá mais', () => {
    const arr = [pj(1), orc(1)];
    const r1 = M.acaoExtraPorFalhaCritica(arr, arr[0]);
    const r2 = M.acaoExtraPorFalhaCritica(r1.participantes, arr[0]);
    expect(r2.ganharam).toEqual([]);
    expect(r2.participantes[1].pa_rest).toBe(2);
  });
  it('quem já tem 2 ações pela velocidade não ganha', () => {
    const rapido = orc(1, { vb: 40, pa_rest: 2 });   // acima de 30: ação extra
    const r = M.acaoExtraPorFalhaCritica([pj(1), rapido], pj(1));
    expect(r.ganharam).toEqual([]);
  });
  it('mesmo gasta, a ação da rodada conta para o teto', () => {
    const r = M.acaoExtraPorFalhaCritica([pj(1), orc(1, { pa_rest: 0 })], pj(1));
    expect(r.participantes[1].pa_rest).toBe(1);
  });
  it('a virada zera a contagem', () => {
    expect(M.acoesDaRodadaNova({ pa_max: 1, acoes_extra_fc: 1, item_usado: true }))
      .toMatchObject({ acoes_extra_fc: 0, item_usado: false });
  });
  it('entra no log; os dois lados aplicam', () => {
    expect(M.entradaLogAcaoExtraFc('Nihil Selles', ['Orc 1', 'Orc 2'], 3).texto)
      .toBe('Falha crítica de Nihil Selles: Orc 1 e Orc 2 ganham 1 ação extra');
    expect(M.entradaLogAcaoExtraFc('Nihil', [], 3)).toBe(null);
    expect((fonte.match(/acaoExtraPorFalhaCritica\(next, next\[atorIdx\]\)/g) || []).length).toBe(2);
  });
});

describe('um item por rodada', () => {
  it('itemJaUsado lê a cota', () => {
    expect(M.itemJaUsado({ item_usado: true })).toBe(true);
    expect(M.itemJaUsado({})).toBe(false);
  });
  it('Mestre e Jogador marcam e recusam o segundo', () => {
    expect(fonte).toMatch(/if \(itemJaUsado\(next\[atorIdx\]\)\) return;/);
    expect(fonte).toMatch(/if \(itemJaUsado\(next\[idx\]\)\) return;/);
    expect(fonte).toMatch(/\? \(!itemJaUsado\(ator\) && !!itemSelecionado/);
  });
});
