/* ============================================================
   criatura-formulas.test.js — as fórmulas derivadas de criatura
   ============================================================
   Fixture (EF/EH/absorção/velocidade): os 8 dragões REAIS do banco
   (leitura de 09/09/2026). Eles são a melhor prova disponível porque EF e
   EH batem pela fórmula em todos os 8, e absorção e velocidade NÃO batem
   em nenhum — a classe Dragão fixa esses dois valores. Isso trava as duas
   coisas de uma vez: que a fórmula está certa, e que campo derivado
   PRECISA ser sobrescrevível (spec §6).

   Fixture (dano100/danoLMP): criaturas reais avulsas (não só dragões — ver
   describe('dano100...') e describe('danoLMP...') abaixo), lidas do banco
   em 10/09/2026. dano100 é a única fórmula onde os dragões NÃO servem de
   prova — eles fogem dela por +4, ver o comentário dentro do describe.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';

let F;
beforeAll(() => { F = window.CriaturaFormulas; expect(F).toBeDefined(); });

// nome, estagio, peso, fisico, aura, agilidade, percepcao, forca,
// energia_fisica e energia_heroica REAIS do banco.
const DRAGOES = [
  { nome: 'Dradenar',        estagio: 15, peso:   6000, fisico: 4, aura: 3, agilidade: 6, percepcao: 5, forca: 4, ef: 159, eh: 345, absorcao: 30, velocidade: 45 },
  { nome: 'Hydra',           estagio: 21, peso:   7000, fisico: 5, aura: 3, agilidade: 3, percepcao: 2, forca: 7, ef: 173, eh: 483, absorcao: 30, velocidade: 44 },
  { nome: 'Draquae',         estagio: 18, peso:   7200, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 175, eh: 414, absorcao: 30, velocidade: 48 },
  { nome: 'Wyvern',          estagio: 22, peso:   8500, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 190, eh: 506, absorcao: 30, velocidade: 52 },
  { nome: 'Drake',           estagio: 19, peso:   9000, fisico: 4, aura: 4, agilidade: 6, percepcao: 6, forca: 5, ef: 194, eh: 456, absorcao: 30, velocidade: 49 },
  { nome: 'Dragão',          estagio: 25, peso:  42000, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 415, eh: 575, absorcao: 30, velocidade: 55 },
  { nome: 'Dragão Imperial', estagio: 30, peso:  64000, fisico: 5, aura: 5, agilidade: 6, percepcao: 5, forca: 8, ef: 511, eh: 750, absorcao: 30, velocidade: 60 },
  { nome: 'Leviatã',         estagio: 50, peso: 100000, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 638, eh: 1150, absorcao: 30, velocidade: 80 },
];

describe('energiaFisica', () => {
  it('bate com os 8 dragões do banco', () => {
    for (const d of DRAGOES) {
      expect(F.energiaFisica({ peso: d.peso, fisico: d.fisico }), d.nome).toBe(d.ef);
    }
  });

  it('arredonda pra cima', () => {
    // 2·√100 = 20 exato; 2·√101 = 20.09… → 21
    expect(F.energiaFisica({ peso: 100, fisico: 0 })).toBe(20);
    expect(F.energiaFisica({ peso: 101, fisico: 0 })).toBe(21);
  });

  it('peso zero ou ausente não quebra', () => {
    expect(F.energiaFisica({ peso: 0, fisico: 3 })).toBe(3);
    expect(F.energiaFisica({})).toBe(0);
  });
});

describe('energiaHeroica', () => {
  // Os dragões usam base 20, que NÃO está em EH_BASE_POR_COLETIVO
  // (10/13/17/21). Descoberto ao conferir os 8: eh/estagio − aura = 20 em
  // todos. O formulário original só oferecia os quatro coletivos nomeados.
  it('bate com os 8 dragões usando base 20', () => {
    for (const d of DRAGOES) {
      expect(F.energiaHeroica({ base: 20, aura: d.aura, estagio: d.estagio }), d.nome).toBe(d.eh);
    }
  });

  it('aceita o coletivo nomeado em vez da base crua', () => {
    // Solitário = 21 → (21 + 2) × 3 = 69
    expect(F.energiaHeroica({ coletivo: 'Solitário', aura: 2, estagio: 3 })).toBe(69);
  });

  it('coletivo desconhecido vira base 0', () => {
    expect(F.energiaHeroica({ coletivo: 'Inexistente', aura: 2, estagio: 3 })).toBe(6);
  });
});

describe('absorcao e defesa', () => {
  it('absorção é físico × 5, e 0 quando físico não é positivo', () => {
    expect(F.absorcao({ fisico: 4 })).toBe(20);
    expect(F.absorcao({ fisico: 0 })).toBe(0);
    expect(F.absorcao({ fisico: -2 })).toBe(0);
  });

  it('defesa soma 8 só quando há absorção', () => {
    expect(F.defesa({ fisico: 4, agilidade: 6 })).toBe(14);
    expect(F.defesa({ fisico: 0, agilidade: 6 })).toBe(6);
  });

  // A PROVA de que derivado precisa ser sobrescrevível: a classe Dragão fixa
  // absorção em 30, e a fórmula devolve 20 ou 25. Se o campo fosse travado,
  // editar um dragão corromperia o valor dele.
  it('NÃO bate com os dragões — a classe fixa absorção em 30', () => {
    for (const d of DRAGOES) {
      expect(F.absorcao({ fisico: d.fisico }), d.nome).not.toBe(d.absorcao);
    }
  });
});

describe('velocidade', () => {
  it('é (agilidade + estágio) × percepção', () => {
    expect(F.velocidade({ agilidade: 6, estagio: 15, percepcao: 5 })).toBe(105);
  });

  // Mesma prova de sobrescrita, no outro campo.
  it('NÃO bate com os dragões — a classe fixa velocidade', () => {
    const d = DRAGOES[0];   // Dradenar: (6+15)×5 = 105, banco diz 45
    expect(F.velocidade({ agilidade: d.agilidade, estagio: d.estagio, percepcao: d.percepcao }))
      .not.toBe(d.velocidade);
  });
});

// ⚠️ As fórmulas ORIGINAIS de dano100/danoLMP (dano da arma + √peso; dano da
// arma + Agilidade) foram migradas do formulário de PERSONAGEM
// (NovaCriaturaModal) e nunca reproduziram nenhuma criatura do banco —
// criatura não tem "uma arma com dano fixo", tem uma FAIXA DE PESO e um
// OFFSET por tipo de ataque (ataques-criatura.jsx). Os valores abaixo são
// reais, lidos do banco em 10/09/2026.
describe('dano100 — estágio + força + faixa de peso', () => {
  // nome, ataque, estágio, força, peso, dano_100 real do banco.
  const CRIATURAS = [
    { nome: 'Jaguatirica',        estagio: 3, forca: 0, peso: 50,  d100: 11 },
    { nome: 'Zumbi',              estagio: 2, forca: 0, peso: 70,  d100: 14 },
    { nome: 'Feratus',            estagio: 6, forca: 0, peso: 90,  d100: 18 },
    { nome: 'Avestruz de Guerra', estagio: 5, forca: 4, peso: 120, d100: 25 },
    { nome: 'Puma',               estagio: 5, forca: 0, peso: 150, d100: 21 },
  ];

  it('bate com as 5 criaturas de ataque Garras do banco', () => {
    for (const c of CRIATURAS) {
      expect(F.dano100({ estagio: c.estagio, forca: c.forca, peso: c.peso }), c.nome).toBe(c.d100);
    }
  });

  // Conhecido e aceito: os 8 dragões somam +4 além desta fórmula (ex.:
  // Dradenar = 15+4+faixa(6000)=40 → 59, banco diz 63). O usuário revisa
  // esse cálculo depois — NÃO ajustar a fórmula geral pra acomodar os
  // dragões, e os dragões batem em L/M/P (ver describe abaixo).
});

describe('danoLMP — estágio + agilidade + offset do ataque', () => {
  // nome, ataque, estágio, agilidade, l/m/p reais do banco.
  const CRIATURAS = [
    { nome: 'Pato',       ataque: 'Bico',             estagio: 1,  agilidade: 0, l: 3,  m: 0,  p: -3 },
    { nome: 'Águia Real', ataque: 'Bico',             estagio: 18, agilidade: 3, l: 23, m: 20, p: 17 },
    { nome: 'Dradenar',   ataque: 'Hálito Encantado', estagio: 15, agilidade: 6, l: 22, m: 22, p: 22 },
    { nome: 'Hydra',      ataque: 'Hálito Encantado', estagio: 21, agilidade: 3, l: 25, m: 25, p: 25 },
  ];

  it('bate com as 4 criaturas conferidas (2 dragões incluídos)', () => {
    for (const c of CRIATURAS) {
      expect(F.danoLMP({ ataque: c.ataque, estagio: c.estagio, agilidade: c.agilidade }), c.nome)
        .toEqual({ l: c.l, m: c.m, p: c.p });
    }
  });

  it('ataque sem offset na tabela (ex.: Toque) devolve L/M/P vazio — não inventa número', () => {
    expect(F.danoLMP({ ataque: 'Toque', estagio: 10, agilidade: 5 }))
      .toEqual({ l: '', m: '', p: '' });
    expect(F.danoLMP({ ataque: 'Arma Inexistente', estagio: 10, agilidade: 5 }))
      .toEqual({ l: '', m: '', p: '' });
  });
});

describe('tiersDeDano', () => {
  it('os tiers são ceil de 25/50/75%', () => {
    expect(F.tiersDeDano(63)).toEqual({ d25: 16, d50: 32, d75: 48 });
    expect(F.tiersDeDano(0)).toEqual({ d25: 0, d50: 0, d75: 0 });
  });
});
