/* ============================================================
   rodada-sem-livre.test.js — auditoria 13/11/2026, item 23
   ============================================================
   Se todo ativo estava preso (canalizando ou "sem ações"), a virada não dava
   a vez a ninguém e a batalha parava: as redes de passar a vez só disparam
   com alguém na vez. Agora a vez vai ao primeiro ativo da ordem, e as redes a
   passam até alguém poder agir.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const semAcoes = (n) => ({ id: 'fc_caido', nome: 'Caído', rodadas_rest: n, efeito: { tipo: 'sem_acoes' } });
const lutador = (inst_id, ordem, over = {}) => ({ inst_id, tipo: 'criatura', ref_id: ordem, nome: inst_id, ordem,
  status: 'ativo', vb: 10, pa_max: 1, pa_rest: 0, ef: 20, ef_max: 20, eh: 0, eh_max: 0, status_temp: [], ...over });

describe('a virada sempre dá a vez a alguém', () => {
  it('todo ativo sem ações: a vez vai ao primeiro da ordem (antes, ninguém)', () => {
    const { participantes } = M.montarNovaRodada([
      lutador('a', 1, { status_temp: [semAcoes(3)] }),
      lutador('b', 2, { status_temp: [semAcoes(3)] }),
    ]);
    const atuais = participantes.filter((p) => p.atual);
    expect(atuais).toHaveLength(1);
    // A rede de passar a vez dispara: sem ação restante OU "sem ações".
    const presa = !M.temAcaoRestante(atuais[0])
      || atuais[0].status_temp.some((s) => s.efeito && s.efeito.tipo === 'sem_acoes');
    expect(presa).toBe(true);
  });
  it('com alguém livre, a vez é dele, como antes', () => {
    const { participantes } = M.montarNovaRodada([
      lutador('a', 1, { status_temp: [semAcoes(3)] }),
      lutador('b', 2),
    ]);
    expect(participantes.find((p) => p.atual).inst_id).toBe('b');
  });
  it('ninguém ativo: ninguém na vez', () => {
    const { participantes } = M.montarNovaRodada([lutador('a', 1, { status: 'morto' })]);
    expect(participantes.some((p) => p.atual)).toBe(false);
  });
});
