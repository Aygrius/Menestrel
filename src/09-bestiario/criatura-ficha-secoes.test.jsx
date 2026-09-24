/* ============================================================
   criatura-ficha-secoes.test.jsx — a ficha da criatura em seções
   ============================================================
   "Na página de criaturas, eu quero apenas as colunas de 'visibilidade',
    'classe', 'estágio', além dos botões de ver e editar. O restante das
    informações eu quero descritas, use cards depois de cada subtítulo (com
    tooltip)." (usuário, 17/09/2026)

   A tabela tinha dez colunas (EF, EH, AB, DF, AR, VB, PS…) e a linha
   expandida era duas faixas de cards com rótulos de três letras. Virou o
   contrário: a tabela guarda o mínimo para achar a criatura, e TUDO o que era
   coluna desceu para a ficha, em oito seções com subtítulo.

   O RÓTULO de cada card passou por três estados no mesmo dia, e a ordem
   importa para não desfazer nada por engano:
     · 15/09: siglas ("padronize o tamanho dos atributos, abreviando as
       palavras") — foi o que criou EF/RF/AGI;
     · 17/09, primeira rodada: palavras inteiras, quando a ficha virou seções
       largas;
     · 17/09, segunda rodada: siglas DE NOVO nas duas seções densas, agora em
       CAIXA ALTA e com o nome inteiro no tooltip ("ao invés de Int é INT").
   Características e as seções de nome próprio nunca foram abreviadas.

   Quatro coisas em que este teste é chato de propósito:

   1. NÚMERO DE HABILIDADE/TÉCNICA/MAGIA vem das mesmas funções da batalha
      (o trio ...DaCriaturaCrua). O teste compara com o que a batalha devolve,
      em vez de com um literal: se as contas divergirem, ele quebra — que é o
      ponto de ter uma implementação só.

   2. MAGIA usa o ESTÁGIO, não a coluna `magia_n`. A coluna existe, está
      preenchida e está ABANDONADA desde 13/09/2026 — a Águia Real tem
      magia_n 9 e estágio 18. Usá-la mostraria um número velho.

   3. SEÇÃO VAZIA NÃO APARECE ("se a criatura não possui magia ou equipamentos,
      não precisa mostrar o título e -"). Chegou a mostrar o subtítulo com um
      travessão, por causa de como o exemplo foi escrito; o usuário viu na tela
      e preferiu sem.

   4. CLASSE E ELEMENTO são ÍCONE, não texto. O valor do card é um glifo e a
      palavra vive no tooltip e no aria-label — o teste cobre os três, porque
      um ícone sem nenhum dos dois é um card ilegível.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../10-shell/shell.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './conhecido-jogador.jsx';
import './catalogo-descritores.jsx';
import './catalogo-editor.jsx';
import './bestiario.jsx';
import '../12-batalha/batalha.jsx';
import '../12-batalha/tabuleiro.jsx';
import '../13-diario/diario.jsx';

let CriaturasList;
beforeAll(() => {
  CriaturasList = window.CriaturasList;
  expect(CriaturasList, 'CriaturasList precisa estar no window').toBeTypeOf('function');
  window.UI = {
    ...window.UI,
    Table: 'table', TableHeader: 'thead', TableBody: 'tbody',
    TableRow: 'tr', TableHead: 'th', TableCell: 'td',
    Input: (props) => <input {...props} />,
  };
});

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

/* A Águia do catálogo de produção, com os campos que importam. `intelecto` é
   "i" de verdade no banco (TEXT, diferente dos outros seis atributos) — não é
   erro de digitação da fixture. */
const AGUIA = {
  id: 15, nome: 'Águia', tipo: 'Animal', elemento: 'Ar', subtipo: null, plano: 'Material',
  coletivo: 'Grupo Pequeno', estagio: 1, montaria: false,
  intelecto: 'i', aura: 0, carisma: 1, forca: 0, fisico: 0, agilidade: 2, percepcao: 4,
  energia_fisica: 4, energia_heroica: 12, armadura: 'L', absorcao: 0, defesa: 2,
  velocidade: 2, peso: 4, altura: 0.8,
  descricao: 'A águia é uma ave de rapina territorial.',
  habilidades: 'Sentidos, Rastrear',
  tecnicas_especiais: 'Ataque Oportuno, Esquiva',
  magia: null, magia_n: null,
  equipamento: [{ slot: 'mao_d', slug: 'bico' }, { slot: 'arma', slug: 'garra' }],
};

/* A Águia Real existe nesta fixture por UM motivo: ser a criatura em que
   `magia_n` e o nível de verdade DISCORDAM, para denunciar quem lê a coluna
   abandonada.

   ⚠️ O estágio aqui é 6, não os 18 da produção, e a diferença é deliberada:
   nivelMagiaDeCriatura trava em 9 (min(9, par ? e-1 : e)), então estágio 18
   também dá 9 — o mesmo valor de magia_n, por coincidência do teto. Com a
   linha real, ler a coluna errada passaria no teste. Com estágio 6 o nível é
   5, e a diferença aparece. */
const AGUIA_REAL = {
  ...AGUIA,
  id: 16, nome: 'Águia Real', tipo: 'Místico', estagio: 6,
  coletivo: 'Solitário', altura: null,
  magia: 'Relâmpago', magia_n: 9,
  habilidades: 'Sentidos', tecnicas_especiais: 'Prender',
  equipamento: [],
};

const ITENS = [
  { slug: 'bico',  nome: 'Bico',   grupo: 'Armas', dano: 4, dano_l: 0, dano_m: 0, dano_p: 0, ajuste_atributo: 'FOR' },
  { slug: 'garra', nome: 'Garras', grupo: 'Armas', dano: 4, dano_l: 0, dano_m: 0, dano_p: 0, ajuste_atributo: 'AGI' },
  /* Uma peça de DEFESA no catálogo, para o teste de Equipamentos poder
     distinguir "filtrou as armas" de "a seção nunca mostra nada". Nenhuma
     criatura desta fixture a veste — quem a veste é o COURAÇADO, abaixo. */
  { slug: 'couraca', nome: 'Couraça de Placas', grupo: 'Armaduras', absorcao: 4, defesa: 1, tipo_armadura: 'P', slot_equip: 'peito' },
];
const HABILIDADES = [
  { key: 'sentidos', nome: 'Sentidos', grupo: 'Geral', ajuste: 'PER', descricao: 'Perceber o que escapa aos outros.' },
  { key: 'rastrear', nome: 'Rastrear', grupo: 'Geral', ajuste: 'PER', descricao: 'Seguir pistas e trilhas.' },
];
const TECNICAS = [
  { key: 'ataque_oportuno', nome: 'Ataque Oportuno', uso: 'Intermitente', efeito: 'mod_ataque:1', descricao: 'Golpeia a brecha.' },
  { key: 'esquiva',         nome: 'Esquiva',         uso: 'Livre',        efeito: 'mod_defesa:1', descricao: 'Sai da linha do golpe.' },
  { key: 'prender',         nome: 'Prender',         uso: 'Único',        efeito: '',             descricao: 'Imobiliza o alvo.' },
];
const MAGIAS = [
  { key: 'relampago', nome: 'Relâmpago', descricao: 'Um talho de luz.', nivel_1: '', nivel_9: '20 de dano' },
];

/* Uma criatura que veste ARMA e ARMADURA ao mesmo tempo: é ela que prova que
   Equipamentos filtra por grupo em vez de mostrar a lista inteira. */
const COURACADO = {
  ...AGUIA,
  id: 17, nome: 'Couraçado', tipo: 'Construído',
  equipamento: [{ slot: 'arma', slug: 'bico' }, { slot: 'peito', slug: 'couraca' }],
};

const PROTAGONISTAS = [{ id: 42, nome: 'Thalia' }, { id: 87, nome: 'Yuldrous' }];
const HISTORIA = {
  id: 13, titulo: 'Mesa', protagonista_ids: [42, 87],
  criatura_ids: [15], npc_ids: [], reino_ids: [], cidade_ids: [],
  lore_acesso_pj: {},
};

function caixa(linhas) {
  const box = {
    eq: () => box, in: () => box, order: () => box, not: () => box,
    range: async () => ({ data: linhas, error: null }),
    maybeSingle: async () => ({ data: linhas[0] ?? null, error: null }),
    then: (res, rej) => Promise.resolve({ data: linhas, error: null }).then(res, rej),
  };
  return box;
}

function stubBanco({ criaturas = [AGUIA, AGUIA_REAL, COURACADO], historia = HISTORIA } = {}) {
  const porTabela = {
    criaturas, itens: ITENS, habilidades: HABILIDADES, tecnicas: TECNICAS,
    magias: MAGIAS, historias: [historia], personagens: PROTAGONISTAS,
  };
  globalThis.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin' ? { data: true, error: null } : { data: null, error: null }),
    from: (nome) => ({
      select: () => caixa(porTabela[nome] || []),
      update: () => ({ eq: () => ({ select: async () => ({ data: [historia], error: null }) }) }),
    }),
  };
}

const montar = (props = {}) => render(
  <CriaturasList ac={window.ADMIN_COPY.pt} lang="pt" modoJogador={false} historiaId={13} {...props} />
);

const pronta = () => waitFor(() => expect(document.querySelector('tbody tr')).toBeTruthy());
const cabecalho = () => [...document.querySelectorAll('thead th')]
  .map((th) => (th.textContent || '').replace(/[▲▼›]/g, '').trim()).filter(Boolean);
const linhas = () => [...document.querySelectorAll('tbody tr:not(.best-detail)')];
const linhaDe = (nome) => linhas().find((tr) => (tr.textContent || '').includes(nome));

const abrir = async (nome) => {
  fireEvent.click(linhaDe(nome));
  // Os catálogos carregam preguiçosamente na primeira expansão.
  await waitFor(() => expect(document.querySelector('.best-secao')).toBeTruthy());
  return document.querySelector('.best-detail');
};

const secao = (det, titulo) => [...det.querySelectorAll('.best-secao')]
  .find((s) => (s.querySelector('.best-secao-titulo') || {}).textContent?.trim() === titulo);
const cardsDe = (det, titulo) => {
  const s = secao(det, titulo);
  expect(s, `seção "${titulo}" não existe`).toBeTruthy();
  return [...s.querySelectorAll('.best-stat')].map((c) => [
    c.querySelector('.best-stat-lbl').textContent.trim(),
    c.querySelector('.best-stat-val').textContent.trim(),
  ]);
};
/* Para os cards cujo VALOR é um ícone (classe, elemento): a classe do glifo e
   o nome acessível. O textContent desses cards é vazio, e é por isso que
   cardsDe() não serve para eles. */
const cardDe = (det, titulo, rotulo) => [...secao(det, titulo).querySelectorAll('.best-stat')]
  .find((c) => c.querySelector('.best-stat-lbl').textContent.trim() === rotulo);
const iconeDe = (det, titulo, rotulo) => {
  const i = cardDe(det, titulo, rotulo).querySelector('.best-stat-val i');
  return i && i.className;
};
const nomeAcessivelDe = (det, titulo, rotulo) =>
  cardDe(det, titulo, rotulo).querySelector('.best-stat-val').getAttribute('aria-label');
const tipDe = (det, titulo, rotulo) =>
  cardDe(det, titulo, rotulo).querySelector('[data-tip]').getAttribute('data-tip');
const valorDe = (det, titulo, rotulo) => {
  const par = cardsDe(det, titulo).find(([l]) => l === rotulo);
  expect(par, `card "${rotulo}" não existe em "${titulo}"`).toBeTruthy();
  return par[1];
};

describe('a tabela guarda só o mínimo', () => {
  it('Nome, Visibilidade, Classe e Estágio — nada mais', async () => {
    stubBanco(); montar();
    await pronta();
    expect(cabecalho()).toEqual(['Nome', 'Visibilidade', 'Classe', 'Estágio']);
  });

  it('as colunas de números saíram', async () => {
    stubBanco(); montar();
    await pronta();
    const cab = cabecalho().join(' ');
    ['EF', 'EH', 'AB', 'DF', 'AR', 'VB', 'PS'].forEach((sigla) => {
      expect(cab, `a sigla ${sigla} devia ter saído do cabeçalho`).not.toMatch(
        new RegExp(`\\b${sigla}\\b`)
      );
    });
  });

  it('e os dois botões continuam na linha', async () => {
    stubBanco(); montar();
    await pronta();
    const tr = linhaDe('Águia');
    expect(tr.querySelector('.ti-eye'), 'botão de ver').toBeTruthy();
    expect(tr.querySelector('.ti-pencil'), 'botão de editar').toBeTruthy();
  });

  it('a Visibilidade mostra o chip, igual às tabelas de NPCs e Lugares', async () => {
    stubBanco(); montar();
    await pronta();
    // criatura_ids tem a 15 (Águia) e nenhuma lista por PJ → todos.
    expect(linhaDe('Águia').querySelector('.diario-vis-chip--todos')).toBeTruthy();
    expect(linhaDe('Águia Real').querySelector('.diario-vis-chip--ninguem')).toBeTruthy();
  });

  /* Sem mesa não há "visibilidade nesta história" para mostrar — a coluna
     aparece sob a mesma condição do olho. */
  it('sem mesa selecionada, a coluna Visibilidade não existe', async () => {
    stubBanco(); montar({ historiaId: null });
    await pronta();
    expect(cabecalho()).toEqual(['Nome', 'Classe', 'Estágio']);
  });
});

describe('as oito seções, na ordem que o usuário ditou', () => {
  it('os subtítulos', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    /* A Águia não tem magia, e o equipamento dela é só arma — as duas seções
       não aparecem. Sobram seis, na mesma ordem. */
    expect([...det.querySelectorAll('.best-secao-titulo')].map((t) => t.textContent.trim()))
      .toEqual([
        'Atributos', 'Informações', 'Características',
        'Habilidades', 'Técnicas de Combate', 'Ataques',
      ]);
  });

  it('a descrição vem antes das seções', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const desc = det.querySelector('.best-desc');
    expect(desc.textContent).toMatch(/ave de rapina/);
    expect(desc.compareDocumentPosition(det.querySelector('.best-secao'))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/* ── Sigla no rótulo, nome inteiro no tooltip ──────────────────────────────
   "Os cards de atributos: Int (tooltip Intelecto)." / "Cards de informações:
   EF (tooltip Energia Física)." (usuário, 17/09/2026)

   As duas seções densas — 7 e 8 cards de um número cada — voltaram à sigla,
   e o nome inteiro migrou para o tooltip. As OUTRAS seções não: Características
   segue com as palavras (Estágio, Elemento, Montaria), e Habilidades/Técnicas/
   Magias/Ataques têm nomes próprios no rótulo. A correção foi dirigida a duas
   seções, não à ficha toda. */
describe('Atributos e Informações usam sigla', () => {
  it('Atributos: as sete siglas, em CAIXA ALTA', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardsDe(det, 'Atributos')).toEqual([
      ['INT', 'i'], ['AUR', '0'], ['CAR', '1'], ['FOR', '0'],
      ['FIS', '0'], ['AGI', '2'], ['PER', '4'],
    ]);
  });

  it('e o tooltip abre a sigla, começando pelo nome inteiro', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    // O nome vem PRIMEIRO: é o que se quer ao parar o mouse num "INT".
    expect(tipDe(det, 'Atributos', 'INT')).toMatch(/^Intelecto/);
    expect(tipDe(det, 'Informações', 'EF')).toMatch(/^Energia Física/);
    // E a explicação continua ali, atrás do nome.
    expect(tipDe(det, 'Atributos', 'INT')).toMatch(/Racioc[íi]nio/);
  });

  /* As seções de nome próprio não ganharam sigla nenhuma. */
  it('Características segue com as palavras', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const rotulos = cardsDe(det, 'Características').map(([l]) => l);
    expect(rotulos).toContain('Estágio');
    expect(rotulos).toContain('Elemento');
    expect(rotulos).toContain('Montaria');
  });
});

describe('Informações', () => {
  it('as oito, com as resistências calculadas', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardsDe(det, 'Informações').map(([l]) => l)).toEqual([
      'EF', 'EH', 'RF', 'RM', 'AR', 'AB', 'DF', 'VB',
    ]);
    // RF = estágio + físico = 1 + 0; RM = estágio + aura = 1 + 0.
    expect(valorDe(det, 'Informações', 'RF'))
      .toBe(String(window.CriaturaFormulas.resistenciaFisica(AGUIA)));
    expect(valorDe(det, 'Informações', 'RM'))
      .toBe(String(window.CriaturaFormulas.resistenciaMagica(AGUIA)));
  });

  /* "Leve = L" (17/09/2026): o valor é a sigla que o banco guarda. Mostrava a
     palavra, com o mapa do editor de catálogo — o usuário preferiu a sigla, e
     aí decodificá-la virou trabalho do tooltip. */
  it('a armadura mostra a sigla "L", e o tooltip decodifica', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(valorDe(det, 'Informações', 'AR')).toBe('L');
    const tip = tipDe(det, 'Informações', 'AR');
    expect(tip).toMatch(/^Armadura/);
    expect(tip, 'o tooltip tem que dizer o que L significa').toMatch(/L leve/i);
  });
});

describe('Características', () => {
  it('Estágio, Peso, Altura, Classe, Elemento, Grupo e Montaria', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    /* "Grupo Pequeno = Pequeno" (17/09/2026): o rótulo do card já diz Grupo,
       e o prefixo no valor gastava metade da caixa repetindo a palavra. */
    /* Classe e Elemento entram com valor VAZIO no texto: o valor deles é um
       ícone (ver o describe de ícones abaixo). A ordem e os outros cinco é o
       que este teste guarda. */
    expect(cardsDe(det, 'Características')).toEqual([
      ['Estágio', '1'], ['Peso', '4'], ['Altura', '0,80'],
      ['Classe', ''], ['Elemento', ''], ['Grupo', 'Pequeno'],
      ['Montaria', 'Não'],
    ]);
  });

  it('"Solitário" não tem prefixo e passa intacto', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    expect(valorDe(det, 'Características', 'Grupo')).toBe('Solitário');
  });

  /* A coluna `altura` nasceu vazia nas ~200 criaturas do catálogo
     (scripts/sql/criaturas-altura-2026-09-17.sql). "—" distingue "não
     preenchida" de "mede zero". */
  it('altura não preenchida vira travessão, não 0', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    expect(valorDe(det, 'Características', 'Altura')).toBe('—');
  });
});

describe('Habilidades e Técnicas: o número é o da batalha', () => {
  it('Habilidades sai do mesmo cálculo que o combate', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const porKey = {};
    HABILIDADES.forEach((h) => { porKey[h.key] = h; });
    const esperado = window.MotorBatalha.habilidadesDaCriaturaCrua(AGUIA, porKey)
      .map((h) => [h.nome, String(h.total)]);
    expect(esperado.length, 'a fixture tem que produzir habilidades').toBeGreaterThan(0);
    expect(cardsDe(det, 'Habilidades')).toEqual(esperado);
  });

  it('Técnicas de Combate também', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const porKey = {};
    TECNICAS.forEach((t) => { porKey[t.key] = t; });
    const esperado = window.MotorBatalha.tecnicasDaCriaturaCrua(AGUIA, porKey)
      .map((t) => [t.nome, String(t.total)]);
    expect(esperado.length).toBeGreaterThan(0);
    expect(cardsDe(det, 'Técnicas de Combate')).toEqual(esperado);
  });
});

describe('Magias: o nível é o ESTÁGIO, não magia_n', () => {
  it('a Águia Real conjura no nível do estágio, não no magia_n', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    const porKey = {};
    MAGIAS.forEach((m) => { porKey[m.key] = m; });
    const esperado = window.MotorBatalha.magiasDaCriaturaCrua(AGUIA_REAL, porKey);
    expect(esperado).toHaveLength(1);
    expect(cardsDe(det, 'Magias')).toEqual([['Relâmpago', String(esperado[0].nivel)]]);
    /* A prova de que não é a coluna abandonada: estágio 6 → nível 5, e
       magia_n é 9. Ver a nota da fixture sobre por que o estágio não é o 18
       da produção. */
    expect(String(esperado[0].nivel)).toBe('5');
    expect(valorDe(det, 'Magias', 'Relâmpago')).not.toBe(String(AGUIA_REAL.magia_n));
  });
});

/* ── Equipamentos é só DEFESA ───────────────────────────────────────────────
   "Cards de equipamentos: são equipamentos de defesa, no caso da Águia não tem
   nenhum." (usuário, 17/09/2026)

   A coluna `equipamento` guarda arma e proteção na MESMA lista — o bico e a
   garra da Águia são itens do grupo Armas. Listá-las aqui, além de em Ataques,
   fazia a Águia parecer equipada com armadura. O discriminador é
   `grupo !== 'Armas'`, o mesmo que criatura-formulas usa (ehArma) para decidir
   o que vira ataque e o que vira absorção/defesa. */
describe('Equipamentos: só as peças de defesa', () => {
  it('a Águia só tem armas, então a seção NÃO APARECE', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(secao(det, 'Equipamentos'), 'seção vazia não deve existir').toBeUndefined();
    // E as armas dela continuam aparecendo — em Ataques, que é onde cabem.
    expect(cardsDe(det, 'Ataques').map(([l]) => l)).toEqual(['Bico', 'Garras']);
  });

  /* Sem esta, a asserção acima passaria também se a seção nunca mostrasse
     nada — e "filtrou as armas" ficaria indistinguível de "está quebrada". */
  it('quem veste armadura E arma mostra só a armadura', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Couraçado');
    expect(cardsDe(det, 'Equipamentos')).toEqual([['Couraça de Placas', 'peito']]);
    expect(cardsDe(det, 'Ataques').map(([l]) => l)).toEqual(['Bico']);
  });

  it('peça cujo slug não está no catálogo fica de fora', async () => {
    /* Sem o item não há como saber se é arma ou proteção, e chutar erraria
       para um dos dois lados. */
    stubBanco({ criaturas: [{ ...AGUIA, equipamento: [{ slot: 'peito', slug: 'fantasma' }] }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(secao(det, 'Equipamentos')).toBeUndefined();
  });
});

describe('Ataques', () => {

  it('Ataques mostra o dano 100% de cada arma', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const porSlug = {};
    ITENS.forEach((i) => { porSlug[i.slug] = i; });
    const esperado = window.CriaturaFormulas.ataquesDaCriatura(AGUIA, porSlug)
      .map((a) => [a.nome, String(a.dano_100)]);
    expect(esperado.length).toBeGreaterThan(0);
    expect(cardsDe(det, 'Ataques')).toEqual(esperado);
  });
});

/* "Se a criatura não possui magia ou equipamentos, não precisa mostrar o
   título e -" (usuário, 17/09/2026). A primeira versão mostrava o subtítulo
   com um travessão embaixo — o exemplo ditado listava Equipamentos e Magias
   sem nada, e eu li aquilo como "a seção aparece vazia". O usuário viu na
   tela e corrigiu. */
describe('seção sem nada não aparece', () => {
  it('a Águia não tem magia, e a seção Magias não existe', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(secao(det, 'Magias')).toBeUndefined();
    // Nem sobrou o travessão solto em lugar nenhum da ficha.
    expect(det.querySelectorAll('.best-secao-vazia')).toHaveLength(0);
  });

  it('e a Águia Real, sem equipamento nem ataque, perde as duas', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    expect(secao(det, 'Equipamentos')).toBeUndefined();
    expect(secao(det, 'Ataques')).toBeUndefined();
    // Mas a Magias dela aparece: ela TEM magia.
    expect(secao(det, 'Magias')).toBeTruthy();
  });

  /* As três primeiras nunca somem: seus cards saem de colunas que existem
     sempre, ainda que vazias (viram "—"). */
  it('Atributos, Informações e Características não somem nunca', async () => {
    stubBanco({ criaturas: [{ id: 99, nome: 'Vazia', tipo: null, estagio: null }] });
    montar();
    await pronta();
    const det = await abrir('Vazia');
    ['Atributos', 'Informações', 'Características'].forEach((t) =>
      expect(secao(det, t), t).toBeTruthy());
  });
});

/* ── Classe e Elemento como ÍCONE ──────────────────────────────────────────
   "Para a classe, use o ícone, para o elemento, use os ícones: fogo =
   ti-flame, ar = ti-tornado, água = ti-droplet, terra = ti-frustum"
   (usuário, 17/09/2026). */
describe('Classe e Elemento são ícone', () => {
  it('a classe reusa o ícone do token do tabuleiro', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    // Animal → ti-horse, o MESMO mapa de ICONE_TIPO_CRIATURA.
    expect(iconeDe(det, 'Características', 'Classe'))
      .toBe('ti ' + window.iconeTipoCriatura('Animal'));
  });

  it('o elemento usa os quatro ícones ditados', async () => {
    const casos = [['Fogo', 'ti-flame'], ['Ar', 'ti-tornado'], ['Água', 'ti-droplet'], ['Terra', 'ti-frustum']];
    for (const [elemento, icone] of casos) {
      stubBanco({ criaturas: [{ ...AGUIA, elemento }] });
      montar();
      await pronta();
      const det = await abrir('Águia');
      expect(iconeDe(det, 'Características', 'Elemento'), elemento).toBe('ti ' + icone);
      cleanup();
    }
  });

  /* A comparação é sem acento: "agua" e "Água" aparecem escritas das duas
     formas em catálogo de jogo. */
  it('acento não atrapalha', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, elemento: 'agua' }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(iconeDe(det, 'Características', 'Elemento')).toBe('ti ti-droplet');
  });

  /* A coluna `elemento` é lista fechada no editor, mas aceita valor fora da
     lista (como qualquer campo de opções). Quem não casa com um dos quatro
     cai na PALAVRA — inventar um ícone seria pior que mostrar o texto.
     Até 18/09/2026 este card lia `subtipo`, que guarda ESPÉCIE ("Cavalo",
     "Goblin") — e por isso mostrava espécie sob o rótulo Elemento. */
  it('valor que não é elemento cai na palavra', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, elemento: 'Etéreo' }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(iconeDe(det, 'Características', 'Elemento')).toBeNull();
    expect(valorDe(det, 'Características', 'Elemento')).toBe('Etéreo');
  });

  it('classe sem ícone mapeado também cai na palavra', async () => {
    // Gigante e Monstro existem no editor e ninguém usa — não têm ícone.
    stubBanco({ criaturas: [{ ...AGUIA, tipo: 'Gigante' }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(iconeDe(det, 'Características', 'Classe')).toBeNull();
    expect(valorDe(det, 'Características', 'Classe')).toBe('Gigante');
  });

  /* Um glifo sem nome é um card ilegível: a palavra tem que estar no tooltip
     (para quem vê) E no aria-label (para quem não vê). */
  it('o ícone carrega a palavra no tooltip e no aria-label', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(tipDe(det, 'Características', 'Classe')).toMatch(/^Animal/);
    expect(nomeAcessivelDe(det, 'Características', 'Classe')).toBe('Animal');
    expect(tipDe(det, 'Características', 'Elemento')).toMatch(/^Ar/);
    expect(nomeAcessivelDe(det, 'Características', 'Elemento')).toBe('Ar');
  });
});

describe('todo card tem tooltip', () => {
  /* Tooltip do projeto, nunca o `title` nativo — a regra vale desde
     tooltip-padrao.test.js. Aqui o que se exige é que TODO card tenha por onde
     abrir um: um card sem explicação é um número sem legenda. */
  it('nenhum card fica sem onMouseEnter', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const cards = [...det.querySelectorAll('.best-stat')];
    expect(cards.length).toBeGreaterThan(20);
    const semTip = cards.filter((c) => !c.querySelector('[data-tip]'));
    expect(semTip.map((c) => c.textContent), 'cards sem tooltip').toEqual([]);
  });

  it('e nenhum usa o title nativo', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(det.querySelectorAll('.best-stat [title]')).toHaveLength(0);
  });

  it('a habilidade explica com a descrição do catálogo', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const card = [...secao(det, 'Habilidades').querySelectorAll('.best-stat')]
      .find((c) => c.textContent.includes('Sentidos'));
    expect(card.querySelector('[data-tip]').getAttribute('data-tip'))
      .toMatch(/Perceber o que escapa/);
  });
});
