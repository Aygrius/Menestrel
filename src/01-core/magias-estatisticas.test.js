/* ============================================================
   magias-estatisticas.test.js — o catálogo está equilibrado?
   ============================================================
   Pedido do usuário (12/09/2026): "Na página de conferência, informa uma
   estatística de magias. Quantas magias para cada profissão, magias de
   suporte, de ataque, etc."

   Trava as três regras que a estatística NÃO inventa, mas herda:
     • classe    = magias.classe (Feitiço, Milagre, Encanto, Transmutação),
       no lugar da permissão desde 22/10/2026;
     • raridade  = o tipo (Básica, Perdida, Ancestral);
     • função    = o registro do motor; fora dele, a classe do motivo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './game-data.jsx';
import './magias-efeito.jsx';

let est, funcao;
beforeAll(() => {
  est = window.estatisticasMagias;
  funcao = window.funcaoDaMagia;
  expect(est).toBeTypeOf('function');
});

describe('funcaoDaMagia — a função sai do registro', () => {
  it.each([
    ['bola_de_fogo', 'ataque'],
    ['cancao_do_tormento', 'ataque'],   // dano + penalidade: ataque ganha
    ['curas_fisicas', 'cura'],
    ['veu_de_maira', 'cura'],           // cura + bônus: cura ganha
    ['piroprotecao', 'protecao'],
    ['medo', 'controle'],
    ['ato_falho', 'controle'],
    ['bencao', 'suporte'],
    ['sombra', 'suporte'],              // dificuldade de habilidade é suporte
    ['balsamo_de_lena', 'cura'],        // condição de ficha restaurada em aliado é cura
    ['seiva_de_maira', 'cura'],
    ['egide_celestial', 'protecao'],
    ['bencao_selvagem', 'suporte'],     // cura_pool com sinal -1 é CUSTO, não cura
  ])('%s → %s', (key, esperado) => {
    expect(funcao({ key })).toBe(esperado);
  });

  it('fora do motor, a classe do motivo', () => {
    expect(funcao({ key: 'runas' })).toBe('ritual');
    expect(funcao({ key: 'leitura' })).toBe('narrativa');
    expect(funcao({ key: 'refletir' })).toBe('sistema');
    expect(funcao({ key: 'criacao' })).toBe('invocado');
    // Alucinação era o exemplo de 'decisao' até entrar no motor (12/09/2026):
    // com o registro, a função vem dele — dificuldade no inimigo é controle.
    expect(funcao({ key: 'alucinacao' })).toBe('controle');
  });

  it('sem registro e sem motivo é narrativa', () => {
    expect(funcao({ key: 'magia_que_nao_existe' })).toBe('narrativa');
  });
});

describe('estatisticasMagias', () => {
  /* Por CLASSE desde 22/10/2026: a permissão saiu das magias (qualquer
     profissão aprende pelo item), e o eixo que ela alimentava — por profissão
     e especialização — virou a classe (Feitiço, Milagre, Encanto,
     Transmutação). */
  const CAT = [
    { key: 'bola_de_fogo', nome: 'Bola de Fogo', classe: 'Feitiço', tipo: 'Básica', evocacao: 'Instantânea', duracao: 'Instantânea' },
    { key: 'dardos_de_gelo', nome: 'Dardos de Gelo', classe: 'Feitiço', tipo: 'Básica', evocacao: '1 rodada', duracao: 'Instantânea' },
    { key: 'bencao', nome: 'Bênção', classe: 'Milagre', tipo: 'Básica', evocacao: 'Instantânea', duracao: '10 rodadas' },
    { key: 'voo', nome: 'Vôo', classe: 'Feitiço', tipo: 'Perdida', evocacao: 'Instantânea', duracao: 'Variável' },
    { key: 'runas', nome: 'Runas', classe: 'Encanto', tipo: 'Ancestral', evocacao: 'Ritual', duracao: 'Permanente' },
    { key: 'mestre_da_forja', nome: 'Mestre da Forja', classe: null, tipo: null, evocacao: 'Ritual', duracao: 'Instantânea' },
  ];

  it('conta por classe, com o tipo de cada uma', () => {
    const e = est(CAT);
    expect(e.porClasse['Feitiço']).toMatchObject({ total: 3, basicas: 2, perdidas: 1, ancestrais: 0 });
    expect(e.porClasse.Milagre).toMatchObject({ total: 1, basicas: 1 });
    expect(e.porClasse.Encanto).toMatchObject({ total: 1, ancestrais: 1 });
  });

  it('as quatro classes aparecem, mesmo zeradas', () => {
    expect(est(CAT).porClasse['Transmutação'].total).toBe(0);
  });

  it('função cruzada com classe aponta o buraco', () => {
    const e = est(CAT);
    expect(e.porClasse['Feitiço'].funcoes.ataque).toBe(2);
    expect(e.porClasse['Feitiço'].funcoes.cura).toBe(0);
    expect(e.porClasse.Milagre.funcoes.suporte).toBe(1);
  });

  it('raridade, evocação e duração', () => {
    const e = est(CAT);
    expect(e.porRaridade).toMatchObject({ 'Básica': 3, Perdida: 1, Ancestral: 1, '—': 1 });
    expect(e.porEvocacao).toEqual({ instantanea: 3, canalizada: 1, ritual: 2 });
    expect(e.porDuracao.rodadas).toBe(1);
    expect(e.porDuracao.permanente).toBe(1);
  });

  it('acusa magia sem classe; nada mais fala de permissão', () => {
    const e = est(CAT);
    expect(e.semClasse).toEqual(['Mestre da Forja']);
    expect(e.porProfissao).toBeUndefined();
    expect(e.semPermissao).toBeUndefined();
  });

  it('catálogo vazio não lança', () => {
    expect(est([]).total).toBe(0);
    expect(est(null).total).toBe(0);
  });
});

describe('por elemento — dano e proteção', () => {
  /* "Quero também magias de proteção e dano por elemento, fogo, terra, água,
     ar, celestial e infernal." (usuário, 12/09/2026) */
  const CAT = [
    { key: 'piromanipulacao', nome: 'Piromanipulação', permissao: 'Colégio Elemental', tipo: 'Básica',
      nivel_1: 'Causa 4 de dano elemental de fogo.' },
    { key: 'energia_primordial', nome: 'Energia Primordial', permissao: 'Colégio Elemental', tipo: 'Ancestral',
      nivel_1: 'Causa 36 de dano elemental infernal.' },
    { key: 'putrefacao', nome: 'Putrefação', permissao: 'Colégio Necromântico', tipo: 'Básica',
      nivel_1: 'Cause 12 de dano base.' },
    { key: 'piroprotecao', nome: 'Piroproteção', permissao: 'Colégio Elemental', tipo: 'Básica',
      nivel_1: 'Reduz 16 de dano elemental de fogo.' },
    { key: 'armadura_elemental', nome: 'Armadura Elemental', permissao: 'Colégio Elemental', tipo: 'Básica',
      nivel_1: 'Reduz 8 de dano elemental.' },
  ];

  it('conta dano pelo elemento do texto e proteção pelo do registro', () => {
    const e = est(CAT).porElemento;
    expect(e.fogo).toEqual({ dano: 1, protecao: 1 });
    expect(e.infernal).toEqual({ dano: 1, protecao: 0 });
    expect(e.sem_elemento.dano).toBe(1);
    expect(e.qualquer.protecao).toBe(1);
  });

  it('os seis elementos aparecem mesmo zerados, na ordem do usuário — o zero é o dado', () => {
    expect(Object.keys(est([]).porElemento))
      .toEqual(['fogo', 'terra', 'agua', 'ar', 'celestial', 'infernal', 'sem_elemento', 'qualquer']);
  });
});
