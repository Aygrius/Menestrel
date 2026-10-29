/* ============================================================
   grupo-afetado.test.js — quem o local move e quem o clima desgasta
   ============================================================
   Pedidos do usuário (06/10/2026):
     "O seletor de localização no topo será a localização do personagem, ao
      invés de ser o seletor do local da aventura."
     "O clima passa a afetar os personagens individualmente. Mas para facilitar
      a vida do mestre, será possível quais personagens serão afetados em
      conjunto ou de forma individual, para agilizar."

   O que pode se desfazer em silêncio, e é o que estes testes travam:

   1. O PADRÃO "TODOS". Toda mesa que existe hoje tem `afetados` ausente. Se
      ausente passar a significar "ninguém", o relógio da mesa para de
      desgastar a mesa inteira — e para de FAZER nada, sem erro na tela.
   2. "A MESA INTEIRA" TER UMA REPRESENTAÇÃO SÓ. Marcar todos grava ausente;
      duas representações do mesmo estado é o começo de um bug de comparação.
   3. O LOCAL DE UM GRUPO DIVIDIDO. Eleger um vencedor entre dois lugares
      mentiria sobre onde metade do grupo está.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './grupo-afetado.jsx';

let pjsAfetados, afetaTodos, comAfetados, localDoGrupo;
beforeAll(() => {
  ({ pjsAfetados, afetaTodos, comAfetados, localDoGrupo } = window);
  expect(pjsAfetados).toBeTypeOf('function');
});

const TODOS = ['a', 'b', 'c', 'd'];

describe('sem marcação, o clima pega a mesa inteira', () => {
  it('jsonb sem `afetados` (toda mesa que já existe) afeta todos', () => {
    expect(pjsAfetados({ dia: 1 }, TODOS)).toEqual(TODOS);
    expect(pjsAfetados(null, TODOS)).toEqual(TODOS);
    expect(afetaTodos(null, TODOS)).toBe(true);
  });

  it('lista vazia também: é o mesmo estado, escrito de outro jeito', () => {
    expect(pjsAfetados({ afetados: [] }, TODOS)).toEqual(TODOS);
    expect(afetaTodos({ afetados: [] }, TODOS)).toBe(true);
  });

  it('sem protagonista nenhum, ninguém — e sem explodir', () => {
    expect(pjsAfetados({ afetados: ['a'] }, [])).toEqual([]);
    expect(pjsAfetados(null, null)).toEqual([]);
  });
});

describe('o recorte', () => {
  it('afeta só os marcados', () => {
    expect(pjsAfetados({ afetados: ['b', 'd'] }, TODOS)).toEqual(['b', 'd']);
    expect(afetaTodos({ afetados: ['b', 'd'] }, TODOS)).toBe(false);
  });

  it('id marcado que saiu da mesa é ignorado, sem o Mestre limpar a lista', () => {
    expect(pjsAfetados({ afetados: ['b', 'zzz'] }, TODOS)).toEqual(['b']);
  });

  it('se TODOS os marcados saíram da mesa, volta a ser a mesa inteira', () => {
    // O contrário deixaria o relógio sem efeito nenhum, em silêncio.
    expect(pjsAfetados({ afetados: ['zzz'] }, TODOS)).toEqual(TODOS);
  });

  it('compara como texto: id numérico marcado casa com protagonista numérico', () => {
    expect(pjsAfetados({ afetados: [7] }, [7, 8])).toEqual(['7']);
  });
});

describe('gravar a marcação', () => {
  it('marcar todos grava AUSENTE, não a lista cheia', () => {
    const r = comAfetados({ dia: 1, tempo: { agua: 'fresco' } }, TODOS, TODOS);
    expect('afetados' in r).toBe(false);
    expect(r).toEqual({ dia: 1, tempo: { agua: 'fresco' } });
  });

  it('marcar ninguém é o mesmo que marcar todos', () => {
    expect('afetados' in comAfetados({ afetados: ['a'] }, [], TODOS)).toBe(false);
  });

  it('o recorte entra na ordem dos protagonistas, não na de clique', () => {
    // Lista gravada estável: duas marcações iguais dão o mesmo jsonb.
    expect(comAfetados({}, ['d', 'b'], TODOS).afetados).toEqual(['b', 'd']);
    expect(comAfetados({}, ['b', 'd'], TODOS).afetados).toEqual(['b', 'd']);
  });

  it('id repetido ou de fora não suja a lista', () => {
    expect(comAfetados({}, ['b', 'b', 'zzz'], TODOS).afetados).toEqual(['b']);
  });

  it('o resto do jsonb fica intacto — é onde moram a data, a hora e o clima', () => {
    const antes = { dia: 11, mes: 2, ano: 1500, hora: 20, tempo: { vento: 'tornado' }, decaimento_em: { ano: 1500 } };
    const r = comAfetados(antes, ['a'], TODOS);
    expect(r.dia).toBe(11);
    expect(r.hora).toBe(20);
    expect(r.tempo).toEqual({ vento: 'tornado' });
    expect(r.decaimento_em).toEqual({ ano: 1500 });
  });
});

describe('onde o grupo está', () => {
  const PJS = [
    { id: 'a', localizacao: 'Farzelo' },
    { id: 'b', localizacao: 'Farzelo' },
    { id: 'c', localizacao: 'Ilha dos Corvos' },
    { id: 'd', localizacao: null },
  ];

  it('todos no mesmo lugar: é esse o local do grupo', () => {
    expect(localDoGrupo(PJS, ['a', 'b'])).toMatchObject({ local: 'Farzelo', mesmo: true });
  });

  it('em lugares diferentes: nenhum vencedor', () => {
    const r = localDoGrupo(PJS, ['a', 'b', 'c']);
    expect(r.mesmo).toBe(false);
    expect(r.local).toBe('');
  });

  it('metade em lugar nenhum também não é UM local', () => {
    expect(localDoGrupo(PJS, ['a', 'd']).mesmo).toBe(false);
  });

  it('todos em lugar nenhum: um local só, o vazio', () => {
    expect(localDoGrupo(PJS, ['d'])).toMatchObject({ local: '', mesmo: true, vazios: 1 });
  });

  it('grupo que não casa com ninguém não inventa local', () => {
    expect(localDoGrupo(PJS, ['zzz'])).toMatchObject({ local: '', mesmo: true });
    expect(localDoGrupo([], ['a'])).toMatchObject({ local: '', mesmo: true });
  });
});
