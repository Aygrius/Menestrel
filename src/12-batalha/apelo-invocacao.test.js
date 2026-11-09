/* ============================================================
   apelo-invocacao.test.js — o Apelo evoca o enviado (09/11/2026)
   ============================================================
   Usuário: "A magia 'Apelo' não está aparecendo na batalha." Perguntado
   como deve funcionar: "Evoca o enviado". O milagre entra na aba Apoio,
   deixa o pedido no conjurador, e o enviado do nível chega ao lado dele;
   quando cai, volta ao Plano Celestial.
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

const APELO = {
  key: 'apelo', nome: 'Apelo', alcance: 'Pessoal', evocacao: '1 rodada', duracao: 'Instantânea',
  nivel_1: 'Evoca um enviado.', nivel_3: 'Evoca um enviado tipo I.', nivel_5: 'Evoca um enviado tipo II.',
  nivel_7: 'Evoca um enviado tipo III.', nivel_9: 'Evoca um enviado tipo IV.',
};
const sacerdote = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', status: 'ativo',
  pos: { x: 10, y: 10 }, ordem: 2, status_temp: [],
};

describe('o pedido de invocação', () => {
  it('Apelo está no registro (por isso aparece na aba Apoio)', () => {
    expect(window.magiaEfeitoDe('apelo')).toBeTruthy();
  });
  it.each([[1, 'Enviado Menor'], [3, 'Enviado I'], [5, 'Enviado II'], [7, 'Enviado III'], [9, 'Enviado IV']])(
    'nível %i evoca %s', (nivel, criatura) => {
      const p = M.aplicarEfeitoApoio(sacerdote, { key: 'apelo', nome: 'Apelo', nivel, catalogo: APELO }, 'pj:64');
      expect(p.invocacao_pendente.criatura).toBe(criatura);
      expect(p.status_temp).toEqual([]);   // não vira status
    });
});

describe('o enviado em campo', () => {
  const snap = { tipo: 'criatura', ref_id: 11, nome: 'Enviado II', status: 'ativo', ef: 30, ef_max: 30, pos: null };
  it('chega perto do conjurador, do lado dele, no automático e no fim da fila', () => {
    const outro = { tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Orc', status: 'ativo', pos: { x: 20, y: 20 }, ordem: 5 };
    const novo = M.participanteInvocado(snap, sacerdote, [sacerdote, outro]);
    expect(novo.invocado_por).toBe('pj:64');
    expect(novo.lado).toBe('aliados');
    expect(novo.auto).toBe(true);
    expect(novo.ordem).toBe(6);
    expect(Math.max(Math.abs(novo.pos.x - 10), Math.abs(novo.pos.y - 10))).toBe(1);
  });
  it('quando cai, volta ao Plano Celestial na virada', () => {
    const caido = { ...M.participanteInvocado(snap, sacerdote, [sacerdote]), status: 'morto' };
    const { participantes, partiram } = M.partemOsInvocados([sacerdote, caido]);
    expect(partiram).toEqual(['Enviado II']);
    expect(participantes).toEqual([sacerdote]);
  });
  it('de pé, fica', () => {
    const vivo = M.participanteInvocado(snap, sacerdote, [sacerdote]);
    expect(M.partemOsInvocados([sacerdote, vivo]).partiram).toEqual([]);
  });
});
