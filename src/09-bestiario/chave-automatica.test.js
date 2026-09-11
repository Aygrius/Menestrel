/* ============================================================
   chave-automatica.test.js — a chave deixa de ser digitada
   ============================================================
   Pedido do usuário (11/09/2026): "remova o input de 'chave', ele deve ser
   preenchido automaticamente com base no nome."

   O formato não é escolha de gosto: veio dos dados. As 4 tabelas com chave
   textual (magias, tecnicas, habilidades .key; itens .slug) usam snake_case
   sem acento, e preposição NÃO é removida. Os casos abaixo são pares
   nome/chave lidos do banco em 11/09/2026.

   A regra que este arquivo mais protege é a de NÃO derivar no rename: a
   chave é a identidade da linha, e inventário, ficha e batalha referenciam
   item por slug. Derivar de novo ao editar quebraria essas referências em
   silêncio — por isso o editor só deriva quando está criando.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/constants.jsx';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';
import './catalogo-editor.jsx';

let slugDeNome, chaveLivre, descritorDe;
beforeAll(() => {
  slugDeNome = window.slugDeNome;
  chaveLivre = window.chaveLivre;
  descritorDe = window.descritorDe;
  expect(slugDeNome).toBeTypeOf('function');
  expect(chaveLivre).toBeTypeOf('function');
});

describe('slugDeNome — pares lidos do banco', () => {
  const DO_BANCO = [
    ['Adestramento',        'adestramento'],
    ['Aeromanipulação',     'aeromanipulacao'],
    ['Área de Paz',         'area_de_paz'],
    ['Apontar Sufocante',   'apontar_sufocante'],
    ['Aprimorar Habilidades', 'aprimorar_habilidades'],
    ['Aljava Reforçada',    'aljava_reforcada'],
    ['Algibeira Planense',  'algibeira_planense'],
  ];

  it('reproduz a chave que o banco já tem', () => {
    for (const [nome, chave] of DO_BANCO) {
      expect(slugDeNome(nome), nome).toBe(chave);
    }
  });

  it('preposição fica — não é stopword', () => {
    expect(slugDeNome('Bainha para Adagas')).toBe('bainha_para_adagas');
  });

  it('pontuação e espaços repetidos viram um separador só', () => {
    expect(slugDeNome("Manto  do   Anão")).toBe('manto_do_anao');
    expect(slugDeNome('Poção (grande)')).toBe('pocao_grande');
    expect(slugDeNome("Élan Vital — o Sopro")).toBe('elan_vital_o_sopro');
  });

  it('não sobra separador nas pontas', () => {
    expect(slugDeNome('  Espada!  ')).toBe('espada');
    expect(slugDeNome('...Adaga...')).toBe('adaga');
  });

  it('nome sem letra nem número devolve vazio — o editor barra antes de salvar', () => {
    expect(slugDeNome('———')).toBe('');
    expect(slugDeNome('')).toBe('');
    expect(slugDeNome(null)).toBe('');
    expect(slugDeNome(undefined)).toBe('');
  });
});

describe('chaveLivre — colisão de nome', () => {
  it('chave inédita passa direto', () => {
    expect(chaveLivre('espada_longa', [])).toBe('espada_longa');
    expect(chaveLivre('espada_longa', ['outra_coisa'])).toBe('espada_longa');
  });

  it('a primeira colisão vira _2', () => {
    expect(chaveLivre('espada_longa', ['espada_longa'])).toBe('espada_longa_2');
  });

  it('pula os sufixos já usados em vez de parar no primeiro', () => {
    expect(chaveLivre('espada_longa', ['espada_longa', 'espada_longa_2', 'espada_longa_3']))
      .toBe('espada_longa_4');
  });

  it('buraco no meio é reaproveitado', () => {
    expect(chaveLivre('adaga', ['adaga', 'adaga_3'])).toBe('adaga_2');
  });

  it('aceita Set além de array', () => {
    expect(chaveLivre('adaga', new Set(['adaga']))).toBe('adaga_2');
  });

  it('base vazia não inventa chave', () => {
    expect(chaveLivre('', ['x'])).toBe('');
  });
});

describe('os descritores marcam o campo de chave como automático', () => {
  it('as 4 tabelas com chave textual têm autoDeNome', () => {
    for (const tabela of ['magias', 'tecnicas', 'habilidades', 'itens']) {
      const d = descritorDe(tabela);
      const auto = d.campos.filter((c) => c.autoDeNome);
      expect(auto.length, tabela + ' precisa de exatamente 1 campo automático').toBe(1);
      expect(auto[0].col, tabela).toBe(d.chave);
    }
  });

  it('criaturas não tem chave textual, logo não tem campo automático', () => {
    const d = descritorDe('criaturas');
    expect(d.chave).toBeNull();
    expect(d.campos.some((c) => c.autoDeNome)).toBe(false);
  });

  it('nome continua obrigatório em todas — é dele que a chave sai', () => {
    for (const tabela of ['magias', 'tecnicas', 'habilidades', 'itens']) {
      const nome = descritorDe(tabela).campos.find((c) => c.col === 'nome');
      expect(nome && nome.obrigatorio, tabela).toBe(true);
    }
  });
});
