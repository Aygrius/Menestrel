/* ============================================================
   bandos.test.js — líder + minions e iniciativa por tipo
   ============================================================
   Pedido do usuário, 13/09/2026: "No momento de jogar 1d9 de iniciativa, eu
   quero um número por tipo de criatura. Quando houver mais de 5 criaturas
   iguais, elas serão representadas por 1 criatura líder e 4 minions, que vão
   andar juntos pelo tabuleiro, se o líder morrer, todos os demais fogem. Os
   minions devem ter 1/4 de EF, EH e AR."

   Decidido junto: bandos de 5 (o que sobra fica solto) e minions agem logo
   depois do líder; o movimento é do líder.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let M, T;
beforeAll(() => { M = window.MotorBatalha; T = window.MotorTabuleiro; });

const cri = (ref, i, extra) => ({ tipo: 'criatura', ref_id: ref, nome: 'Goblin', inst_id: `g${ref}-${i}`, ...extra });
const pj = (nome, extra) => ({ tipo: 'pj', ref_id: nome, nome, inst_id: 'pj:' + nome, ...extra });

describe('formarBandos', () => {
  it('menos de 5 iguais: ninguém vira bando', () => {
    const parts = [cri(1, 0), cri(1, 1), cri(1, 2), cri(1, 3)];
    expect(M.formarBandos(parts)).toBe(parts);
  });

  it('5 iguais: 1 líder + 4 minions, apontando para o líder', () => {
    const out = M.formarBandos([1, 2, 3, 4, 5].map((i) => cri(7, i)));
    expect(out.map(M.papelNoBando)).toEqual(['lider', 'minion', 'minion', 'minion', 'minion']);
    expect(out.every((p) => p.bando.lider === 'g7-1')).toBe(true);
    expect(out[0].nome).toBe('Goblin (líder)');
    expect(out[1].nome).toBe('Goblin (minion)');
  });

  it('12 iguais: 2 bandos numerados + 2 soltos', () => {
    const out = M.formarBandos(Array.from({ length: 12 }, (_, i) => cri(7, i)));
    expect(out.filter((p) => M.papelNoBando(p) === 'lider')).toHaveLength(2);
    expect(out.filter((p) => M.papelNoBando(p) === 'minion')).toHaveLength(8);
    expect(out.slice(10).every((p) => !p.bando && p.nome === 'Goblin')).toBe(true);
    expect(out[0].nome).toBe('Goblin (líder 1)');
    expect(out[5].nome).toBe('Goblin (líder 2)');
  });

  it('é idempotente e não mistura tipos nem PJs', () => {
    const parts = [pj('Ana'), ...Array.from({ length: 5 }, (_, i) => cri(1, i)), cri(2, 0)];
    const uma = M.formarBandos(parts);
    expect(M.formarBandos(uma)).toBe(uma);
    expect(uma[0].bando).toBeUndefined();
    expect(uma[6].bando).toBeUndefined();
  });
});

describe('iniciativa por tipo de criatura', () => {
  it('definirIniciativa numa criatura vale para o tipo inteiro; PJ muda só ele', () => {
    const parts = [pj('Ana'), pj('Bia'), cri(1, 0), cri(1, 1), cri(2, 0)];
    const a = M.definirIniciativa(parts, 2, 6);
    expect(a.map((p) => p.bonus_iniciativa || 0)).toEqual([0, 0, 6, 6, 0]);
    const b = M.definirIniciativa(a, 0, 3);
    expect(b.map((p) => p.bonus_iniciativa || 0)).toEqual([3, 0, 6, 6, 0]);
  });

  it('iniciativaPorTipo iguala batalha antiga pelo valor da PRIMEIRA do tipo', () => {
    const parts = [cri(1, 0, { bonus_iniciativa: 4 }), cri(1, 1, { bonus_iniciativa: 9 }), pj('Ana', { bonus_iniciativa: 2 })];
    expect(M.iniciativaPorTipo(parts).map((p) => p.bonus_iniciativa)).toEqual([4, 4, 2]);
  });
});

describe('ordem de iniciativa: minion age logo depois do líder', () => {
  it('minion mais lento ou mais rápido fica colado no líder', () => {
    const bando = M.formarBandos([1, 2, 3, 4, 5].map((i) => cri(1, i, { vb: 10 })));
    bando[2] = { ...bando[2], vb: 50 };   // minion veloz não passa na frente
    const ord = M.ordenarIniciativa([pj('Ana', { vb: 20 }), ...bando, pj('Bia', { vb: 5 })]);
    expect(ord.map((p) => p.nome)).toEqual([
      'Ana', 'Goblin (líder)', 'Goblin (minion)', 'Goblin (minion)', 'Goblin (minion)', 'Goblin (minion)', 'Bia',
    ]);
    expect(ord.map((p) => p.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('sem bando a ordem é a de sempre', () => {
    const ord = M.ordenarIniciativa([pj('Bia', { vb: 5 }), cri(1, 0, { vb: 9 }), pj('Ana', { vb: 9 })]);
    expect(ord.map((p) => p.nome)).toEqual(['Ana', 'Goblin', 'Bia']);
  });
});

describe('montarSnapshots — minion tem 1/4 de EF, EH e AR', () => {
  const stubOriginal = globalThis.supabaseClient;
  afterEach(() => { globalThis.supabaseClient = stubOriginal; });

  it('líder cheio; minion com 1/4 arredondado pra cima; um só bônus de iniciativa', async () => {
    const ORC = { id: 9, nome: 'Orc', armadura: 'L', defesa: 1, absorcao: 3, velocidade: 12,
      energia_fisica: 21, energia_heroica: 10, dano_l: 4, dano_m: 4, dano_p: 4 };
    globalThis.supabaseClient = fakeSupabase({ criaturas: [ORC], itens: [] });
    const crus = M.formarBandos(Array.from({ length: 5 }, (_, i) => (
      { tipo: 'criatura', ref_id: 9, nome: 'Orc', inst_id: 'o' + i, bonus_iniciativa: i === 0 ? 5 : 1 })));
    const snaps = await window.montarSnapshots(crus, null);
    expect([snaps[0].ef_max, snaps[0].eh_max, snaps[0].ar_max]).toEqual([21, 10, 3]);
    expect([snaps[1].ef, snaps[1].ef_max, snaps[1].eh_max, snaps[1].ar_max]).toEqual([6, 6, 3, 1]);
    expect(snaps.every((s) => s.vb === 17)).toBe(true);   // 12 + 5 do tipo
    expect(snaps[1].bando).toEqual(crus[1].bando);
  });
});

describe('fuga do bando quando o líder morre', () => {
  const bandoAtivo = () => M.ordenarIniciativa([
    pj('Ana', { vb: 30, status: 'ativo' }),
    ...M.formarBandos([1, 2, 3, 4, 5].map((i) => cri(1, i, { vb: 10, status: 'ativo', pos: null }))),
  ]);

  it('líder vivo: nada acontece', () => {
    const parts = bandoAtivo();
    expect(M.fugaDeBandos(parts).participantes).toBe(parts);
  });

  it('líder morto: todos os minions de pé fogem; minion já morto fica', () => {
    let parts = bandoAtivo();
    parts = parts.map((p) => (M.papelNoBando(p) === 'lider' ? { ...p, status: 'morto' } : p));
    parts[2] = { ...parts[2], status: 'morto' };
    const r = M.fugaDeBandos(parts);
    const minions = r.participantes.filter((p) => M.papelNoBando(p) === 'minion');
    expect(minions.map((p) => p.status)).toEqual(['morto', 'desistiu', 'desistiu', 'desistiu']);
    expect(minions.filter((p) => p.fugiu)).toHaveLength(3);
    expect(r.fugas).toEqual([{ lider: 'Goblin (líder)', minions: ['Goblin (minion)', 'Goblin (minion)', 'Goblin (minion)'] }]);
  });

  it('a vez que ia para um minion em fuga passa para o próximo ativo (sem pular de fugitivo em fugitivo)', () => {
    let parts = [...bandoAtivo(), pj('Bia', { vb: 1, status: 'ativo' })];
    parts = M.ordenarIniciativa(parts).map((p) => ({
      ...p,
      status: M.papelNoBando(p) === 'lider' ? 'morto' : p.status,
      atual: p.nome === 'Goblin (minion)' && p.ordem === 3,
    }));
    const r = M.fugaDeBandos(parts);
    expect(r.viraRodada).toBe(false);
    expect(r.participantes.find((p) => p.atual).nome).toBe('Bia');
  });

  it('fugitivo na vez e último da ordem: a gravação vira a rodada e loga a fuga', () => {
    const parts = bandoAtivo().map((p) => ({
      ...p,
      status: M.papelNoBando(p) === 'lider' ? 'morto' : p.status,
      atual: p.ordem === 3,
    }));
    const { campos, texto } = M.fugaNaGravacao({ participantes: parts }, { log: [], rodada: 4 });
    expect(texto).toMatch(/Goblin \(líder\) caiu — .* fugiram/);
    expect(campos.rodada).toBe(5);
    expect(campos.log[0]).toMatchObject({ rodada: 4, acao: 'sistema' });
    expect(campos.participantes.find((p) => p.atual).nome).toBe('Ana');
  });

  it('gravação sem fuga passa intacta', () => {
    const campos = { participantes: bandoAtivo() };
    expect(M.fugaNaGravacao(campos, { log: [], rodada: 1 }).campos).toBe(campos);
  });
});

describe('tabuleiro: o bando anda com o líder', () => {
  const bando = (liderPos) => M.formarBandos([1, 2, 3, 4, 5].map((i) => cri(1, i, {
    status: 'ativo', pos: i === 1 ? liderPos : null,
  })));

  it('posicionar o líder coloca os 4 minions encostados nele, sem sobrepor ninguém', () => {
    const out = T.bandoSegueLider(bando({ x: 30, y: 15 }), 'g1-1');
    const lider = out[0];
    const minions = out.slice(1);
    minions.forEach((m) => {
      expect(T.posValida(m.pos)).toBe(true);
      expect(T.distanciaBordas(m.pos, lider.pos)).toBe(1);
    });
    const todos = out.map((p) => `${p.pos.x},${p.pos.y}`);
    expect(new Set(todos).size).toBe(5);
    out.forEach((p) => expect(T.celulaOcupada(p.pos, out, p)).toBe(false));
  });

  it('quando o líder anda, os minions vêm atrás; minion já encostado não se mexe', () => {
    const postos = T.bandoSegueLider(bando({ x: 30, y: 15 }), 'g1-1');
    const andou = postos.map((p, i) => (i === 0 ? { ...p, pos: { x: 36, y: 15 } } : p));
    const out = T.bandoSegueLider(andou, 'g1-1');
    out.slice(1).forEach((m) => expect(T.distanciaBordas(m.pos, out[0].pos)).toBeLessThanOrEqual(1));
    expect(T.bandoSegueLider(out, 'g1-1')).toBe(out);
  });

  it('minion não anda sozinho com o líder de pé; com o líder caído, anda', () => {
    const parts = T.bandoSegueLider(bando({ x: 30, y: 15 }), 'g1-1');
    const minion = { ...parts[1], mov_rest: 5 };
    expect(T.validarMovimento(minion, { x: minion.pos.x, y: minion.pos.y + 4 }, parts).motivo).toBe('segue_lider');
    const semLider = parts.map((p, i) => (i === 0 ? { ...p, status: 'desmaiado' } : p));
    expect(T.minionPresoAoLider(minion, semLider)).toBe(false);
  });
});

describe('Falha Crítica: autodano pela metade no texto e na conta', () => {
  it('interpolarFalhaCritica e aplicarFalhaCritica usam o mesmo número', () => {
    const arma = { dano: 12 };
    const texto = M.interpolarFalhaCritica(M.FALHA_CRITICA_TABELA.CORTE[2], arma);
    const { dano } = M.aplicarFalhaCritica({ eh: 0, eh_max: 0, ar: 0, ef: 30, res: 0, status: 'ativo', status_temp: [] }, arma, 2);
    expect(dano).toBe(3);   // 50% de 12 = 6 → metade = 3
    expect(texto).toContain(`${dano} de dano na EF`);
  });
});
