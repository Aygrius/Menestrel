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

/* ─────────── pontosGastos: linha de base racial (08/09/2026) ──────────── */
/* O mod racial é o NÍVEL INICIAL gratuito do atributo: o Anão com Físico +2
   já começa em 2 sem pagar nada. Por isso o gasto é medido a partir da linha
   de base da raça, não do zero absoluto. */
describe('pontosGastos — linha de base racial', () => {
  const zerado = { intelecto: 0, aura: 0, carisma: 0, forca: 0, fisico: 0, agilidade: 0, percepcao: 0 };
  // Lido do catálogo em vez de transcrito: os mods são dado de balanceamento e
  // mudam (Agi do Anão foi −1 até 08/09/2026). Um fixture copiado à mão só
  // quebra os testes quando o número muda, sem apontar nada de errado.
  let anaoBase;
  beforeAll(() => { anaoBase = { ...G.GAME_DATA.racas['Anão'].mods }; });

  it('sem raça → fórmula absoluta, igual ao comportamento antigo', () => {
    expect(G.pontosGastos({ ...zerado, forca: 2 })).toBe(3);
    // Anão: aura −1 (−0,5) + carisma −1 (−0,5) + força 2 (3) + físico 2 (3) + agilidade −2 (−1)
    expect(G.pontosGastos(anaoBase)).toBe(4);
  });

  it('Humano não tem mod nenhum: passar a raça não muda nada', () => {
    expect(G.pontosGastos({ ...zerado, forca: 2 }, 'Humano')).toBe(3);
  });

  it('raça fora do catálogo cai na linha de base 0', () => {
    expect(G.pontosGastos({ ...zerado, forca: 2 }, 'Dragão')).toBe(3);
  });

  it('recém-criado na linha de base racial não gastou nada', () => {
    expect(G.pontosGastos(anaoBase, 'Anão')).toBe(0);
  });

  it('subir a partir do mod racial custa o degrau, não o acumulado', () => {
    // Físico 2 → 3: custa 6 − 3 = 3 (e não os 6 do valor absoluto)
    expect(G.pontosGastos({ ...anaoBase, fisico: 3 }, 'Anão')).toBe(3);
  });

  it('vender o ponto racial devolve pontos (gasto negativo)', () => {
    // Físico 2 → 1: 1 − 3 = −2 de volta pra pool
    expect(G.pontosGastos({ ...anaoBase, fisico: 1 }, 'Anão')).toBe(-2);
  });

  it('desfazer uma penalidade racial custa pontos', () => {
    // Anão tem Aura −1 (linha de base −0.5); subir pra 0 custa 0 − (−0.5) = 0.5
    expect(G.pontosGastos({ ...anaoBase, aura: 0 }, 'Anão')).toBe(0.5);
  });

  it('nenhuma raça nasce em desvantagem de pontos: linha de base sempre custa 0', () => {
    Object.entries(G.GAME_DATA.racas).forEach(([raca, dados]) => {
      expect(G.pontosGastos({ ...dados.mods }, raca), raca).toBe(0);
    });
  });
});

/* ───────── equalização racial: bonusPontosRaca (08/09/2026) ────────── */
/* Com o modificador racial virando nível inicial gratuito, cada raça passou a
   valer um tanto diferente em pontos (Anão 4, Humano 0). O bônus fecha essa
   diferença: toda raça começa valendo o mesmo, parte em níveis, parte em
   pontos livres. */
describe('bonusPontosRaca — equalização', () => {
  const K = ['intelecto', 'aura', 'carisma', 'forca', 'fisico', 'agilidade', 'percepcao'];
  const valorDosNiveis = (raca) =>
    K.reduce((s, k) => s + G.custoAtributo(G.GAME_DATA.racas[raca].mods[k]), 0);

  it('toda raça soma o MESMO valor inicial: níveis grátis + bônus', () => {
    const totais = Object.keys(G.GAME_DATA.racas)
      .map((raca) => valorDosNiveis(raca) + G.bonusPontosRaca(raca));
    expect(new Set(totais).size, `totais divergentes: ${totais}`).toBe(1);
  });

  it('a raça mais forte não ganha bônus; o Humano ganha o vão inteiro', () => {
    expect(G.bonusPontosRaca('Anão')).toBe(0);
    expect(G.bonusPontosRaca('Meio-Orc')).toBe(0);
    expect(G.bonusPontosRaca('Humano')).toBe(valorDosNiveis('Anão'));
  });

  it('nenhum bônus é negativo', () => {
    Object.keys(G.GAME_DATA.racas).forEach((raca) => {
      expect(G.bonusPontosRaca(raca), raca).toBeGreaterThanOrEqual(0);
    });
  });

  it('raça ausente ou fora do catálogo não ganha bônus', () => {
    expect(G.bonusPontosRaca(undefined)).toBe(0);
    expect(G.bonusPontosRaca('Dragão')).toBe(0);
  });

  it('pontosAtributosTotal soma o bônus da raça à pool do estágio', () => {
    expect(G.pontosAtributosTotal(1, 'Anão')).toBe(15);
    expect(G.pontosAtributosTotal(1, 'Humano')).toBe(15 + G.bonusPontosRaca('Humano'));
    expect(G.pontosAtributosTotal(3, 'Meio-Elfo')).toBe(16 + G.bonusPontosRaca('Meio-Elfo'));
  });

  it('sem raça, é a pool do estágio pura', () => {
    expect(G.pontosAtributosTotal(1)).toBe(G.pontosDisponiveis(1));
  });

  // O saldo em pontos NÃO é igual entre raças, e não deve ser: quem recebeu
  // menos nível de graça recebe mais ponto livre pra compensar. O que se
  // iguala é o valor total do que o personagem tem na mão ao nascer —
  // níveis já postos (medidos pela tabela de custo) mais pontos por gastar.
  it('recém-criado de qualquer raça tem o mesmo valor total na mão', () => {
    const totais = Object.entries(G.GAME_DATA.racas).map(([raca, dados]) =>
      G.pontosGastos({ ...dados.mods }) + G.pontosAtributosTotal(1, raca));
    expect(new Set(totais).size, `totais divergentes: ${totais}`).toBe(1);
    expect(totais[0]).toBe(15 + G.bonusPontosRaca('Humano'));
  });
});

/* ─────────────── condições → poços e grupos de habilidade ───────────────── */
/* Regra nova (decisão de 08/09/2026): condição NÃO mexe mais em atributo.
   Cada uma bate direto num poço derivado (EF/VB/KA/AR/EH) ou num par de
   grupos de habilidade, em 4 faixas. Substitui CONDICOES_ATRIBUTO_MAP. */
describe('faixaCondicao', () => {
  it('0 é neutro', () => {
    expect(G.faixaCondicao(0)).toBe(0);
  });

  it('extremos são inclusivos: ±25 já cai na faixa forte', () => {
    expect(G.faixaCondicao(-25)).toBe(-2);
    expect(G.faixaCondicao(-50)).toBe(-2);
    expect(G.faixaCondicao(25)).toBe(2);
    expect(G.faixaCondicao(50)).toBe(2);
  });

  it('faixa branda entre 0 (exclusivo) e o extremo (exclusivo)', () => {
    expect(G.faixaCondicao(-24)).toBe(-1);
    expect(G.faixaCondicao(-1)).toBe(-1);
    expect(G.faixaCondicao(1)).toBe(1);
    expect(G.faixaCondicao(24)).toBe(1);
  });

  it('ausente ou não numérico = neutro', () => {
    expect(G.faixaCondicao(null)).toBe(0);
    expect(G.faixaCondicao(undefined)).toBe(0);
    expect(G.faixaCondicao('x')).toBe(0);
  });
});

describe('deltasPocosPorCondicoes', () => {
  const zero = { ef: 0, eh: 0, ka: 0, ar: 0, vb: 0 };

  it('sem condições → todos os poços em 0', () => {
    expect(G.deltasPocosPorCondicoes(null)).toEqual(zero);
    expect(G.deltasPocosPorCondicoes({})).toEqual(zero);
  });

  it('±3 na faixa branda, ±6 na extrema', () => {
    expect(G.deltasPocosPorCondicoes({ vitalidade: -1 }).ef).toBe(-3);
    expect(G.deltasPocosPorCondicoes({ vitalidade: -25 }).ef).toBe(-6);
    expect(G.deltasPocosPorCondicoes({ vitalidade: 10 }).ef).toBe(3);
    expect(G.deltasPocosPorCondicoes({ vitalidade: 50 }).ef).toBe(6);
  });

  it('cada condição bate no seu poço: Saúde→EF, Sono→VB, Hidratação→KA, Alimentação→AR', () => {
    expect(G.deltasPocosPorCondicoes({ vitalidade: 30, animo: -30, hidratacao: 10, nutricao: -10 }))
      .toEqual({ ef: 6, eh: 0, ka: 3, ar: -3, vb: -6 });
  });

  it('Sobriedade é bônus dos DOIS lados: negativa dá EH, positiva dá KA', () => {
    expect(G.deltasPocosPorCondicoes({ euforia: -30 })).toEqual({ ...zero, eh: 6 });
    expect(G.deltasPocosPorCondicoes({ euforia: -10 })).toEqual({ ...zero, eh: 3 });
    expect(G.deltasPocosPorCondicoes({ euforia: 10 })).toEqual({ ...zero, ka: 3 });
    expect(G.deltasPocosPorCondicoes({ euforia: 30 })).toEqual({ ...zero, ka: 6 });
  });

  it('Hidratação e Sobriedade acumulam no mesmo poço de Karma', () => {
    expect(G.deltasPocosPorCondicoes({ hidratacao: 30, euforia: 30 }).ka).toBe(12);
    expect(G.deltasPocosPorCondicoes({ hidratacao: -30, euforia: 30 }).ka).toBe(0);
  });

  it('condições de grupo não geram delta de poço', () => {
    expect(G.deltasPocosPorCondicoes({ sanidade: -50, reputacao: 50, termorregulacao: -50 }))
      .toEqual(zero);
  });
});

describe('modificadorGrupoPorCondicoes', () => {
  it('neutro sem condição, com condição 0, ou pra grupo não pareado', () => {
    expect(G.modificadorGrupoPorCondicoes('Influência', null)).toBe(1);
    expect(G.modificadorGrupoPorCondicoes('Influência', { reputacao: 0 })).toBe(1);
    expect(G.modificadorGrupoPorCondicoes('Combate', { reputacao: -30 })).toBe(1);
  });

  it('o grupo direto acompanha o sinal; o inverso espelha', () => {
    expect(G.modificadorGrupoPorCondicoes('Influência', { reputacao: -30 })).toBe(0.5);
    expect(G.modificadorGrupoPorCondicoes('Influência', { reputacao: -3 })).toBe(0.75);
    expect(G.modificadorGrupoPorCondicoes('Influência', { reputacao: 3 })).toBe(1.25);
    expect(G.modificadorGrupoPorCondicoes('Influência', { reputacao: 30 })).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Subterfúgio', { reputacao: -30 })).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Subterfúgio', { reputacao: -3 })).toBe(1.25);
    expect(G.modificadorGrupoPorCondicoes('Subterfúgio', { reputacao: 3 })).toBe(0.75);
    expect(G.modificadorGrupoPorCondicoes('Subterfúgio', { reputacao: 30 })).toBe(0.5);
  });

  it('Sanidade rege Conhecimento/Manobra; Temperatura rege Geral/Profissional', () => {
    expect(G.modificadorGrupoPorCondicoes('Conhecimento', { sanidade: -30 })).toBe(0.5);
    expect(G.modificadorGrupoPorCondicoes('Manobra', { sanidade: -30 })).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Geral', { termorregulacao: 3 })).toBe(1.25);
    expect(G.modificadorGrupoPorCondicoes('Profissional', { termorregulacao: 3 })).toBe(0.75);
  });

  it('os 6 grupos estão cobertos e cada um responde a uma condição só', () => {
    const cond = { sanidade: 30, reputacao: -30, termorregulacao: 30, vitalidade: -50 };
    expect(G.modificadorGrupoPorCondicoes('Conhecimento', cond)).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Manobra', cond)).toBe(0.5);
    expect(G.modificadorGrupoPorCondicoes('Influência', cond)).toBe(0.5);
    expect(G.modificadorGrupoPorCondicoes('Subterfúgio', cond)).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Geral', cond)).toBe(1.5);
    expect(G.modificadorGrupoPorCondicoes('Profissional', cond)).toBe(0.5);
    expect(G.GRUPOS_HABILIDADES_ORDEM.every((g) => G.CONDICOES_GRUPO_POR_GRUPO[g])).toBe(true);
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

  it('condição NÃO mexe mais em atributo — só no poço derivado', () => {
    const f = G.calcularFicha(pj, null, { nutricao: -3, vitalidade: 2 });
    expect(f.atributos.forca).toBe(2);   // Alimentação negativa não toca a Força
    expect(f.atributos.fisico).toBe(1);  // Saúde positiva não toca o Físico
    expect(f.atributos).toEqual(f.atributosBase);
  });

  it('Saúde soma no EF; Sono soma na Velocidade', () => {
    expect(G.calcularFicha(pj, null, { vitalidade: 2 }).derivadas.energiaFisica).toBe(21);
    expect(G.calcularFicha(pj, null, { vitalidade: -30 }).derivadas.energiaFisica).toBe(12);
    expect(G.calcularFicha(pj, null, { animo: -3 }).derivadas.velocidade).toBe(16);
    expect(G.calcularFicha(pj, null, { animo: 30 }).derivadas.velocidade).toBe(25);
  });

  it('Sobriedade negativa soma no EH; positiva, no Karma', () => {
    expect(G.calcularFicha(pj, null, { euforia: -30 }).derivadas.energiaHeroica).toBe(20);
    expect(G.calcularFicha(pj, null, { euforia: -30 }).derivadas.karma).toBe(0); // aura 0
  });

  it('poço nunca fica negativo (piso 0)', () => {
    const fraco = { ...pj, fisico_base: -2, agilidade_base: -2, percepcao_base: -2 };
    const d = G.calcularFicha(fraco, null, { animo: -50 }).derivadas;
    expect(d.velocidade).toBeGreaterThanOrEqual(0);
    expect(d.energiaFisica).toBeGreaterThanOrEqual(0);
  });

  it('Aura < 1 mantém o Karma zerado — condição não ressuscita o poço', () => {
    expect(G.calcularFicha(pj, null, { hidratacao: 50, euforia: 50 }).derivadas.karma).toBe(0);
  });

  it('com Aura ≥ 1, Hidratação e Sobriedade somam no Karma', () => {
    const mago = { ...pj, aura_base: 2 };
    expect(G.calcularFicha(mago, null).derivadas.karma).toBe(12);
    expect(G.calcularFicha(mago, null, { hidratacao: 30 }).derivadas.karma).toBe(18);
    expect(G.calcularFicha(mago, null, { hidratacao: -30 }).derivadas.karma).toBe(6);
    expect(G.calcularFicha(mago, null, { hidratacao: -30, euforia: 30 }).derivadas.karma).toBe(12);
  });

  it('Alimentação soma na Absorção (AR), com piso 0', () => {
    expect(G.calcularFicha(pj, {}, { nutricao: 30 }).derivadas.absorcao).toBe(6);
    expect(G.calcularFicha(pj, {}, { nutricao: -30 }).derivadas.absorcao).toBe(0);
    expect(G.calcularFicha(pj, {}, { nutricao: 30 }).derivadas.armadura).toBe(6);
  });

  it('Temperatura não mexe mais na Agilidade nem na Defesa', () => {
    expect(G.calcularFicha(pj, {}, { termorregulacao: -50 }).derivadas.defesa)
      .toBe(G.calcularFicha(pj, {}).derivadas.defesa);
  });

  it('sem condições, o 3º argumento omitido é idêntico ao comportamento antigo', () => {
    expect(G.calcularFicha(pj, null)).toEqual(G.calcularFicha(pj, null, null));
  });
});

/* ───────────── todosOsPontosGastos (badge de evolução) ───────────── */
describe('todosOsPontosGastos — quando o badge "Pronto pra evoluir!" some', () => {
  // Bug (auditoria 01/09/2026): nivel_visto era gravado em QUALQUER edição do
  // jogador. Abrir o wizard e salvar sem distribuir nada já apagava o
  // lembrete, e os pontos ficavam esquecidos. Decisão do usuário: "só deve
  // sumir quando os pontos forem gastos".
  const cheio = { atributos: 0, habilidades: 0, magias: 0, tecnicas: 0, gruposArmas: 0, usaMagia: true };

  it('tudo distribuído → pode marcar como visto', () => {
    expect(G.todosOsPontosGastos(cheio)).toBe(true);
  });

  it('sobra em QUALQUER pool segura o badge', () => {
    for (const pool of ['atributos', 'habilidades', 'magias', 'tecnicas', 'gruposArmas']) {
      expect(G.todosOsPontosGastos({ ...cheio, [pool]: 1 }), `sobra em ${pool}`).toBe(false);
    }
  });

  it('pool de magia é ignorada em profissão que não usa magia', () => {
    // Guerreiro tem magRestantes calculado mesmo sem usar magia; contá-lo
    // deixaria o badge presto pra sempre.
    expect(G.todosOsPontosGastos({ ...cheio, magias: 5, usaMagia: false })).toBe(true);
    expect(G.todosOsPontosGastos({ ...cheio, magias: 5, usaMagia: true })).toBe(false);
  });

  it('saldo negativo (gastou além) conta como gasto', () => {
    expect(G.todosOsPontosGastos({ ...cheio, atributos: -2 })).toBe(true);
  });

  it('valor ausente ou não numérico conta como zero', () => {
    expect(G.todosOsPontosGastos({ usaMagia: false })).toBe(true);
    expect(G.todosOsPontosGastos({ ...cheio, tecnicas: null })).toBe(true);
  });
});
