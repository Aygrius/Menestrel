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

   ── O TAMANHO VIROU ESCADA (28/10/2026) ───────────────────────────────────
   "Quando há muitas criaturas iguais, acima de 6, vamos fazer grupos de 3,
   acima de 10, grupos de 4, acima de 16, grupos de 5." (usuário)

   Até 6 iguais ninguém vira bando — antes bastavam 5. E uma consequência que
   vale anotar: no primeiro degrau o bando NUNCA sai sozinho. Com 7 e grupos
   de 3 saem dois bandos e um solto; é da regra, não um acidente dos dados de
   teste — e é por isso que as bancadas abaixo deixaram de ter cinco bichos.
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

// Uma leva de `n` criaturas iguais, já agrupada pela regra do dia.
const bando = (n, extra, ref = 1) => M.formarBandos(
  Array.from({ length: n }, (_, i) => cri(ref, i, extra)));

describe('tamanhoDoBando — a escada', () => {
  it.each([
    [1, null], [5, null], [6, null],
    [7, 3], [10, 3],
    [11, 4], [16, 4],
    [17, 5], [40, 5],
  ])('%i iguais → %s', (n, esperado) => {
    expect(M.tamanhoDoBando(n)).toBe(esperado);
  });

  it('a escada é lida de cima para baixo, e o teto é 5', () => {
    expect(M.BANDO_ESCADA.map((f) => f.tamanho)).toEqual([5, 4, 3]);
    expect(M.BANDO_TAMANHO).toBe(5);
  });
});

describe('formarBandos', () => {
  it('até 6 iguais: ninguém vira bando', () => {
    const parts = Array.from({ length: 6 }, (_, i) => cri(1, i));
    expect(M.formarBandos(parts)).toBe(parts);
  });

  /* 7 é o primeiro degrau: grupos de 3 → dois bandos e um solto. */
  it('7 iguais: 2 bandos de 3 + 1 solto, cada minion apontando para o seu líder', () => {
    const out = bando(7, undefined, 7);
    expect(out.map(M.papelNoBando)).toEqual([
      'lider', 'minion', 'minion', 'lider', 'minion', 'minion', null,
    ]);
    expect(out.slice(0, 3).every((p) => p.bando.lider === 'g7-0')).toBe(true);
    expect(out.slice(3, 6).every((p) => p.bando.lider === 'g7-3')).toBe(true);
    expect(out[0].nome).toBe('Goblin (líder 1)');
    expect(out[4].nome).toBe('Goblin (minion 2)');
    expect(out[6].nome).toBe('Goblin');
  });

  it('12 iguais: grupos de 4 — 3 bandos numerados, ninguém solto', () => {
    const out = bando(12, undefined, 7);
    expect(out.filter((p) => M.papelNoBando(p) === 'lider')).toHaveLength(3);
    expect(out.filter((p) => M.papelNoBando(p) === 'minion')).toHaveLength(9);
    expect(out[0].nome).toBe('Goblin (líder 1)');
    expect(out[8].nome).toBe('Goblin (líder 3)');
  });

  it('17 iguais: grupos de 5 — 3 bandos + 2 soltos', () => {
    const out = bando(17, undefined, 7);
    expect(out.filter((p) => M.papelNoBando(p) === 'lider')).toHaveLength(3);
    expect(out.filter((p) => M.papelNoBando(p) === 'minion')).toHaveLength(12);
    expect(out.slice(15).every((p) => !p.bando && p.nome === 'Goblin')).toBe(true);
  });

  it('é idempotente e não mistura tipos nem PJs', () => {
    const parts = [pj('Ana'), ...Array.from({ length: 7 }, (_, i) => cri(1, i)), cri(2, 0)];
    const uma = M.formarBandos(parts);
    expect(M.formarBandos(uma)).toBe(uma);
    expect(uma[0].bando).toBeUndefined();
    expect(uma[8].bando).toBeUndefined();
  });

  /* A conta do tamanho olha só os SOLTOS: recontar com os já agrupados
     mudaria bandos formados numa batalha que já começou. */
  it('quem já está em bando não entra na conta do tamanho', () => {
    const jaEm = bando(7, undefined, 1);
    const maisDois = M.formarBandos([...jaEm, cri(1, 90), cri(1, 91)]);
    // 3 soltos (o que sobrou + os dois novos) não chegam a 7: ninguém agrupa.
    expect(maisDois.slice(6).every((p) => !p.bando)).toBe(true);
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
    const b = bando(7, { vb: 10 });
    b[2] = { ...b[2], vb: 50 };   // minion veloz não passa na frente
    const ord = M.ordenarIniciativa([pj('Ana', { vb: 20 }), ...b, pj('Bia', { vb: 5 })]);
    /* O SOLTO vem antes dos bandos, e isso é da ordenação, não do bando:
       todos os goblins empatam em vb, e quem costura minion atrás de líder
       move os MEMBROS, deixando o solto onde o empate o pôs. */
    expect(ord.map((p) => p.nome)).toEqual([
      'Ana',
      'Goblin',
      'Goblin (líder 1)', 'Goblin (minion 1)', 'Goblin (minion 1)',
      'Goblin (líder 2)', 'Goblin (minion 2)', 'Goblin (minion 2)',
      'Bia',
    ]);
    expect(ord.map((p) => p.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
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
    const crus = M.formarBandos(Array.from({ length: 7 }, (_, i) => (
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
    ...bando(7, { vb: 10, status: 'ativo', pos: null }),
  ]);
  // O primeiro bando da leva — o que os testes abaixo derrubam.
  const idDoPrimeiro = (parts) => parts.find((p) => M.papelNoBando(p) === 'lider').bando.id;

  it('líder vivo: nada acontece', () => {
    const parts = bandoAtivo();
    expect(M.fugaDeBandos(parts).participantes).toBe(parts);
  });

  /* Com dois bandos na leva, o teste ficou mais forte do que era: provar que
     o bando do líder caído se espalha E que o OUTRO não se mexe. */
  it('líder morto: os minions dele fogem; o outro bando e o minion já morto ficam', () => {
    let parts = bandoAtivo();
    const alvo = idDoPrimeiro(parts);
    parts = parts.map((p) => (p.bando && p.bando.id === alvo && M.papelNoBando(p) === 'lider'
      ? { ...p, status: 'morto' } : p));
    // Um minion do bando atingido já estava morto: morto não foge.
    const iMinion = parts.findIndex((p) => p.bando && p.bando.id === alvo && M.papelNoBando(p) === 'minion');
    parts[iMinion] = { ...parts[iMinion], status: 'morto' };
    const r = M.fugaDeBandos(parts);
    const doAlvo = r.participantes.filter((p) => p.bando && p.bando.id === alvo && M.papelNoBando(p) === 'minion');
    expect(doAlvo.map((p) => p.status)).toEqual(['morto', 'desistiu']);
    expect(doAlvo.filter((p) => p.fugiu)).toHaveLength(1);
    const outros = r.participantes.filter((p) => p.bando && p.bando.id !== alvo);
    expect(outros.every((p) => p.status === 'ativo' && !p.fugiu), 'o outro bando não tem nada com isso').toBe(true);
    expect(r.fugas).toEqual([{ lider: 'Goblin (líder 1)', minions: ['Goblin (minion 1)'] }]);
  });

  it('a vez que ia para um minion em fuga passa para o próximo ativo (sem pular de fugitivo em fugitivo)', () => {
    let parts = [...bandoAtivo(), pj('Bia', { vb: 1, status: 'ativo' })];
    /* TODOS os líderes caem: a vez está no primeiro minion, e atrás dele só
       há fugitivos até o solto. Sem o salto, a vez pararia num deles. */
    parts = M.ordenarIniciativa(parts).map((p) => ({
      ...p,
      status: M.papelNoBando(p) === 'lider' ? 'morto' : p.status,
      // A ordem é Ana, solto, líder 1, minion, minion, líder 2, minion,
      // minion, Bia: a vez está no primeiro minion, e atrás dele só há
      // fugitivos e líderes caídos até a Bia.
      atual: p.ordem === 4,
    }));
    const r = M.fugaDeBandos(parts);
    expect(r.viraRodada).toBe(false);
    expect(r.participantes.find((p) => p.atual).nome).toBe('Bia');
  });

  it('fugitivo na vez e último da ordem: a gravação vira a rodada e loga a fuga', () => {
    const parts = bandoAtivo().map((p) => ({
      ...p,
      status: M.papelNoBando(p) === 'lider' ? 'morto' : p.status,
      // O ÚLTIMO da ordem é um minion do segundo bando: fugindo ele, não
      // sobra ninguém depois — e a vez volta para a Ana, na rodada seguinte.
      atual: p.ordem === 8,
    }));
    const { campos, texto } = M.fugaNaGravacao({ participantes: parts }, { log: [], rodada: 4 });
    expect(texto).toMatch(/Goblin \(líder 1\) caiu — .* fugiram/);
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
  /* Sete iguais, grupos de 3 (28/10/2026): o primeiro bando é `g1-0` e os
     dois minions dele vêm logo atrás. Os três últimos ficam de fora da
     conta — é o segundo bando e o solto, que não seguem este líder. */
  const leva = (liderPos) => M.formarBandos(Array.from({ length: 7 }, (_, i) => cri(1, i, {
    status: 'ativo', pos: i === 0 ? liderPos : null,
  })));
  const doPrimeiro = (out) => out.filter((p) => p.bando && p.bando.lider === 'g1-0');

  it('posicionar o líder coloca os minions encostados nele, sem sobrepor ninguém', () => {
    const out = T.bandoSegueLider(leva({ x: 30, y: 15 }), 'g1-0');
    const grupo = doPrimeiro(out);
    const lider = grupo[0];
    grupo.slice(1).forEach((m) => {
      expect(T.posValida(m.pos)).toBe(true);
      expect(T.distanciaBordas(m.pos, lider.pos)).toBe(1);
    });
    const casas = grupo.map((p) => `${p.pos.x},${p.pos.y}`);
    expect(new Set(casas).size).toBe(grupo.length);
    grupo.forEach((p) => expect(T.celulaOcupada(p.pos, grupo, p)).toBe(false));
  });

  it('quando o líder anda, os minions vêm atrás; minion já encostado não se mexe', () => {
    const postos = T.bandoSegueLider(leva({ x: 30, y: 15 }), 'g1-0');
    const andou = postos.map((p, i) => (i === 0 ? { ...p, pos: { x: 36, y: 15 } } : p));
    const out = T.bandoSegueLider(andou, 'g1-0');
    const grupo = doPrimeiro(out);
    grupo.slice(1).forEach((m) => expect(T.distanciaBordas(m.pos, grupo[0].pos)).toBeLessThanOrEqual(1));
    expect(T.bandoSegueLider(out, 'g1-0')).toBe(out);
  });

  it('minion não anda sozinho com o líder de pé; com o líder caído, anda', () => {
    const parts = T.bandoSegueLider(leva({ x: 30, y: 15 }), 'g1-0');
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
