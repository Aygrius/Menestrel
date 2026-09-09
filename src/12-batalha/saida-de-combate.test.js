/* ============================================================
   saida-de-combate.test.js — desmaiar / morrer / desistir
   ============================================================
   Quem sai de combate dispara SEMPRE as mesmas três coisas:
     1. o status muda;
     2. a magia que a pessoa sustentava CAI (quebrarConcentracao);
     3. se era a vez dela, a vez passa — e se ela era a ÚLTIMA da ordem,
        a rodada VIRA, em vez de zerar o `atual` de todos.

   Bug que motivou o arquivo (auditoria 01/09/2026): o Mestre fazia as
   três (mudarStatus), o Jogador que desistia não fazia nem a 2 nem a 3
   (handleDesistir). Desistir sendo o último da ordem deixava a batalha
   sem ninguém na vez — softlock idêntico ao que a virada automática de
   30/08/2026 tinha corrigido em todos os OUTROS caminhos; este passou
   batido. E a magia sustentada por quem desistiu ficava no alvo pra
   sempre.

   `saidaDeCombate` é a peça pura que os dois lados passaram a usar, pra
   não voltarem a divergir.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const lutador = (nome, ordem, extra) => ({
  tipo: 'pj', ref_id: nome, inst_id: nome, nome, ordem,
  status: 'ativo', atual: false, vb: 20,
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], ...extra,
});

// Buff de Velocidade sustentado por `ator` (o shape que aplicarEfeitoApoio gera).
const buffSustentado = (ator) => ({
  id: 'mag:velocidade:x', nome: 'Velocidade', icone: '🌀',
  rodadas_rest: null, efeito: { tipo: 'mod_vb', valor: 10 },
  concentracao: { ator, magia_key: 'velocidade' },
});

describe('saidaDeCombate — status + concentração', () => {
  it('grava o novo status só no participante que saiu', () => {
    const arr = [lutador('A', 1), lutador('B', 2)];
    const r = M.saidaDeCombate(arr, arr[0], 'desistiu');
    expect(r.participantes[0].status).toBe('desistiu');
    expect(r.participantes[1].status).toBe('ativo');
  });

  it('derruba a magia que quem saiu sustentava, no alvo', () => {
    const arr = [
      lutador('A', 1, { atual: true }),
      lutador('B', 2, { status_temp: [buffSustentado('A')] }),
    ];
    const r = M.saidaDeCombate(arr, arr[0], 'desistiu');
    expect(r.participantes[1].status_temp).toHaveLength(0);
  });

  it('não derruba a magia sustentada por OUTRA pessoa', () => {
    const arr = [
      lutador('A', 1, { atual: true }),
      lutador('B', 2, { status_temp: [buffSustentado('C')] }),
      lutador('C', 3),
    ];
    const r = M.saidaDeCombate(arr, arr[0], 'desistiu');
    expect(r.participantes[1].status_temp).toHaveLength(1);
  });

  it('participante desconhecido não muda nada', () => {
    const arr = [lutador('A', 1)];
    const r = M.saidaDeCombate(arr, lutador('Z', 9), 'morto');
    expect(r.participantes).toBe(arr);
    expect(r.viraRodada).toBe(false);
  });
});

describe('saidaDeCombate — a vez', () => {
  it('quem não estava na vez não mexe em quem está', () => {
    const arr = [lutador('A', 1, { atual: true }), lutador('B', 2)];
    const r = M.saidaDeCombate(arr, arr[1], 'desistiu');
    expect(r.participantes.find((p) => p.atual).nome).toBe('A');
    expect(r.viraRodada).toBe(false);
  });

  it('quem estava na vez passa pro próximo ATIVO da ordem', () => {
    const arr = [
      lutador('A', 1, { atual: true }),
      lutador('B', 2, { status: 'morto' }),
      lutador('C', 3),
    ];
    const r = M.saidaDeCombate(arr, arr[0], 'desistiu');
    expect(r.participantes.find((p) => p.atual).nome).toBe('C');
    expect(r.viraRodada).toBe(false);
  });

  it('ÚLTIMO da ordem → pede virada de rodada, não zera o `atual` de todos', () => {
    const arr = [lutador('A', 1), lutador('B', 2, { atual: true })];
    const r = M.saidaDeCombate(arr, arr[1], 'desistiu');
    expect(r.viraRodada).toBe(true);
  });

  it('a virada pedida devolve alguém na vez (é o antídoto do softlock)', () => {
    const arr = [lutador('A', 1), lutador('B', 2, { atual: true })];
    const r = M.saidaDeCombate(arr, arr[1], 'desistiu');
    expect(r.viraRodada).toBe(true);
    const { participantes: proxima } = M.montarNovaRodada(r.participantes);
    expect(proxima.filter((p) => p.atual)).toHaveLength(1);
    expect(proxima.find((p) => p.atual).nome).toBe('A');
  });

  it('último da ordem E ninguém mais de pé: vira a rodada sem ninguém atual', () => {
    const arr = [lutador('A', 1, { status: 'morto' }), lutador('B', 2, { atual: true })];
    const r = M.saidaDeCombate(arr, arr[1], 'desistiu');
    expect(r.viraRodada).toBe(true);
    const { participantes: proxima } = M.montarNovaRodada(r.participantes);
    expect(proxima.filter((p) => p.atual)).toHaveLength(0);
  });

  it('não muta o array recebido', () => {
    const arr = [lutador('A', 1, { atual: true }), lutador('B', 2)];
    M.saidaDeCombate(arr, arr[0], 'morto');
    expect(arr[0].status).toBe('ativo');
    expect(arr[0].atual).toBe(true);
  });
});
