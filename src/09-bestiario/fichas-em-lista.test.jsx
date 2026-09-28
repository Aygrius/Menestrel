/* ============================================================
   fichas-em-lista.test.jsx — toda ficha em LISTA, por extenso
   ============================================================
   "Eu quero que esse mesmo tipo de alteração seja feito para magias, itens,
    criaturas, etc. Sem minicards, e com listas por extenso." (usuário,
    26/09/2026)

   O que já valia para a janela da criatura do bestiário (ver
   criatura-ficha-secoes.test.jsx) passou a valer para as janelas de magia,
   técnica, habilidade e item, e para a ficha de criatura do Diário: nenhum
   quadro de valor (.best-detail-stats, .cficha-stat, .cficha-pill), linhas
   nome · valor, e as siglas do banco escritas por extenso.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './conhecido-jogador.jsx';
import './catalogo-descritores.jsx';
import './catalogo-editor.jsx';
import './bestiario.jsx';
import '../13-diario/diario.jsx';

const TABELAS = {
  magias: [
    { key: 'bola', nome: 'Bola de Fogo', tipo: 'Básica', evocacao: 'Instantânea', alcance: '30m',
      duracao: null, custo: 2, permissao: 'Mago', descricao: 'Uma esfera de fogo.', nivel_1: 'Um alvo.' },
    { key: 'aprisionar', nome: 'Aprisionar', tipo: 'Perdida', custo: 3,
      descricao: 'Prende o alvo num círculo.\nItens necessários: Vela (7), Hidromel (1), Sangue Demoníaco (1).' },
  ],
  tecnicas: [{ key: 'lanca', nome: 'Carga de Lança', uso: 'Único', grupo_armas: 'CM,CL', grupo_armaduras: 'L,M',
    custo: 3, permissao: 'Academia de Cavaleiros', descricao: 'Investida montada.',
    efeito: 'Um teste de Carga (Difícil) ignora a energia heroica de 1 alvo por 1 rodada.' }],
  habilidades: [{ key: 'alq', nome: 'Alquimia', grupo: 'Conhecimento', ajuste: 'intelecto', vantagem: 'Poções',
    desvantagem: null, custo: 2, descricao: null }],
  itens: [
    { slug: 'estalagem', nome: 'Diária em Estalagem Popular', grupo: 'Serviços', icone: 'ti-home',
      descricao: null, efeito_positivo: 'Aumenta 1 de Energia Física.' },
    { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', dano: 4, ajuste_atributo: 'FOR', valor_latao: 50, descricao: 'Lâmina curta.',
    ocupa: 1, categoria_equip: 'arma' }],
};

beforeAll(() => {
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  window.supabaseClient = {
    from: (tabela) => {
      const resposta = () => Promise.resolve({ data: TABELAS[tabela] || [], error: null });
      const box = {
        select: () => box, eq: () => box, order: () => box,
        range: () => resposta(),
        like: () => Promise.resolve({ data: [], error: null }),
        then: (ok, falha) => resposta().then(ok, falha),
      };
      return box;
    },
    rpc: async () => ({ data: false, error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
  };
  window.useConhecidoDoJogador = () => ({ carregando: false, erro: null, conhecido: {
    magias: new Map(), tecnicas: new Set(), habilidades: new Set(), itens: new Set(), criaturas: new Set(),
  } });
});
afterEach(() => { cleanup(); });

const abrir = async (Lista, nome) => {
  render(<div className="menestrel-ui"><Lista ac={{}} lang="pt" /></div>);
  const linha = await vi.waitFor(() => {
    const tr = [...document.querySelectorAll('tbody tr')].find((t) => t.textContent.includes(nome));
    expect(tr).toBeTruthy();
    return tr;
  });
  fireEvent.click(linha);
  return vi.waitFor(() => {
    const det = document.querySelector('.best-detail');
    expect(det).toBeTruthy();
    return det;
  });
};
const linhas = (raiz) => [...raiz.querySelectorAll('.best-stat--linha')].map((li) => [
  li.querySelector('.best-stat-lbl').textContent.trim(),
  (li.querySelector('.best-stat-val') || { textContent: '' }).textContent.trim(),
]);
const semMiniCard = (raiz) => {
  expect(raiz.querySelector('.best-detail-stats'), 'sobrou faixa de mini-cards').toBeNull();
  expect(raiz.querySelectorAll('.best-stat:not(.best-stat--linha)'), 'sobrou mini-card').toHaveLength(0);
};

/* "No caso das magias, Itens necessários será extraído da descrição e irá
   virar um item na lista." (usuário, 26/09/2026) */
describe('separarItensNecessarios', () => {
  const sep = (t) => window.separarItensNecessarios(t);
  it('a frase do fim sai do texto e vira a lista, sem o ponto', () => {
    expect(sep('Localiza abrigos.\nItens necessários: Água (2).')).toEqual({ texto: 'Localiza abrigos.', itens: 'Água (2)' });
  });
  it('"para:" e "para o ritual:" também', () => {
    expect(sep('X. \nItens necessários para: Vela (7), Água (10).').itens).toBe('Vela (7), Água (10)');
    expect(sep('X.\nItens necessários para o ritual: Carcaça (1).').itens).toBe('Carcaça (1)');
  });
  it('na mesma linha do parágrafo', () => {
    expect(sep('Não poderá deixar o local. Itens necessários: Vela (3).')).toEqual({ texto: 'Não poderá deixar o local.', itens: 'Vela (3)' });
  });
  it('sem a frase, nada muda', () => {
    expect(sep('Só texto.')).toEqual({ texto: 'Só texto.', itens: null });
    expect(sep(null)).toEqual({ texto: null, itens: null });
  });
});

describe('janelas do catálogo', () => {
  it('Magia com componentes: a descrição perde a frase e a lista ganha a linha, larga', async () => {
    const det = await abrir(window.MagiasList, 'Aprisionar');
    expect(det.querySelector('.best-desc').textContent).not.toMatch(/Itens necess/);
    const li = [...det.querySelectorAll('.best-stat--linha')].find((l) => l.textContent.startsWith('Itens necessários'));
    expect(li.querySelector('.best-stat-val').textContent).toBe('Vela (7), Hidromel (1), Sangue Demoníaco (1)');
    expect(li.classList.contains('best-stat--largo')).toBe(true);
  });

  it('Magia: lista com tipo, evocação, alcance, custo e quem aprende — sem linha vazia', async () => {
    const det = await abrir(window.MagiasList, 'Bola de Fogo');
    semMiniCard(det);
    expect(linhas(det)).toEqual([
      ['Tipo', 'Básica'], ['Evocação', 'Instantânea'], ['Alcance', '30m'],
      // Exclusividade por extenso desde 26/09/2026 ("não precisa mais abreviar").
      ['Custo', '2'], ['Exclusividade', 'Mago'],
    ]);
    // E numa linha inteira, igual Itens necessários.
    const exc = [...det.querySelectorAll('.best-stat--linha')].find((li) => li.textContent.startsWith('Exclusividade'));
    expect(exc.classList.contains('best-stat--largo')).toBe(true);
    // A permissão saiu da faixa solta e mora na lista.
    expect(det.querySelector('.best-permissao')).toBeNull();
  });

  it('Técnica: categoria e armaduras por extenso; armas em sigla', async () => {
    const det = await abrir(window.TecnicasList, 'Carga de Lança');
    semMiniCard(det);
    const mapa = Object.fromEntries(linhas(det));
    expect(mapa['Categoria']).toBe('Especializada');
    // "Pode abreviar as armas 'PL, PM'" (26/09/2026).
    expect(mapa['Grupos de armas']).toBe('CM, CL');
    expect(mapa['Armaduras']).toBe('Armaduras leves, Armaduras médias');
    // Por extenso e numa linha inteira desde 26/09/2026 ("não precisa mais abreviar").
    expect(mapa['Exclusividade']).toBe('Academia de Cavaleiros');
    const exc = [...det.querySelectorAll('.best-stat--linha')].find((li) => li.textContent.startsWith('Exclusividade'));
    expect(exc.classList.contains('best-stat--largo')).toBe(true);
  });

  /* "Ao clicar na técnica e mostrar sua descrição, mostre também seu efeito."
     (usuário, 26/09/2026) */
  it('Técnica mostra o efeito logo depois da descrição', async () => {
    const det = await abrir(window.TecnicasList, 'Carga de Lança');
    const efeito = det.querySelector('.best-secao--efeito');
    expect(efeito.querySelector('.best-secao-titulo').textContent).toBe('Efeito');
    expect(efeito.textContent).toMatch(/ignora a energia heroica/);
    expect(det.querySelector('.best-desc').compareDocumentPosition(efeito) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Habilidade sem descrição também abre, com o atributo por extenso', async () => {
    const det = await abrir(window.HabilidadesList, 'Alquimia');
    expect(Object.fromEntries(linhas(det))).toEqual({
      // Sem Grupo desde 26/09/2026.
      Atributo: 'Intelecto', Vantagem: 'Poções', Custo: '2',
    });
  });

  it('Item: sem mini-card, e o atributo "FOR" vira "Força"', async () => {
    const det = await abrir(window.ItensList, 'Adaga');
    semMiniCard(det);
    const mapa = Object.fromEntries(linhas(det));
    expect(mapa['Atributo']).toBe('Força');
    expect(mapa['Dano']).toBe('4');
    expect(mapa['Ocupa']).toBe('1,0');
    // Sem "Grupo" desde 26/09/2026 ("no modal de itens, não precisa mostrar o grupo").
    expect(mapa['Grupo']).toBeUndefined();
  });
});

/* "Já que você colocou o texto 'Efeito', coloque acima o texto 'Descrição'.
   Isso vale para habilidades, magias, etc." (usuário, 26/09/2026) */
describe('a descrição tem título em toda janela', () => {
  const titulos = (det) => [...det.querySelectorAll('.best-secao-titulo')].map((t) => t.textContent.trim());
  it.each([
    ['MagiasList', 'Bola de Fogo'], ['TecnicasList', 'Carga de Lança'], ['ItensList', 'Adaga'],
  ])('%s: "Descrição" é o primeiro título', async (lista, nome) => {
    const det = await abrir(window[lista], nome);
    expect(titulos(det)[0]).toBe('Descrição');
  });

  it('Técnica: Descrição, depois Efeito', async () => {
    const det = await abrir(window.TecnicasList, 'Carga de Lança');
    expect(titulos(det).slice(0, 2)).toEqual(['Descrição', 'Efeito']);
  });

  it('sem descrição, a seção some — não fica um título sozinho', async () => {
    const det = await abrir(window.HabilidadesList, 'Alquimia');
    expect(titulos(det)).not.toContain('Descrição');
  });
});

describe('ficha de criatura do Diário', () => {
  const ENTRADA = {
    id: 7, tipo: 'criatura', nome: 'Lobo', estagio: 2, plano: 'Material', elemento: 'Terra',
    coletivo: 'Grupo Médio', peso: 40, intelecto: 'a', aura: 0, carisma: 1, forca: 3, fisico: 2,
    agilidade: 3, percepcao: 4, energia_fisica: 12, energia_heroica: 8, armadura: 'L', defesa: 2,
    absorcao: 1, velocidade: 18, ataque: 'Mordida', dano_l: 4, dano_100: 12,
    tecnicas_especiais: 'Ataque Oportuno, Esquiva', habilidades: 'Rastrear',
  };
  const montar = () => render(<div className="menestrel-ui"><window.CriaturaFicha entrada={ENTRADA} lang="pt" /></div>);
  const secao = (titulo) => [...document.querySelectorAll('.best-secao')]
    .find((s) => s.querySelector('.best-secao-titulo').textContent.trim() === titulo);

  it('a descrição vem com o título', () => {
    render(<div className="menestrel-ui"><window.CriaturaFicha entrada={{ ...ENTRADA, descricao: 'Caçador de matilha.' }} lang="pt" /></div>);
    const sec = document.querySelector('.best-secao--descricao');
    expect(sec.querySelector('.best-secao-titulo').textContent).toBe('Descrição');
    expect(sec.textContent).toMatch(/Caçador de matilha/);
  });

  it('sem bolha, caixa, selo nem pílula', () => {
    montar();
    for (const sel of ['.cficha-stat', '.cficha-pill', '.cficha-dano', '.cficha-thresh', '.diario-det-attr']) {
      expect(document.querySelector(sel), sel).toBeNull();
    }
  });

  it('Características, Atributos e Informações, por extenso, com a unidade e o "L2"', () => {
    montar();
    expect(linhas(secao('Características'))).toEqual([
      ['Plano', 'Material'], ['Elemento', 'Terra'], ['Grupo', 'Médio'], ['Peso', '40kg'],
    ]);
    expect(linhas(secao('Atributos')).map(([l]) => l)).toEqual(
      ['Aura', 'Força', 'Físico', 'Carisma', 'Agilidade', 'Intelecto', 'Percepção']);
    expect(Object.fromEntries(linhas(secao('Informações')))).toMatchObject({
      Estágio: '2', 'Energia Física': '12', 'Energia Heroica': '8', Armadura: 'L2',
    });
  });

  it('Combate diz contra o que é o dano; técnicas e habilidades são linhas', () => {
    montar();
    expect(Object.fromEntries(linhas(secao('Combate')))).toMatchObject({
      Ataque: 'Mordida', 'Dano contra armadura leve': '4', 'Dano 100%': '12',
    });
    expect(linhas(secao('Técnicas Especiais')).map(([l]) => l)).toEqual(['Ataque Oportuno', 'Esquiva']);
    expect(linhas(secao('Habilidades')).map(([l]) => l)).toEqual(['Rastrear']);
  });
});

/* "Mude o texto 'quem aprende' para 'Exclusividade', e informe o nome das
   profissões de forma abreviada com 3 letras [...] mostre o título abreviado
   'Arq'" e "'5 quilômetros' vira '5 km'" (usuário, 26/09/2026). */
describe('abreviações', () => {
  const ex = (v) => window.abreviarExclusividade(v);
  it('profissão: 3 letras; especialização: 3 letras do título', () => {
    expect(ex('Guerreiro, Academia de Arqueiros')).toBe('Gue, Arq');
    expect(ex('Guilda de Assassinos')).toBe('Ass');
    expect(ex('Mago, Colégio Elemental')).toBe('Mag, Ele');
  });
  it('as três que colidiriam ganham abreviação própria', () => {
    expect(ex('Ladino, Guilda de Ladrões')).toBe('Lad, Ldr');
    expect(ex('Colégio Filosófico, Ordem de Ganis, Ordem de Sevides')).toBe('Fil, FMa, FTe');
  });
  it('nome desconhecido passa inteiro; vazio some', () => {
    expect(ex('Ordem Nova')).toBe('Ordem Nova');
    expect(ex('')).toBeNull();
  });
  it('alcance: quilômetros → km, metros → m', () => {
    expect(window.abreviarAlcance('5 quilômetros')).toBe('5 km');
    expect(window.abreviarAlcance('20 metros')).toBe('20 m');
    expect(window.abreviarAlcance('Toque')).toBe('Toque');
    expect(window.abreviarAlcance('10 km')).toBe('10 km');
  });
});

/* 26/09/2026: "na tabela de itens, eu quero que mostre o ícone do item junto
   com o nome" e "o campo descrição não está aparecendo nos itens do tipo
   serviço" — o texto dessas diárias mora no efeito positivo, que a janela
   nunca mostrava. */
describe('itens: ícone na tabela e efeitos na janela', () => {
  it('o nome leva o ícone do item', async () => {
    render(<div className="menestrel-ui"><window.ItensList ac={{}} lang="pt" /></div>);
    const tr = await vi.waitFor(() => {
      const t = [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes('Diária em Estalagem'));
      expect(t).toBeTruthy();
      return t;
    });
    expect(tr.querySelector('.best-name i.ti').className).toContain('ti-home');
  });

  it('o serviço sem descrição mostra o efeito positivo', async () => {
    const det = await abrir(window.ItensList, 'Diária em Estalagem');
    // Em Características desde 26/09/2026 (as abas de efeito foram unidas a ela).
    const linha = [...det.querySelectorAll('.best-secao--lista .best-stat--linha')]
      .find((li) => li.textContent.startsWith('Efeito positivo'));
    expect(linha.textContent).toMatch(/Aumenta 1 de Energia Física/);
    expect(det.querySelector('.best-secao--efeito')).toBeNull();
  });
});

/* "Ao abrir um item de arma, é preciso informar se a arma é boa contra
   armaduras leves, armaduras médias e armaduras pesadas." (usuário, 26/09/2026) */
describe('arma: eficácia contra cada armadura', () => {
  it('positivo é Boa, zero Normal, negativo Fraca — com o número', () => {
    expect(window.eficaciaContraArmadura(4, false)).toBe('Boa (+4)');
    expect(window.eficaciaContraArmadura(0, false)).toBe('Normal (0)');
    expect(window.eficaciaContraArmadura(-2, false)).toBe('Fraca (−2)');
    expect(window.eficaciaContraArmadura(null, false)).toBeNull();
  });

  it('a janela da arma mostra as três linhas', async () => {
    TABELAS.itens = [...TABELAS.itens, { slug: 'lanca', nome: 'Lança', grupo: 'Armas', categoria_equip: 'arma', dano: 20, dano_l: -4, dano_m: 0, dano_p: 4 }];
    const det = await abrir(window.ItensList, 'Lança');
    const mapa = Object.fromEntries(linhas(det));
    expect(mapa['Contra armaduras leves']).toBe('Fraca (−4)');
    expect(mapa['Contra armaduras médias']).toBe('Normal (0)');
    expect(mapa['Contra armaduras pesadas']).toBe('Boa (+4)');
  });

  it('item que não é arma não mostra', async () => {
    const det = await abrir(window.ItensList, 'Diária em Estalagem');
    expect(Object.keys(Object.fromEntries(linhas(det)))).not.toContain('Contra armaduras leves');
  });
});

/* "Adicione o ícone da criatura. Faça isso para os outros menus também" e
   "nos itens que possuem resistência, adicione a informação" (usuário,
   26/09/2026). */
describe('ícone ao lado do nome, em cada tabela', () => {
  const iconeDe = async (Lista, nome) => {
    render(<div className="menestrel-ui"><Lista ac={{}} lang="pt" /></div>);
    const tr = await vi.waitFor(() => {
      const t = [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes(nome));
      expect(t).toBeTruthy();
      return t;
    });
    return tr.querySelector('.best-name i.ti').className;
  };
  it('magia pelo tipo', async () => { expect(await iconeDe(window.MagiasList, 'Bola de Fogo')).toContain('ti-wand'); });
  it('técnica pelo uso', async () => { expect(await iconeDe(window.TecnicasList, 'Carga de Lança')).toContain('ti-diamond'); }); // uso Único
  it('habilidade pelo grupo', async () => { expect(await iconeDe(window.HabilidadesList, 'Alquimia')).toContain('ti-book'); });
});

describe('item com resistência', () => {
  it('a janela mostra a Resistência', async () => {
    TABELAS.itens = [...TABELAS.itens, { slug: 'escudo', nome: 'Escudo de Madeira', grupo: 'Armaduras', resistencia: 12 }];
    const det = await abrir(window.ItensList, 'Escudo de Madeira');
    expect(Object.fromEntries(linhas(det))['Resistência']).toBe('12');
  });
});

/* "Em todos os modais de conhecidos, reinos, itens, magias, técnicas, etc,
   use as abas de navegação para cada título." (usuário, 26/09/2026) — as abas
   saem das seções desenhadas (useAbasDoCorpo). */
describe('abas nos modais de detalhe', () => {
  const abas = () => [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
  const visivel = (sel) => { const el = document.querySelector(sel); return !!el && !el.closest('[hidden]'); };

  // Os níveis moram na Descrição em toda janela de magia (26/09/2026).
  it('magia: Descrição (com os níveis) e Características; uma de cada vez', async () => {
    await abrir(window.MagiasList, 'Bola de Fogo');
    expect(abas()).toEqual(['Descrição', 'Características']);
    expect(visivel('.best-secao--descricao')).toBe(true);
    expect(visivel('.best-secao--lista')).toBe(false);
    fireEvent.click([...document.querySelectorAll('.best-abas [role="tab"]')][1]);
    expect(visivel('.best-secao--lista')).toBe(true);
    expect(visivel('.best-secao--descricao')).toBe(false);
    expect(document.querySelector('.best-abas [aria-selected="true"]').textContent).toBe('Características');
  });

  it('técnica e item também ganham abas', async () => {
    await abrir(window.TecnicasList, 'Carga de Lança');
    expect(abas().length).toBeGreaterThan(1);
    cleanup();
    await abrir(window.ItensList, 'Adaga');
    expect(abas()).toContain('Características');
  });
});
