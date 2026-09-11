/* ============================================================
   dano-ordem.test.js — a ordem de aplicação do dano
   ============================================================
   A ordem MUDA O NÚMERO, então está fixada na spec §4.3 e travada aqui:

     1. dano base           danoNoTier
     2. + dano_pct          do atacante
     3. − mod_dano_max      do alvo (Posicionamento, Fase 1)
     4. − dano_recebido_pct do alvo
     5. cascata             EH → AR → EF

   Percentuais SOMAM antes de multiplicar: +25% e +50% dão +75%, não
   +87,5%. O teste abaixo distingue as duas leituras.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.danoFinal).toBeTypeOf('function'); });

const comStatus = (...efeitos) => ({
  inst_id: 'x', eh: 50, eh_max: 50, ar: 0, ar_max: 0, ef: 50, ef_max: 50, status: 'ativo',
  status_temp: efeitos.map((efeito, i) => ({ id: 'st' + i, nome: 's', icone: '·', rodadas_rest: 1, efeito })),
});
const limpo = () => comStatus();

describe('somaDanoPct e somaDanoRecebidoPct', () => {
  it('somam os percentuais do mesmo tipo', () => {
    const p = comStatus({ tipo: 'dano_pct', valor: 25 }, { tipo: 'dano_pct', valor: 50 });
    expect(M.somaDanoPct(p)).toBe(75);
  });

  it('dano recebido é negativo e soma', () => {
    const p = comStatus({ tipo: 'dano_recebido_pct', valor: -25 }, { tipo: 'dano_recebido_pct', valor: -50 });
    expect(M.somaDanoRecebidoPct(p)).toBe(-75);
  });

  it('sem status, zero', () => {
    expect(M.somaDanoPct(limpo())).toBe(0);
    expect(M.somaDanoRecebidoPct(limpo())).toBe(0);
  });
});

describe('danoFinal', () => {
  it('sem modificador nenhum, devolve o dano base', () => {
    expect(M.danoFinal(20, limpo(), limpo())).toBe(20);
  });

  it('aplica o bônus do atacante', () => {
    expect(M.danoFinal(20, comStatus({ tipo: 'dano_pct', valor: 25 }), limpo())).toBe(25);
  });

  // A distinção que importa: somar antes, não multiplicar em cadeia.
  // Somando: 20 × 1.75 = 35. Em cadeia: 20 × 1.25 × 1.50 = 37.5 → 38.
  it('percentuais SOMAM antes de multiplicar', () => {
    const atacante = comStatus({ tipo: 'dano_pct', valor: 25 }, { tipo: 'dano_pct', valor: 50 });
    expect(M.danoFinal(20, atacante, limpo())).toBe(35);
  });

  it('aplica a redução do alvo', () => {
    expect(M.danoFinal(20, limpo(), comStatus({ tipo: 'dano_recebido_pct', valor: -75 }))).toBe(5);
  });

  it('mod_dano_max do alvo entra ANTES da redução percentual', () => {
    // 20 − 4 = 16, depois −50% = 8. Se a ordem invertesse: 20 −50% = 10, −4 = 6.
    const alvo = comStatus({ tipo: 'mod_dano_max', valor: -4 }, { tipo: 'dano_recebido_pct', valor: -50 });
    expect(M.danoFinal(20, limpo(), alvo)).toBe(8);
  });

  it('bônus e redução convivem', () => {
    // 20 +25% = 25, depois −50% = 12.5 → 13 (arredonda pra cima, como o resto do sistema)
    expect(M.danoFinal(20, comStatus({ tipo: 'dano_pct', valor: 25 }),
                           comStatus({ tipo: 'dano_recebido_pct', valor: -50 }))).toBe(13);
  });

  it('piso 0 — reduzir dano nunca vira cura', () => {
    const alvo = comStatus({ tipo: 'dano_recebido_pct', valor: -75 }, { tipo: 'mod_dano_max', valor: -50 });
    expect(M.danoFinal(10, limpo(), alvo)).toBe(0);
  });

  it('dano base 0 continua 0', () => {
    expect(M.danoFinal(0, comStatus({ tipo: 'dano_pct', valor: 50 }), limpo())).toBe(0);
  });
});
