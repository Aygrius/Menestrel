/* ============================================================
   magias-estatisticas.test.js — o catálogo está equilibrado?
   ============================================================
   Pedido do usuário (12/09/2026): "Na página de conferência, informa uma
   estatística de magias. Quantas magias para cada profissão, magias de
   suporte, de ataque, etc."

   Trava as três regras que a estatística NÃO inventa, mas herda:
     • profissão = permissão cita a profissão (básica) ou uma especialização
       dela (avançada) — podeAcessarMagia / magiaEhAvancada;
     • raridade  = Básica compra, Perdida e Ancestral travam — magiaEhTravada;
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
  const CAT = [
    { key: 'bola_de_fogo', nome: 'Bola de Fogo', permissao: 'Mago', tipo: 'Básica', evocacao: 'Instantânea', duracao: 'Instantânea' },
    { key: 'dardos_de_gelo', nome: 'Dardos de Gelo', permissao: 'Colégio Elemental', tipo: 'Básica', evocacao: '1 rodada', duracao: 'Instantânea' },
    // Cita a profissão E uma especialização dela: conta UMA vez, como básica.
    { key: 'bencao', nome: 'Bênção', permissao: 'Sacerdote, Ordem de Lena', tipo: 'Básica', evocacao: 'Instantânea', duracao: '10 rodadas' },
    { key: 'voo', nome: 'Vôo', permissao: 'Mago', tipo: 'Perdida', evocacao: 'Instantânea', duracao: 'Variável' },
    { key: 'runas', nome: 'Runas', permissao: 'Colégio Elemental, Ordem de Lena', tipo: 'Básica', evocacao: 'Ritual', duracao: 'Permanente' },
    { key: 'mestre_da_forja', nome: 'Mestre da Forja', permissao: null, tipo: null, evocacao: 'Ritual', duracao: 'Instantânea' },
    { key: 'x', nome: 'Estranha', permissao: 'Ordem de Ninguém', tipo: 'Básica', evocacao: 'Instantânea', duracao: 'Instantânea' },
  ];

  it('conta por profissão: básica pela profissão, avançada pela especialização', () => {
    const e = est(CAT);
    expect(e.porProfissao.Mago).toMatchObject({ total: 4, basicas: 2, avancadas: 2, travadas: 1, compraveis: 3 });
    expect(e.porProfissao.Sacerdote).toMatchObject({ total: 2, basicas: 1, avancadas: 1 });
  });

  it('magia citando profissão e especialização dela conta uma vez só', () => {
    expect(est([CAT[2]]).porProfissao.Sacerdote.total).toBe(1);
  });

  it('função cruzada com profissão aponta o buraco', () => {
    const e = est(CAT);
    expect(e.porProfissao.Mago.funcoes.ataque).toBe(2);
    expect(e.porProfissao.Mago.funcoes.cura).toBe(0);
    expect(e.porProfissao.Sacerdote.funcoes.suporte).toBe(1);
  });

  it('especialização conta à parte', () => {
    expect(est(CAT).porEspecializacao['Colégio Elemental']).toEqual({ profissao: 'Mago', total: 2 });
  });

  it('raridade, evocação e duração', () => {
    const e = est(CAT);
    expect(e.porRaridade).toMatchObject({ 'Básica': 5, Perdida: 1, '—': 1 });
    expect(e.porEvocacao).toEqual({ instantanea: 4, canalizada: 1, ritual: 2 });
    expect(e.porDuracao.rodadas).toBe(1);
    expect(e.porDuracao.permanente).toBe(1);
  });

  it('acusa quem ninguém consegue comprar', () => {
    const e = est(CAT);
    expect(e.semPermissao).toEqual(['Mestre da Forja']);
    expect(e.permissaoDesconhecida).toEqual({ 'Ordem de Ninguém': ['Estranha'] });
  });

  it('Guerreiro e Ladino aparecem zerados, não somem', () => {
    expect(est(CAT).porProfissao.Guerreiro.total).toBe(0);
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
