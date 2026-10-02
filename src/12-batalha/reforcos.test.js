/* ============================================================
   reforcos.test.js — combatentes que chegam no meio da batalha
   ============================================================
   "Durante a batalha, novos combatentes podem aparecer, sejam criaturas,
   sejam personagens (que ainda não entraram). Crie uma opção para o mestre
   adicionar novos combatentes, que vão entrar na próxima rodada no
   tabuleiro." — pedido do usuário, 29/09/2026. Decisões dele no mesmo dia:
   o Mestre marca o ponto de chegada; os jogadores não veem quem vem.

   O reforço mora em `participantes` com status 'chegando' e SEM pos (o
   ponto fica em pos_entrada). Assim ninguém o ataca, ninguém esbarra nele, e
   a virada de rodada — que é a mesma para Mestre e Jogador — é quem o põe em
   cena. O que este arquivo trava:
     • chegando não é alvo nem ganha a vez;
     • na virada entra no ponto marcado, ou na célula livre mais próxima;
     • sem ponto, usa o do companheiro da mesma leva; bando segue o líder;
     • a entrada vai para o log da virada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const pj = (over = {}) => ({
  inst_id: 'pj:1', tipo: 'pj', ref_id: 1, nome: 'Aria', status: 'ativo',
  vb: 20, pa: 2, pa_rest: 2, ef: 30, ef_max: 30, eh: 20, eh_max: 20,
  iniciativa: 10, ordem: 1, atual: true, pos: { x: 10, y: 10 }, ...over,
});
const goblin = (n, over = {}) => ({
  inst_id: 'cri:7:' + n, tipo: 'criatura', ref_id: 7, nome: 'Goblin', status: 'ativo',
  vb: 12, pa: 1, pa_rest: 1, ef: 10, ef_max: 10, eh: 8, eh_max: 8,
  iniciativa: 5, ordem: 2, pos: { x: 20, y: 20 }, ...over,
});

describe('prepararReforcos', () => {
  it('guarda o ponto marcado e tira o reforço de cena', () => {
    const [r] = M.prepararReforcos([goblin(1, { pos: { x: 4, y: 6 } })], 3);
    expect(r.status).toBe('chegando');
    expect(r.status_ao_entrar).toBe('ativo');
    expect(r.pos).toBeNull();
    expect(r.pos_entrada).toEqual({ x: 4, y: 6 });
    expect(r.entra_na_rodada).toBe(4);
    expect(r.atual).toBe(false);
  });
});

describe('quem está chegando não luta', () => {
  it('não é alvo', () => {
    const [r] = M.prepararReforcos([goblin(1)], 1);
    expect(M.podeSerAtacado(r)).toBe(false);
  });
  it('não ganha a vez', () => {
    const [r] = M.prepararReforcos([goblin(1, { ordem: 5 })], 1);
    expect(M.proximoAtivo([pj(), r], 1)).toBeNull();
  });
});

describe('entrarReforcos', () => {
  it('entra no ponto marcado, com o status que tinha', () => {
    const [r] = M.prepararReforcos([goblin(1, { pos: { x: 30, y: 5 } })], 1);
    const { participantes, entraram } = M.entrarReforcos([pj(), r]);
    const g = participantes.find((p) => p.inst_id === 'cri:7:1');
    expect(g.status).toBe('ativo');
    expect(g.pos).toEqual({ x: 30, y: 5 });
    expect(g.pos_entrada).toBeUndefined();
    expect(g.status_ao_entrar).toBeUndefined();
    expect(entraram).toEqual(['Goblin']);
  });

  it('ponto ocupado: vai para a célula livre mais perto', () => {
    const [r] = M.prepararReforcos([goblin(1, { pos: { x: 10, y: 10 } })], 1);
    const { participantes } = M.entrarReforcos([pj(), r]);
    const g = participantes.find((p) => p.inst_id === 'cri:7:1');
    expect(window.MotorTabuleiro.celulaOcupada(g.pos, participantes, g)).toBe(false);
    expect(Math.max(Math.abs(g.pos.x - 10), Math.abs(g.pos.y - 10))).toBeLessThanOrEqual(2);
  });

  it('sem ponto próprio, usa o do companheiro da mesma leva', () => {
    const rs = M.prepararReforcos([
      goblin(1, { pos: { x: 40, y: 30 } }),
      goblin(2, { pos: null }),
    ], 1);
    const { participantes } = M.entrarReforcos([pj(), ...rs]);
    const g2 = participantes.find((p) => p.inst_id === 'cri:7:2');
    expect(Math.abs(g2.pos.x - 40)).toBeLessThanOrEqual(3);
    expect(Math.abs(g2.pos.y - 30)).toBeLessThanOrEqual(3);
  });

  it('ninguém chegando: devolve a mesma lista', () => {
    const lista = [pj()];
    expect(M.entrarReforcos(lista).participantes).toBe(lista);
  });
});

describe('a virada de rodada põe o reforço em cena', () => {
  it('entra ativo, na ordem de iniciativa, e o log conta', () => {
    const [r] = M.prepararReforcos([goblin(1, { pos: { x: 30, y: 5 }, iniciativa: 50 })], 1);
    const { participantes, eventos } = M.montarNovaRodada([pj(), r]);
    const g = participantes.find((p) => p.inst_id === 'cri:7:1');
    expect(g.status).toBe('ativo');
    expect(g.pos).toEqual({ x: 30, y: 5 });
    const log = M.entradaLogViradaRodada(eventos, 2);
    expect(log && log.texto).toMatch(/Goblin entrou na batalha/);
  });
});

describe('formarBandosDeReforco', () => {
  it('não mexe em quem já está lutando', () => {
    const soltos = [goblin(1), goblin(2)];
    const novos = [1, 2, 3, 4, 5].map((i) => ({ tipo: 'criatura', ref_id: 7, nome: 'Goblin', inst_id: 'cri:7:n' + i }));
    const out = M.formarBandosDeReforco(soltos, novos);
    expect(out).toHaveLength(5);
    expect(out[0].bando.papel).toBe('lider');
    expect(soltos[0].bando).toBeUndefined();
  });
});
