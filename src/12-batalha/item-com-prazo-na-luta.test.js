/* ============================================================
   item-com-prazo-na-luta.test.js — auditoria 13/11/2026, item 20
   ============================================================
   Fogo Vivo, Karmaquoso, Cinetézio e os Elixires da Euforia caíam na porta
   comum do item em combate: EH e karma travavam no teto e Velocidade nem era
   barra — o item sumia da mochila sem efeito. E fora do combate a porta com
   prazo descartava o "Aumenta 10 de Vício".
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/efeito-temporario.jsx';
import '../01-core/game-data.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.aplicarEfeitoItemSnapshot).toBeTypeOf('function'); });

// Textos literais do catálogo (14/11/2026).
const FOGO_VIVO = { slug: 'fogo_vivo', nome: 'Fogo Vivo', grupo: 'Consumíveis',
  efeito_positivo: 'Aumenta 5 de Energia Heroica.', efeito_negativo: 'Aumenta 10 de Vício.', efeito_duracao_dias: 2 };
const KARMAQUOSO = { slug: 'karma_liquido', nome: 'Karmaquoso', grupo: 'Consumíveis',
  efeito_positivo: 'Aumenta 10 de Karma.', efeito_negativo: 'Aumenta 10 de Vício.', efeito_duracao_dias: 2 };
const EUFORIA = { slug: 'elixir_euforia_1', nome: 'Elixir da Euforia I', grupo: 'Consumíveis',
  efeito_positivo: 'Aumenta 5 de Velocidade.', efeito_negativo: null, efeito_duracao_horas: 6 };

const pj = (over = {}) => ({ tipo: 'pj', ref_id: 1, inst_id: 'pj:1', status: 'ativo',
  eh: 30, eh_max: 30, ef: 20, ef_max: 20, ar: 0, ar_max: 0, karma: 12, karma_max: 12, vb: 20,
  condicoes: {}, status_temp: [], ...over });

describe('o bônus com prazo na luta', () => {
  it('Fogo Vivo com a EH cheia: sobe o atual e o máximo (passa do teto)', () => {
    const r = M.aplicarEfeitoItemSnapshot(pj(), FOGO_VIVO, 1);
    expect(r).toMatchObject({ eh: 35, eh_max: 35 });
  });
  it('duas doses, o dobro', () => {
    expect(M.aplicarEfeitoItemSnapshot(pj(), FOGO_VIVO, 2)).toMatchObject({ eh: 40, eh_max: 40 });
  });
  it('Karmaquoso com o karma cheio: +10 no atual e no máximo', () => {
    expect(M.aplicarEfeitoItemSnapshot(pj(), KARMAQUOSO, 1)).toMatchObject({ karma: 22, karma_max: 22 });
  });
  it('Elixir da Euforia: +5 de velocidade', () => {
    expect(M.aplicarEfeitoItemSnapshot(pj(), EUFORIA, 1).vb).toBe(25);
  });
  it('o bônus viaja para o encerramento', () => {
    const r = M.aplicarEfeitoItemSnapshot(pj(), FOGO_VIVO, 1);
    expect(r.efeitos_temporarios_luta).toHaveLength(1);
    expect(r.efeitos_temporarios_luta[0]).toMatchObject({ key: 'eh', valor: 5, dias: 2, vence_em: null });
  });
  it('o Vício (resto do efeito) entra pela porta comum', () => {
    const r = M.aplicarEfeitoItemSnapshot(pj(), FOGO_VIVO, 1);
    const tocouCondicao = Object.values(r.condicoes || {}).some((v) => Number(v) !== 0);
    expect(tocouCondicao).toBe(true);
  });
});

describe('o encerramento grava o bônus na ficha', () => {
  const FIM = { dia: 11, mes: 11, ano: 1500, hora: 14, minuto: 0 };
  it('vira linha de efeitos_temporarios, vencendo 2 dias depois do fim da luta', () => {
    const p = M.aplicarEfeitoItemSnapshot(pj(), FOGO_VIVO, 1);
    const est = M.estadoAoEncerrar({ vitalidade: {} }, p, FIM);
    expect(est.efeitos_temporarios).toHaveLength(1);
    expect(est.efeitos_temporarios[0]).toMatchObject({ key: 'eh', valor: 5, vence_em: { dia: 13, mes: 11, ano: 1500 } });
  });
  it('prazo em horas vence na hora: Euforia I, 6 horas depois', () => {
    const p = M.aplicarEfeitoItemSnapshot(pj(), EUFORIA, 1);
    const est = M.estadoAoEncerrar({ vitalidade: {} }, p, FIM);
    expect(est.efeitos_temporarios[0].vence_em).toMatchObject({ dia: 11, hora: 20 });
  });
  it('sem item com prazo, a ficha não ganha a lista', () => {
    const est = M.estadoAoEncerrar({ vitalidade: {} }, pj(), FIM);
    expect(est.efeitos_temporarios).toBeUndefined();
  });
});

describe('fora do combate, o Vício não some mais', () => {
  it('aplicarEfeitosItem com prazo: grava a linha E aplica o resto', () => {
    const HOJE = { dia: 11, mes: 11, ano: 1500 };
    const est = window.aplicarEfeitosItem({ condicoes: {}, vitalidade: {} }, FOGO_VIVO, 1, { ef: 20, eh: 30, ka: 12, ar: 0 }, HOJE);
    expect(est.efeitos_temporarios).toHaveLength(1);
    const tocouCondicao = Object.values(est.condicoes || {}).some((v) => Number(v) !== 0);
    expect(tocouCondicao).toBe(true);
  });
});
