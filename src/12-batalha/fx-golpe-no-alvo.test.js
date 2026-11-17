/* ============================================================
   fx-golpe-no-alvo.test.js — o desfecho do golpe gravado para os efeitos
   (17/11/2026). Ver fxDoGolpeNoAlvo em batalha.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const orc = { tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Orc', ef: 20, eh: 10, status: 'ativo', status_temp: [] };
const st = (tipo, valor, extra) => ({ nome: tipo, efeito: { tipo, valor }, ...(extra || {}) });

describe('fxDoGolpeNoAlvo', () => {
  it('golpe que não acertou não grava nada', () => {
    expect(M.fxDoGolpeNoAlvo(orc, orc, 0)).toBeNull();
  });
  it('esquivou: o evita_golpe foi gasto', () => {
    const antes = { ...orc, status_temp: [st('evita_golpe', null, { consome_em: 'golpe_recebido' })] };
    expect(M.fxDoGolpeNoAlvo(antes, { ...antes, status_temp: [] }, 8)).toEqual({ esquivou: true });
  });
  it('a defesa sai do maior corte de dano_recebido_pct', () => {
    const com = (v) => ({ ...orc, status_temp: [st('dano_recebido_pct', v)] });
    expect(M.fxDoGolpeNoAlvo(com(-75), { ...orc, eh: 8 }, 8).defesa).toBe('aparar');
    expect(M.fxDoGolpeNoAlvo(com(-50), { ...orc, eh: 6 }, 8).defesa).toBe('desviar');
    expect(M.fxDoGolpeNoAlvo(com(-25), { ...orc, eh: 4 }, 8).defesa).toBe('escudo');
  });
  it('quanto saiu de cada poço; nada saiu é armadura, o mesmo objeto é proteção', () => {
    expect(M.fxDoGolpeNoAlvo(orc, { ...orc, eh: 0, ef: 15 }, 20)).toMatchObject({ eh: 10, ef: 5 });
    expect(M.fxDoGolpeNoAlvo(orc, { ...orc }, 6).segurou).toBe('armadura');
    expect(M.fxDoGolpeNoAlvo(orc, orc, 6).segurou).toBe('protecao');
  });
  it('a peça que quebrou neste golpe, pelo nome do catálogo', () => {
    const antes = { ...orc, armadura_pecas: [{ instanceId: 'a', slug: 'ombreira', res: 1 }, { instanceId: 'b', slug: 'elmo', res: 0, quebrada: true }] };
    const depois = { ...antes, ef: 18, armadura_pecas: [{ instanceId: 'a', slug: 'ombreira', res: 0, quebrada: true }, antes.armadura_pecas[1]] };
    const cat = { catalogoBySlug: { ombreira: { nome: 'Ombreira' }, elmo: { nome: 'Elmo' } } };
    expect(M.fxDoGolpeNoAlvo(antes, depois, 9, cat).quebrou).toEqual(['Ombreira']);
  });
  it('a virada grava quem sangrou e quem foi envenenado', () => {
    const e = M.entradaLogViradaRodada([
      { nome: 'Orc', total: 2, inst_id: 'cri:1', tipo: 'criatura', ref_id: 1, eventos: [{ nome: 'Sangramento', valor: 2 }] },
      { nome: 'Lira', total: 1, inst_id: 'pj:7', tipo: 'pj', ref_id: 7, eventos: [{ nome: 'Veneno de aranha', valor: 1 }] },
    ], 3);
    expect(e.fx_virada).toEqual([
      { inst_id: 'cri:1', tipo: 'criatura', ref_id: 1, total: 2, sangra: true },
      { inst_id: 'pj:7', tipo: 'pj', ref_id: 7, total: 1, sangra: false },
    ]);
  });
});
