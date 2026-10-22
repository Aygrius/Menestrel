/* ============================================================
   magia-basica-avancada.test.js — magia básica x avançada (exibição)
   ============================================================
   Bug relatado em 03/09/2026: "Elarion é do Colégio Necromântico, tem pontos
   disponíveis e não consegue comprar magias avançadas." Cada tela tinha a
   sua definição de "avançada", e foi a divergência entre elas que fez a
   compra parecer quebrada.

   Regra do usuário: **Avançada = Especialização** — magiaEhAvancada diz se
   a `permissao` cita uma especialização (Colégio…, Ordem…, Trilha…,
   Confraria…) e não só a profissão.

   Desde 22/10/2026 isto é só EXIBIÇÃO (as páginas Básicas/Avançadas da
   ficha): magia se aprende pelo item, sem permissão por profissão nem trava
   por raridade — ver pontos-magia.test.js.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/game-data.jsx';

let ehAvancada;
beforeAll(() => {
  ehAvancada = window.magiaEhAvancada;
  expect(ehAvancada, 'magiaEhAvancada precisa estar exposta').toBeDefined();
});

// Dados copiados da tabela `magias` de produção.
const NECROANIMACAO = { key: 'necroanimacao', nome: 'Necroanimação',
  permissao: 'Colégio Necromântico', tipo: 'Básica' };
const TELECINESE    = { key: 'telecinese', nome: 'Telecinese',
  permissao: 'Mago', tipo: 'Básica' };
// Permissão mista: a profissão E uma especialização citadas na mesma linha.
const ESCONJURACAO  = { key: 'esconjuracao', nome: 'Esconjuração',
  permissao: 'Sacerdote, Colégio Necromântico', tipo: 'Básica' };

describe('magiaEhAvancada — é sobre QUEM difunde a magia', () => {
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

  it('sem permissao não é avançada', () => {
    expect(ehAvancada({ nome: 'Mestre da Forja', permissao: null, tipo: null })).toBe(false);
  });

  it('não confunde nome de profissão com nome de especialização', () => {
    expect(ehAvancada({ permissao: 'Bardo', tipo: 'Básica' })).toBe(false);
    expect(ehAvancada({ permissao: 'Rastreador', tipo: 'Básica' })).toBe(false);
  });

  it('não depende da raridade (tipo)', () => {
    expect(ehAvancada({ permissao: 'Colégio Necromântico', tipo: 'Ancestral' })).toBe(true);
    expect(ehAvancada({ permissao: 'Mago', tipo: 'Perdida' })).toBe(false);
  });
});
