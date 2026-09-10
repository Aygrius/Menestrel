/* ============================================================
   dano-cascata-modificadores.test.js — a assinatura nova da cascata
   ============================================================
   A Fase 2 precisa que o golpe possa pular a EH (ignora_eh, Derrubado) e
   a AR (ignora_armadura). O mecanismo de pular a EH JÁ EXISTIA — é o que
   o crítico faz. Esta task acrescenta produtores, não mecanismo.

   O primeiro describe é REGRESSÃO: a forma antiga de chamar tem que
   continuar valendo exatamente igual. motor-batalha.test.js cobre as
   mesmas regras e não pode mudar nenhuma expectativa.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.aplicarDanoCascata).toBeTypeOf('function'); });

const alvo = (over = {}) => ({ eh: 10, eh_max: 10, ar: 5, ar_max: 5, ef: 20, ef_max: 20, status: 'ativo', ...over });

describe('compatibilidade — a forma antiga continua idêntica', () => {
  it('booleano false se comporta como antes: come EH, depois AR, depois EF', () => {
    const r = M.aplicarDanoCascata(12, alvo(), false);
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 0, ar: 3, ef: 20 });
  });

  it('booleano true pula a EH, como o crítico sempre fez', () => {
    const r = M.aplicarDanoCascata(12, alvo(), true);
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 0, ef: 13 });
  });

  it('sem terceiro argumento não pula nada', () => {
    const r = M.aplicarDanoCascata(3, alvo());
    expect(r.eh).toBe(7);
  });
});

describe('objeto de modificadores', () => {
  it('{ critico: true } é igual ao booleano true', () => {
    const a = M.aplicarDanoCascata(12, alvo(), true);
    const b = M.aplicarDanoCascata(12, alvo(), { critico: true });
    expect({ eh: b.eh, ar: b.ar, ef: b.ef }).toEqual({ eh: a.eh, ar: a.ar, ef: a.ef });
  });

  it('ignoraEh pula a EH e começa na AR', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraEh: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 0, ef: 13 });
  });

  it('ignoraArmadura pula a AR mas come a EH', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraArmadura: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 0, ar: 5, ef: 18 });
  });

  it('os dois juntos vão direto na EF', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraEh: true, ignoraArmadura: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 5, ef: 8 });
  });
});

describe('as garantias antigas não mudam', () => {
  it('a EF para no piso de morte e o excedente vira sobra', () => {
    const r = M.aplicarDanoCascata(100, alvo(), { ignoraEh: true, ignoraArmadura: true });
    expect(r.ef).toBe(M.EF_MORTE);
    expect(r.sobra).toBe(100 - (20 - M.EF_MORTE));
    expect(r.status).toBe('morto');
  });

  it('zerar a EH derruba quem tem pool de EH', () => {
    const r = M.aplicarDanoCascata(10, alvo());
    expect(r.eh).toBe(0);
    expect(r.status).toBe('desmaiado');
  });

  it('quem não tem pool de EH não desmaia por EH zero', () => {
    const r = M.aplicarDanoCascata(1, alvo({ eh: 0, eh_max: 0 }));
    expect(r.status).toBe('ativo');
  });
});
