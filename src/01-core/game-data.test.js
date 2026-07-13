/* ============================================================
   game-data.test.js — motor de resolução Tagmar + ficha (01-core)
   ============================================================
   Congela o comportamento atual ANTES da Fase 1 (autodano, técnica,
   críticos automáticos). Valores literais foram extraídos rodando as
   funções reais — mudança de regra deve quebrar teste DE PROPÓSITO.

   Âncora da Fase 1.1: RESULTADOS_ACAO[0] (Falha Crítica) já carrega
   `autodano: true` — o motor da batalha é que ainda não aplica.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './game-data.jsx';

let G;
beforeAll(() => {
  G = window;
  expect(G.resolverAcao).toBeDefined();
});

/* ───────────────────────── RESULTADOS_ACAO ───────────────────────── */
describe('RESULTADOS_ACAO (tabela de qualidades)', () => {
  it('tem 8 qualidades q0..q7 na ordem FC,R,F,M,D,MD,E,A', () => {
    expect(G.RESULTADOS_ACAO.map((r) => r.codigo)).toEqual(
      ['FC', 'R', 'F', 'M', 'D', 'MD', 'E', 'A']
    );
    G.RESULTADOS_ACAO.forEach((r, i) => expect(r.q).toBe(i));
  });

  it('multiplicadores de dano: 0, 0, ¼, ½, ¾, 1, 1.25, 1.5', () => {
    expect(G.RESULTADOS_ACAO.map((r) => r.dano)).toEqual(
      [0, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5]
    );
  });

  it('FC é a ÚNICA qualidade com autodano (âncora da Fase 1.1)', () => {
    const comAutodano = G.RESULTADOS_ACAO.filter((r) => r.autodano);
    expect(comAutodano.map((r) => r.codigo)).toEqual(['FC']);
    expect(G.RESULTADOS_ACAO[0]).toMatchObject({ codigo: 'FC', erra: true, dano: 0 });
  });

  it('só FC e R erram; só A é crítico', () => {
    expect(G.RESULTADOS_ACAO.filter((r) => r.erra).map((r) => r.codigo)).toEqual(['FC', 'R']);
    expect(G.RESULTADOS_ACAO.filter((r) => r.critico).map((r) => r.codigo)).toEqual(['A']);
  });
});

/* ───────────────────── RESOLUCAO_ROWS (matriz 20×58) ─────────────── */
describe('RESOLUCAO_ROWS (Tabela de Resolução)', () => {
  it('20 linhas (d20) × 58 colunas (Coluna de Ação −7..50), dígitos 0..7', () => {
    expect(G.RESOLUCAO_ROWS.length).toBe(20);
    expect(G.ACAO_COL_MIN).toBe(-7);
    expect(G.ACAO_COL_MAX).toBe(50);
    for (const row of G.RESOLUCAO_ROWS) {
      expect(row.length).toBe(58);
      expect(row).toMatch(/^[0-7]{58}$/);
    }
  });

  it('d20=1 é SEMPRE Falha Crítica; d20=20 é SEMPRE Absurdo', () => {
    expect(G.RESOLUCAO_ROWS[0]).toBe('0'.repeat(58));
    expect(G.RESOLUCAO_ROWS[19]).toBe('7'.repeat(58));
  });

  it('qualidade nunca PIORA quando a coluna sobe (monotonia por linha)', () => {
    for (const row of G.RESOLUCAO_ROWS) {
      for (let i = 1; i < row.length; i++) {
        expect(Number(row[i])).toBeGreaterThanOrEqual(Number(row[i - 1]));
      }
    }
  });
});

/* ─────────────────────────── resolverAcao ────────────────────────── */
describe('resolverAcao', () => {
  it('clampa coluna em [−7, 50] e d20 em [1, 20]', () => {
    expect(G.resolverAcao(-100, 10).coluna).toBe(-7);
    expect(G.resolverAcao(999, 10).coluna).toBe(50);
    expect(G.resolverAcao(0, 0).d20).toBe(1);
    expect(G.resolverAcao(0, 25).d20).toBe(20);
  });

  it('d20=1 dá FC mesmo na coluna 50; d20=20 dá Absurdo mesmo na −7', () => {
    expect(G.resolverAcao(50, 1).codigo).toBe('FC');
    expect(G.resolverAcao(-7, 20)).toMatchObject({ codigo: 'A', critico: true });
  });

  it('células congeladas da tabela (valores reais extraídos)', () => {
    expect(G.resolverAcao(0, 10).codigo).toBe('F');    // q2
    expect(G.resolverAcao(10, 10).codigo).toBe('M');   // q3
    expect(G.resolverAcao(-7, 5).codigo).toBe('FC');   // coluna mínima pune até dado médio
    expect(G.resolverAcao(50, 15).codigo).toBe('A');   // q7
    expect(G.resolverAcao(25, 3).codigo).toBe('M');    // q3
    expect(G.resolverAcao(5, 18).codigo).toBe('MD');   // q5
  });

  it('devolve o objeto de RESULTADOS_ACAO enriquecido (não a referência crua)', () => {
    const r = G.resolverAcao(0, 10);
    expect(r).toMatchObject({ codigo: 'F', dano: 0.25 });
    expect(r).not.toBe(G.RESULTADOS_ACAO[2]); // spread — mutar r não suja a tabela
  });
});

/* ──────────────────────── resolverResistencia ────────────────────── */
describe('resolverResistencia (alvo no d20 pra RESISTIR)', () => {
  it('ataque ≥ defesa+12 → alvo 20 (quase impossível resistir)', () => {
    expect(G.resolverResistencia(13, 1)).toBe(20);
    expect(G.resolverResistencia(20, 8)).toBe(20);
  });

  it('valores congelados da fórmula', () => {
    expect(G.resolverResistencia(10, 10)).toBe(10);
    expect(G.resolverResistencia(1, 1)).toBe(14);
    expect(G.resolverResistencia(18, 7)).toBe(14);
    expect(G.resolverResistencia(8, 3)).toBe(16);
  });

  it('piso 1: defesa esmagadora nunca gera alvo < 1', () => {
    expect(G.resolverResistencia(20, 20)).toBe(1);
    expect(G.resolverResistencia(2, 20)).toBe(1);
  });

  it('clampa entradas em [1, 20]', () => {
    expect(G.resolverResistencia(100, 0)).toBe(G.resolverResistencia(20, 1));
  });
});

/* ─────────────────── estágio, atributos e pontos ─────────────────── */
describe('calcEstagio / custoAtributo / pontosDisponiveis', () => {
  it('faixas de XP → estágio (bordas)', () => {
    expect(G.calcEstagio(0)).toBe(1);
    expect(G.calcEstagio(10)).toBe(1);
    expect(G.calcEstagio(11)).toBe(2);
    expect(G.calcEstagio(2185)).toBe(40);
    expect(G.calcEstagio(9999)).toBe(40);   // acima da tabela → teto 40
    expect(G.calcEstagio(null)).toBe(1);
  });

  it('tabela de custo de atributo (negativos DEVOLVEM pontos)', () => {
    expect(G.custoAtributo(-2)).toBe(-1);
    expect(G.custoAtributo(-1)).toBe(-0.5);
    expect(G.custoAtributo(0)).toBe(0);
    expect(G.custoAtributo(3)).toBe(6);
    expect(G.custoAtributo(6)).toBe(21);
    expect(G.custoAtributo(7)).toBe(0);     // fora da tabela → 0
  });

  it('pontos por estágio: 15 + floor((estágio−1)/2)', () => {
    expect(G.pontosDisponiveis(1)).toBe(15);
    expect(G.pontosDisponiveis(3)).toBe(16);
  });
});

/* ─────────────── condições → atributos e reputação ───────────────── */
describe('aplicarEfeitoCondicoesAtributos', () => {
  const base = { forca: 2, fisico: 1, agilidade: 0, percepcao: 0, intelecto: 0, aura: 0, carisma: 0 };

  it('sem condições → devolve o MESMO objeto (fast-path, sem cópia)', () => {
    expect(G.aplicarEfeitoCondicoesAtributos(base, null)).toBe(base);
  });

  it('limiar, não proporcional: negativo = −2, positivo = +1 (magnitude ignorada)', () => {
    const r = G.aplicarEfeitoCondicoesAtributos(base, { nutricao: -9, vitalidade: 1 });
    expect(r.forca).toBe(0);   // Alimentação negativa → força −2 (mesmo em −9)
    expect(r.fisico).toBe(2);  // Saúde positiva → físico +1
  });

  it('condição 0 ou NaN é ignorada; original não é mutado', () => {
    const r = G.aplicarEfeitoCondicoesAtributos(base, { nutricao: 0, animo: 'x' });
    expect(r).toEqual(base);
    expect(base.forca).toBe(2);
  });
});

describe('modificadorGrupoPorReputacao', () => {
  it('neutro pra reputação 0 e pra grupos fora de Influência/Subterfúgio', () => {
    expect(G.modificadorGrupoPorReputacao('Influência', 0)).toBe(1);
    expect(G.modificadorGrupoPorReputacao('Combate', -5)).toBe(1);
  });

  it('Influência e Subterfúgio são espelhados (±25%)', () => {
    expect(G.modificadorGrupoPorReputacao('Influência', 3)).toBe(1.25);
    expect(G.modificadorGrupoPorReputacao('Influência', -3)).toBe(0.75);
    expect(G.modificadorGrupoPorReputacao('Subterfúgio', -3)).toBe(1.25);
    expect(G.modificadorGrupoPorReputacao('Subterfúgio', 3)).toBe(0.75);
  });
});

/* ───────────────────── calcularFicha (smoke) ─────────────────────── */
describe('calcularFicha (smoke — Humano Guerreiro, estágio 1)', () => {
  const pj = {
    raca: 'Humano', profissao: 'Guerreiro', experiencia: 0,
    forca_base: 2, fisico_base: 1, agilidade_base: 0, percepcao_base: 0,
    intelecto_base: 0, aura_base: 0, carisma_base: 0,
  };

  it('atributo final = base (raça NÃO é somada de novo — decisão corrigida)', () => {
    const f = G.calcularFicha(pj, null);
    expect(f.atributos.forca).toBe(2);
    expect(f.atributos.fisico).toBe(1);
  });

  it('derivadas congeladas: EF 18, EH 14, karma 0, velocidade 19', () => {
    const d = G.calcularFicha(pj, null).derivadas;
    expect(d.energiaFisica).toBe(18);
    expect(d.energiaHeroica).toBe(14);
    expect(d.karma).toBe(0);
    expect(d.velocidade).toBe(19);
  });

  it('condições cascateiam pros derivados: Saúde +2 → físico +1 → EF 19', () => {
    const f = G.calcularFicha(pj, null, { nutricao: -3, vitalidade: 2 });
    expect(f.atributos.forca).toBe(0);        // Alimentação negativa
    expect(f.atributos.fisico).toBe(2);       // Saúde positiva
    expect(f.derivadas.energiaFisica).toBe(19); // era 18 sem condição
    expect(f.derivadas.energiaHeroica).toBe(14);
  });

  it('sem condições, o 3º argumento omitido é idêntico ao comportamento antigo', () => {
    expect(G.calcularFicha(pj, null)).toEqual(G.calcularFicha(pj, null, null));
  });
});
