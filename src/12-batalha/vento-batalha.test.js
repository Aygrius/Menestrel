/* ============================================================
   vento-batalha.test.js — o vento da mesa pesa na batalha
   ============================================================
   24/09/2026: "Corrija o vento em batalha, o vento pode mudar durante a
   batalha, e isso também influencia."

   Tornado −4, vendaval −3, ventania −2, ventos leves −1 de velocidade, só nos
   PJs. O vb do snapshot fica intacto; a penalidade mora em `vento_vb` e
   vbEfetivo a desconta. A virada de rodada carimba o vento CORRENTE.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });
afterEach(() => { M.definirVentoDaBatalha(undefined); });

const pj = (extra) => ({ tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Eco', vb: 20, pa_max: 2, pa_rest: 0,
  status: 'ativo', ordem: 1, ef: 10, ef_max: 10, eh: 10, eh_max: 10, ...extra });
const cri = (extra) => ({ tipo: 'criatura', ref_id: 9, inst_id: 'cri:9', nome: 'Lobo', vb: 19, pa_max: 1, pa_rest: 0,
  status: 'ativo', ordem: 2, ef: 10, ef_max: 10, eh: 10, eh_max: 10, ...extra });

describe('vbEfetivo desconta o vento', () => {
  it('sem vento carimbado, nada muda', () => {
    expect(M.vbEfetivo(pj())).toBe(20);
  });
  it('vento_vb sai da velocidade efetiva', () => {
    expect(M.vbEfetivo(pj({ vento_vb: 4 }))).toBe(16);
  });
});

describe('aplicarVentoNosPjs', () => {
  it('os quatro degraus', () => {
    const vb = (v) => M.aplicarVentoNosPjs([pj()], v)[0].vento_vb;
    expect(vb('leves')).toBe(1);
    expect(vb('ventania')).toBe(2);
    expect(vb('vendaval')).toBe(3);
    expect(vb('tornado')).toBe(4);
  });
  it('sem vento zera a penalidade', () => {
    expect(M.aplicarVentoNosPjs([pj({ vento_vb: 4 })], 'sem_vento')[0].vento_vb).toBe(0);
    expect(M.aplicarVentoNosPjs([pj({ vento_vb: 4 })], null)[0].vento_vb).toBe(0);
  });
  it('criatura não sofre', () => {
    expect(M.aplicarVentoNosPjs([cri()], 'tornado')[0].vento_vb).toBeUndefined();
  });
  it('vento ainda não lido mantém o que estava', () => {
    const arr = [pj({ vento_vb: 3 })];
    expect(M.aplicarVentoNosPjs(arr, undefined)).toBe(arr);
  });
});

describe('o vento muda no meio da batalha', () => {
  it('a virada carimba o vento corrente e reordena a iniciativa', () => {
    // Sem vento, o PJ (20) age antes do lobo (19).
    const r0 = M.montarNovaRodada([pj(), cri()]);
    expect(r0.participantes.find((p) => p.tipo === 'pj').ordem).toBe(1);

    // O Mestre sobe para tornado: PJ cai para 16 e o lobo passa na frente.
    M.definirVentoDaBatalha('tornado');
    const r1 = M.montarNovaRodada(r0.participantes);
    const eco = r1.participantes.find((p) => p.tipo === 'pj');
    expect(eco.vento_vb).toBe(4);
    expect(eco.vb).toBe(20);   // o vb do snapshot fica intacto
    expect(eco.ordem).toBe(2);

    // O vento para: a rodada seguinte devolve a velocidade.
    M.definirVentoDaBatalha('sem_vento');
    const r2 = M.montarNovaRodada(r1.participantes);
    expect(r2.participantes.find((p) => p.tipo === 'pj').vento_vb).toBe(0);
    expect(r2.participantes.find((p) => p.tipo === 'pj').ordem).toBe(1);
  });

  it('o vento tira a ação extra de quem passava de 30', () => {
    M.definirVentoDaBatalha('sem_vento');
    const rapido = M.montarNovaRodada([pj({ vb: 32 })]).participantes[0];
    expect(rapido.pa_rest).toBe(3);
    M.definirVentoDaBatalha('ventania');
    const freado = M.montarNovaRodada([pj({ vb: 32 })]).participantes[0];
    expect(freado.pa_rest).toBe(2);
  });
});

/* 24/09/2026: "O vento reduz também a velocidade da montaria." Quem anda é o
   cavalo, e o cavaleiro leva o carimbo do vento — o passo montado desconta. */
describe('o vento freia a montaria', () => {
  it('passo montado desconta o vento do cavaleiro', () => {
    const cavaleiro = pj({ vb: 8, vento_vb: 3, montaria: { velocidade: 21 } });
    expect(M.vbParaMovimento(cavaleiro)).toBe(18);
  });
  it('sem vento, o passo é o do cavalo', () => {
    expect(M.vbParaMovimento(pj({ vb: 8, montaria: { velocidade: 21 } }))).toBe(21);
  });
  it('nunca abaixo de zero', () => {
    expect(M.vbParaMovimento(pj({ vb: 8, vento_vb: 4, montaria: { velocidade: 3 } }))).toBe(0);
  });
});
