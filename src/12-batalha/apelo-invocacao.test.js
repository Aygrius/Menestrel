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
    expect(partiram).toEqual([{ nome: 'Enviado II', parte: 'celestial' }]);
    expect(participantes).toEqual([sacerdote]);
  });
  it('de pé, fica', () => {
    const vivo = M.participanteInvocado(snap, sacerdote, [sacerdote]);
    expect(M.partemOsInvocados([sacerdote, vivo]).partiram).toEqual([]);
  });
});

/* ── As outras invocações (09/11/2026): "Há outras magias que evocam outros
   seres." Escolhidas pelo usuário: Última Oração, Convocação Animal,
   Pseudomatéria, Projeção e Guardião Espiritual. */
describe('o pedido de cada invocação', () => {
  const reg = (k) => window.magiaEfeitoDe(k).efeitos.find((e) => e.tipo === 'invocar');
  it('Última Oração: Enviado I no nível 1, Enviado V no 9', () => {
    expect(M.pedidoDeInvocacao(reg('ultima_oracao'), { key: 'ultima_oracao' }, 1).criatura).toBe('Enviado I');
    expect(M.pedidoDeInvocacao(reg('ultima_oracao'), { key: 'ultima_oracao' }, 9).criatura).toBe('Enviado V');
  });
  it('Convocação Animal: total e máximo lidos do texto', () => {
    const mag = { key: 'convocacao_animal', nivel_3: 'Convoque animais totalizando 18 estágios, mas o estágio máximo de cada animal é 6.' };
    expect(M.pedidoDeInvocacao(reg('convocacao_animal'), mag, 3)).toMatchObject({ escolha: 'Animal', total: 18, max: 6 });
  });
  it('sintético leva o texto do nível', () => {
    const mag = { key: 'projecao', nivel_5: 'A projeção possui 20 de energia heroica.' };
    expect(M.pedidoDeInvocacao(reg('projecao'), mag, 5)).toMatchObject({ sintetico: 'projecao', texto: mag.nivel_5 });
  });
});

describe('o ser que não está no bestiário', () => {
  const conj = { tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous Pedra', raca: 'Anão', vb: 12,
    eh_max: 40, ef_max: 20, defesa_sigla: 'M', defesa_valor: 4, rf: 5, rm: 7, pos: { x: 3, y: 3 } };
  const semCat = { criById: {}, pjById: {}, catalogoBySlug: {}, magiasByKey: {}, tecnicasByKey: {} };

  it('ilusão: tudo do texto', () => {
    const f = M.fichaSintetica({ sintetico: 'ilusao',
      texto: 'A ilusão possui 6 de energia física, 30 de energia heroica, defesa M1 e dano máximo 20.' }, conj, semCat);
    expect(f).toMatchObject({ nome: 'Ilusão de Yuldrous', ef: 6, eh: 30, defesa_sigla: 'M', defesa_valor: 1 });
    expect(f.ataque.dano_100).toBe(20);
  });
  it('projeção: a EH do texto, EF 1, a defesa do conjurador', () => {
    const f = M.fichaSintetica({ sintetico: 'projecao', texto: 'A projeção possui 20 de energia heroica.' }, conj, semCat);
    expect(f).toMatchObject({ nome: 'Projeção de Yuldrous', ef: 1, eh: 20, defesa_sigla: 'M', defesa_valor: 4 });
  });
  it.each([
    ['Cada corpo tem 1 de energia heroica.', 1, 1],
    ['Cada corpo tem metade da sua energia heroica.', 20, 1],
    ['Cada corpo tem a mesma da sua energia heroica que a sua.', 40, 1],
    ['Cada corpo tem metade da sua energia heroica e energia física.', 20, 10],
    ['Casa corpo terá a mesma energia física e energia heroica que a sua.', 40, 20],
  ])('guardião: "%s" → EH %i, EF %i', (texto, eh, ef) => {
    expect(M.fichaSintetica({ sintetico: 'guardiao', texto }, conj, semCat)).toMatchObject({ eh, ef });
  });
  it('vira combatente com ref_id negativo, que ataca pela própria ficha e não se saqueia', () => {
    const f = M.fichaSintetica({ sintetico: 'ilusao',
      texto: 'A ilusão possui 2 de energia física, 10 de energia heroica, defesa L1 e dano máximo 12.' }, conj, semCat);
    const p = M.participanteInvocado(M.snapshotSintetico(f, conj), conj, [conj], 'desfaz');
    expect(p.ref_id).toBeLessThan(0);
    expect(p).toMatchObject({ tipo: 'criatura', ef: 2, eh: 10, defesa_sigla: 'L', defesa_valor: 1, lado: 'aliados' });
    expect(M.criaturaDoAtor(p, semCat)).toBe(p.ficha_invocada);
    expect(M.ataquesDoAtor(p, semCat)[0].dano_100).toBe(12);
    const pj = { tipo: 'pj', status: 'ativo', atual: true };
    expect(M.podeSaquear(pj, { ...p, status: 'morto' })).toBe(false);
  });
  it('quando cai, se desfaz', () => {
    const f = M.fichaSintetica({ sintetico: 'projecao', texto: 'A projeção possui 1 de energia heroica.' }, conj, semCat);
    const p = { ...M.participanteInvocado(M.snapshotSintetico(f, conj), conj, [conj], 'desfaz'), status: 'morto' };
    expect(M.partemOsInvocados([conj, p]).partiram).toEqual([{ nome: 'Projeção de Yuldrous', parte: 'desfaz' }]);
  });
});

describe('o animal convocado e as criaturas que chegam depois', () => {
  it('o animal é de carne e osso: quando cai, fica', () => {
    const lobo = { tipo: 'criatura', ref_id: 50, nome: 'Lobo', status: 'ativo', pos: null };
    const p = { ...M.participanteInvocado(lobo, sacerdote, [sacerdote], null), status: 'morto' };
    expect(M.partemOsInvocados([sacerdote, p]).partiram).toEqual([]);
  });
  it('a criatura que chegou e não está no catálogo da tela é buscada; o ser sintético, não', () => {
    const cat = { criById: { 4: { id: 4 } } };
    const parts = [
      { tipo: 'criatura', ref_id: 4 }, { tipo: 'criatura', ref_id: 11 }, { tipo: 'criatura', ref_id: '13' },
      { tipo: 'criatura', ref_id: -77, ficha_invocada: { id: -77 } }, { tipo: 'pj', ref_id: 64 },
    ];
    expect(M.idsDeCriaturaQueFaltam(parts, cat)).toEqual([11, 13]);
  });
});
