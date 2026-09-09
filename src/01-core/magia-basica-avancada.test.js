/* ============================================================
   magia-basica-avancada.test.js — quem alcança x quão rara
   ============================================================
   Bug relatado em 03/09/2026: "Elarion é do Colégio Necromântico, tem pontos
   disponíveis e não consegue comprar magias avançadas."

   A especialização não tinha nada a ver. O criador de personagem filtrava a
   aba "Avançadas" por `tipo !== 'Básica'` — o MESMO critério que travava a
   compra (Perdida/Ancestral dependem de um item especial, ainda a ser
   criado). A aba era, por construção, a lista do que ninguém podia comprar.
   As magias que a especialização de fato liberava eram `tipo = 'Básica'` e
   estavam na OUTRA aba; a ficha, enquanto isso, já as chamava de
   "Avançadas". Cada tela tinha a sua definição, e foi a divergência entre
   elas que fez a compra parecer quebrada.

   Regra do usuário: **Avançada = Especialização**. Daí os dois eixos, que
   estes testes existem para manter separados:

     ALCANCE   magiaEhAvancada — a `permissao` cita uma especialização
               (Colégio…, Ordem…, Trilha…, Confraria…) e não só a profissão;
     RARIDADE  magiaEhTravada  — `tipo` é Perdida ou Ancestral.

   São independentes: existe magia de especialização comprável (Necroanimação)
   e magia de profissão travada (Vôo, do Mago). Todo cruzamento das duas está
   coberto abaixo — é exatamente o cruzamento que o código antigo colapsava
   num eixo só.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/game-data.jsx';

let ehAvancada, ehTravada, podeAcessar;
beforeAll(() => {
  ehAvancada  = window.magiaEhAvancada;
  ehTravada   = window.magiaEhTravada;
  podeAcessar = window.podeAcessarMagia;
  expect(ehAvancada, 'magiaEhAvancada precisa estar exposta').toBeDefined();
  expect(ehTravada,  'magiaEhTravada precisa estar exposta').toBeDefined();
});

// Dados copiados da tabela `magias` de produção.
const NECROANIMACAO = { key: 'necroanimacao', nome: 'Necroanimação',
  permissao: 'Colégio Necromântico', tipo: 'Básica' };
const TELECINESE    = { key: 'telecinese', nome: 'Telecinese',
  permissao: 'Mago', tipo: 'Básica' };
const VOO           = { key: 'voo', nome: 'Vôo',
  permissao: 'Mago', tipo: 'Perdida' };
const CARCERE       = { key: 'carcere_de_almas', nome: 'Cárcere de Almas',
  permissao: 'Colégio Necromântico', tipo: 'Ancestral' };
// Permissão mista: a profissão E uma especialização citadas na mesma linha.
const ESCONJURACAO  = { key: 'esconjuracao', nome: 'Esconjuração',
  permissao: 'Sacerdote, Colégio Necromântico', tipo: 'Básica' };

describe('magiaEhAvancada — é sobre QUEM alcança', () => {
  it('permissao citando só a profissão é básica', () => {
    expect(ehAvancada(TELECINESE)).toBe(false);
  });

  it('permissao citando uma especialização é avançada', () => {
    expect(ehAvancada(NECROANIMACAO)).toBe(true);
  });

  it('reconhece especialização de qualquer profissão, não só Colégios', () => {
    expect(ehAvancada({ permissao: 'Ordem de Crezir', tipo: 'Básica' })).toBe(true);
    expect(ehAvancada({ permissao: 'Trilha de Guardiões', tipo: 'Básica' })).toBe(true);
    expect(ehAvancada({ permissao: 'Confraria de Arautos', tipo: 'Básica' })).toBe(true);
  });

  it('basta UMA especialização na lista para ser avançada', () => {
    expect(ehAvancada(ESCONJURACAO)).toBe(true);
  });

  it('sem permissao não é avançada (e nem acessível)', () => {
    expect(ehAvancada({ nome: 'Mestre da Forja', permissao: null, tipo: null })).toBe(false);
    expect(podeAcessar({ permissao: null }, 'Mago', 'Colégio Necromântico')).toBe(false);
  });

  it('não confunde nome de profissão com nome de especialização', () => {
    expect(ehAvancada({ permissao: 'Bardo', tipo: 'Básica' })).toBe(false);
    expect(ehAvancada({ permissao: 'Rastreador', tipo: 'Básica' })).toBe(false);
  });
});

describe('magiaEhTravada — é sobre RARIDADE, eixo separado', () => {
  it('Básica não é travada', () => {
    expect(ehTravada(TELECINESE)).toBe(false);
    expect(ehTravada(NECROANIMACAO)).toBe(false);
  });

  it('Perdida e Ancestral são travadas', () => {
    expect(ehTravada(VOO)).toBe(true);
    expect(ehTravada(CARCERE)).toBe(true);
  });
});

/* O cruzamento é o coração do bug: colapsar os dois eixos num só é o que
   esvaziava a aba Avançadas de tudo que era comprável. */
describe('os dois eixos são independentes', () => {
  const casos = [
    ['Necroanimação  — especialização E comprável', NECROANIMACAO, true,  false],
    ['Cárcere de Almas — especialização E travada', CARCERE,       true,  true ],
    ['Telecinese     — profissão E comprável',      TELECINESE,    false, false],
    ['Vôo            — profissão E travada',        VOO,           false, true ],
  ];
  for (const [rotulo, magia, avancada, travada] of casos) {
    it(rotulo, () => {
      expect(ehAvancada(magia), 'alcance').toBe(avancada);
      expect(ehTravada(magia),  'raridade').toBe(travada);
    });
  }

  it('existe magia avançada COMPRÁVEL — sem isso a aba nasce morta', () => {
    const naAba = [NECROANIMACAO, CARCERE, ESCONJURACAO].filter(ehAvancada);
    expect(naAba.length).toBeGreaterThan(0);
    expect(naAba.some((m) => !ehTravada(m)),
      'a aba Avançadas não pode conter só magia intravável').toBe(true);
  });
});

/* O caso relatado, de ponta a ponta. */
describe('Elarion (Mago / Colégio Necromântico)', () => {
  const PROF = 'Mago';
  const ESP  = 'Colégio Necromântico';
  const catalogo = [NECROANIMACAO, TELECINESE, VOO, CARCERE, ESCONJURACAO];

  // Calculado DENTRO de cada teste: o corpo do describe roda antes do
  // beforeAll, e lá em cima os helpers ainda são undefined.
  const abaAvancadas = () => catalogo
    .filter((m) => podeAcessar(m, PROF, ESP))
    .filter(ehAvancada);

  it('a aba Avançadas dele não é vazia', () => {
    expect(abaAvancadas().map((m) => m.nome)).toContain('Necroanimação');
  });

  it('e tem magia que ele CONSEGUE comprar', () => {
    expect(abaAvancadas().filter((m) => !ehTravada(m)).map((m) => m.nome))
      .toContain('Necroanimação');
  });

  it('as travadas dele continuam travadas, na mesma aba', () => {
    expect(abaAvancadas().filter(ehTravada).map((m) => m.nome))
      .toContain('Cárcere de Almas');
  });

  it('magia de Mago sem especialização não vaza pra aba Avançadas', () => {
    expect(abaAvancadas().map((m) => m.nome)).not.toContain('Telecinese');
  });
});
