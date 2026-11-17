/* ============================================================
   catalogo-mundo.test.jsx — Entidades e Grupos editáveis (15/11/2026)
   ============================================================
   Usuário: "Eu quero editar as informações da ambientação, como grupos,
   entidades, assim como edito de reinos e cidades." Só o admin edita, numa
   versão só; o calendário segue os feriados editados.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/entidades.jsx';
import '../01-core/grupos.jsx';
import './catalogo-mundo.jsx';

const W = window;
const fonte = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

describe('o banco é a única fonte', () => {
  it('a lista é a do banco, por tipo, com o slug junto', () => {
    const linhas = [
      { tipo: 'entidade', slug: 'blator', dados: { nome: 'Blator', classe: 'deus' } },
      { tipo: 'grupo', slug: 'alquimico', dados: { nome: 'Colégio Alquímico' } },
    ];
    expect(W.mundoVigente('entidade', linhas)).toEqual([{ nome: 'Blator', classe: 'deus', slug: 'blator' }]);
    expect(W.mundoVigente('grupo', linhas).map((x) => x.slug)).toEqual(['alquimico']);
    expect(W.mundoVigente('entidade', null)).toEqual([]);
  });
  it('o código guarda só o vocabulário, não o texto', () => {
    expect(W.ENTIDADES).toBeUndefined();
    expect(W.GRUPOS).toBeUndefined();
    expect(W.ENTIDADE_CLASSES.deus.pt).toBe('Deus');
  });
});

describe('o que vai para o banco', () => {
  it('feriado de uma data vira dia/mês; de várias, datas; e o vazio sai', () => {
    const d = W.limparEntradaMundo({
      slug: 'x', nome: 'X', titulo: '', prefacio: { texto: 'a', fonte: '' },
      /* 17/11/2026: a Data é o seletor (_data, uma); as outras datas do
         feriado seguem em _datasResto; escolher a data tira o "quando". */
      feriados: [
        { nome: 'Um dia', _data: { dia: 21, mes: 5, ano: 0 }, _datasResto: [], texto: 't' },
        { nome: 'Dois dias', _data: { dia: 30, mes: 4, ano: 0 }, _datasResto: [{ dia: 1, mes: 5 }], quando: 'na virada' },
        { nome: 'Escolhido', _data: { dia: 2, mes: 6, ano: 0 }, _datasResto: [], quando: 'antes', _dataEscolhida: true },
        { nome: 'Sem data', _data: null, _datasResto: [], quando: 'no fim do inverno' },
        { nome: '', _data: { dia: 3, mes: 3, ano: 0 } },
      ],
      relacoes: [],
    });
    expect(d).toEqual({
      slug: 'x', nome: 'X', prefacio: { texto: 'a' },
      feriados: [
        { nome: 'Um dia', texto: 't', dia: 21, mes: 5 },
        { nome: 'Dois dias', quando: 'na virada', datas: [{ dia: 30, mes: 4 }, { dia: 1, mes: 5 }] },
        { nome: 'Escolhido', dia: 2, mes: 6 },
        { nome: 'Sem data', quando: 'no fim do inverno' },
      ],
    });
  });
  it('a Data é o seletor do calendário do mundo, sem o "quando, por extenso"', () => {
    const f = fonte('catalogo-mundo.jsx');
    expect(f).toContain("campos: [['nome', 'Nome', 'Name'], ['_data', 'Data', 'Date', 'data'], ['texto', 'Texto', 'Text', 'area']] },");
    expect(f).not.toContain('Quando, por extenso');
    expect(f).toMatch(/<Picker lang=\{lang\} semAno value=\{it\[k\] \|\| null\}/);
  });
  it('os campos do formulário cobrem tudo o que a ficha mostra', () => {
    const chaves = (t) => W.CAMPOS_MUNDO[t].map((c) => c.chave.split('.')[0]);
    for (const k of ['nome', 'classe', 'titulo', 'prefacio', 'descricao', 'relacoes', 'locais', 'feriados', 'itens']) expect(chaves('entidade')).toContain(k);
    // Os tópicos dos grupos desde 15/11/2026: Epígrafe, História, Localização, Admissão, Organização, Relíquias, Rumores.
    expect(chaves('grupo')).toEqual(['nome', 'tipo', 'titulo', 'imagem', 'epigrafe', 'epigrafe', 'historia', 'locais', 'admissao', 'organizacao', 'reliquias', 'rumores']);
  });
});

describe('quem edita e o calendário', () => {
  it('só o admin grava: a RLS do banco exige eh_admin()', () => {
    const sql = fonte('../../scripts/sql/catalogo-mundo-2026-11-15.sql');
    for (const p of ['insert', 'update', 'delete']) expect(sql).toMatch(new RegExp(`catalogo_mundo_${p}_admin[\\s\\S]*?public\\.eh_admin\\(\\)`));
  });
  it('as páginas mostram o + e o lápis só para o admin', () => {
    for (const arq of ['entidades.jsx', 'grupos.jsx']) {
      const f = fonte(arq);
      expect(f).toMatch(/podeCriar=\{!!\(ehAdmin && Editor\)\}/);
      expect(f).toMatch(/onEditar=\{ehAdmin && Editor \?/);
    }
  });
  it('o calendário refaz os feriados com as entidades vigentes', () => {
    const shell = fonte('../10-shell/shell.jsx');
    expect(shell).toMatch(/function refazerFeriadosDoCalendario\(dasEntidades\) \{\s*FERIADOS_FANTASY\.length = 0;\s*FERIADOS_FANTASY\.push\(\.\.\.FERIADOS_ESTACOES, \.\.\.\(dasEntidades \|\| \[\]\)\);/);
    expect(fonte('catalogo-mundo.jsx')).toMatch(/refazer\(feriados\(mundoVigente\('entidade'\)\)\)/);
  });
});
