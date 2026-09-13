/* ============================================================
   magias-corrigidas.test.js — as quatro que o usuário reescreveu
   ============================================================
   "Eu já arrumei alucinação, ataque impetuoso, força da montanha e vigília.
   Atualize a conferência." (usuário, 12/09/2026)

   Cada uma entrou no MAGIA_EFEITO_MAP com o texto literal do banco, e duas
   pediram peça nova no motor:
     mod_ef_temp   Força da Montanha — o espelho de mod_eh_temp na EF;
     mod_dano      Ataque Impetuoso — bônus plano gasto no próximo golpe.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, W;
beforeAll(() => {
  M = window.MotorBatalha;
  W = window;
  expect(M.aplicarEfeitoMagia).toBeTypeOf('function');
  expect(M.consumirModDano).toBeTypeOf('function');
});

const part = (over = {}) => ({
  inst_id: 'p1', nome: 'P', tipo: 'pj', raca: 'Humano',
  eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, res: 0,
  rf: 2, rm: 2, vb: 10, status: 'ativo', status_temp: [], ...over,
});
const efeito = (p, tipo) => (p.status_temp || []).find((s) => s.efeito && s.efeito.tipo === tipo);

const ALUCINACAO = { key: 'alucinacao', nome: 'Alucinação', duracao: 'Instantânea',
  nivel_1: 'Aumenta 1 nível de dificuldade da habilidade Sentidos.',
  nivel_5: 'Aumenta 3 níveis de dificuldade da habilidade Sentidos.' };
const FORCA = { key: 'forca_da_montanha', nome: 'Força da Montanha', duracao: '20 rodadas',
  nivel_1: 'Aumenta 2 de energia física, e reduz 4 de velocidade.',
  nivel_9: 'Aumenta 10 de energia física, e reduz 12 de velocidade.' };
const VIGILIA = { key: 'vigilia', nome: 'Vigília', duracao: '8 horas',
  nivel_1: 'Reduz 9 colunas da habilidade Sentidos.',
  nivel_9: 'Reduz 1 coluna da habilidade Sentidos. Além disso, é possível caminhar em uma direção previamente determinada enquanto dorme (pontos cardeais).' };
const IMPETUOSO = { key: 'ataque_impetuoso', nome: 'Ataque Impetuoso', duracao: 'Instantânea',
  nivel_1: 'Causa 4 de dano extra no próximo ataque.',
  nivel_9: 'Causa 12 de dano extra no próximo ataque.' };

describe('a conferência', () => {
  it('as quatro saíram do "fora do motor" e estão ok', () => {
    const r = W.auditarMagias([ALUCINACAO, FORCA, VIGILIA, IMPETUOSO]);
    expect(r.ok.map((x) => x.key).sort()).toEqual(['alucinacao', 'ataque_impetuoso', 'forca_da_montanha', 'vigilia']);
    ['alucinacao', 'ataque_impetuoso', 'forca_da_montanha', 'vigilia']
      .forEach((k) => expect(W.motivoForaDoRegistro(k)).toBeNull());
  });

  it('funções: controle, suporte e suporte — Ataque Impetuoso não é ataque', () => {
    expect(W.funcaoDaMagia(ALUCINACAO)).toBe('controle');
    expect(W.funcaoDaMagia(FORCA)).toBe('suporte');
    expect(W.funcaoDaMagia(IMPETUOSO)).toBe('suporte');
  });
});

describe('Alucinação — dificuldade a mais para o alvo', () => {
  it('+3 degraus em Sentidos, gastos no próximo teste', () => {
    const p = M.aplicarEfeitoMagia(part(), ALUCINACAO, 5);
    expect(M.somaDificuldadeDoStatus(p, { nome: 'Sentidos', grupo: 'Geral' })).toBe(3);
    expect(efeito(p, 'mod_dificuldade').consome_em).toBe('teste_habilidade');
  });
});

describe('Força da Montanha — EF emprestada e velocidade', () => {
  it('sobe teto e valor da EF, e reduz a velocidade', () => {
    const p = M.aplicarEfeitoMagia(part({ ef: 15 }), FORCA, 9);
    expect(p.ef_max).toBe(30);
    expect(p.ef).toBe(25);
    expect(M.vbEfetivo(p)).toBe(-2);
  });

  it('relançar não empilha o empréstimo', () => {
    const uma = M.aplicarEfeitoMagia(part(), FORCA, 1);
    const duas = M.aplicarEfeitoMagia(uma, FORCA, 1);
    expect(duas.ef_max).toBe(22);
  });

  it('ao expirar, devolve o teto e apara a EF', () => {
    const p = M.aplicarEfeitoMagia(part(), FORCA, 9);   // ef 30/30
    const removido = efeito(p, 'mod_ef_temp');
    const volta = M.expirarEhTemp({ ...p, status_temp: [] }, [removido]);
    expect(volta.ef_max).toBe(20);
    expect(volta.ef).toBe(20);
  });
});

describe('Vigília — penalidade em Sentidos', () => {
  it('grava mod_habilidade com o nome, e a soma casa pela habilidade', () => {
    const p = M.aplicarEfeitoMagia(part(), VIGILIA, 1);
    expect(efeito(p, 'mod_habilidade')).toMatchObject({ efeito: { tipo: 'mod_habilidade', valor: -9, habilidade: 'Sentidos' } });
    expect(M.somaModHabilidade(p, 'Sentidos')).toBe(-9);
    expect(M.somaModHabilidade(p, 'Rastrear')).toBe(0);
  });
});

describe('Ataque Impetuoso — bônus no próximo golpe', () => {
  it('soma no dano do golpe, antes dos percentuais', () => {
    const p = M.aplicarEfeitoMagia(part(), IMPETUOSO, 9);   // +12
    const alvo = part({ inst_id: 'a1' });
    expect(M.danoFinal(10, p, alvo)).toBe(22);
    expect(M.danoFinal(10, part(), alvo)).toBe(10);
  });

  it('golpe que errou (base 0) não recebe o bônus', () => {
    const p = M.aplicarEfeitoMagia(part(), IMPETUOSO, 1);
    expect(M.danoFinal(0, p, part({ inst_id: 'a1' }))).toBe(0);
  });

  it('é gasto depois do golpe, e só ele', () => {
    const p = M.aplicarEfeitoMagia(part(), IMPETUOSO, 1);
    const comOutro = { ...p, status_temp: [...p.status_temp, { id: 'x', efeito: { tipo: 'mod_vb', valor: 2 } }] };
    const depois = M.consumirModDano(comOutro);
    expect(efeito(depois, 'mod_dano')).toBeUndefined();
    expect(efeito(depois, 'mod_vb')).toBeTruthy();
    expect(M.consumirModDano(depois)).toBe(depois);
  });
});
