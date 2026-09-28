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
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
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

/* "Ao clicar no item da tabela, vai abrir um modal ao invés de expandir"
   (usuário, 26/09/2026). A moldura é a BestDetalheModal, a mesma das tabelas
   de magias, técnicas, habilidades e itens. */
describe('o submenu de classe filtra a tabela', () => {
  it('com filtro Animal, só as criaturas da classe — e o título diz a classe', async () => {
    stubBanco(); montar({ filtro: 'Místico', titulo: 'Místicos' });
    await pronta();
    const nomes = linhas().map((tr) => tr.querySelector('.best-name').textContent.trim());
    expect(nomes).toEqual(['Águia Real']);
    expect(document.querySelector('.fp-card-top .ms-title').textContent).toBe('Místicos');
  });
});

describe('a ficha abre numa janela', () => {
  it('fora da tabela, com o nome no título', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(det.closest('table'), 'a ficha não pode morar dentro da tabela').toBeNull();
    const janela = det.closest('[role="dialog"]');
    expect(janela).toBeTruthy();
    expect(janela.querySelector('.ms-title').textContent).toBe('Águia');
  });

  it('clicar dentro não fecha; o X fecha', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    /* Evento de React atravessa o portal: sem o stopPropagation da janela, o
       clique chegava ao onClick da linha, que a fechava. */
    fireEvent.click(det);
    expect(document.querySelector('.best-detail')).toBeTruthy();
    // O X é o último botão do cabeçalho — antes dele vêm o olho e o lápis (26/09/2026).
    fireEvent.click(document.querySelector('.modal-best-detalhe .ms-close[aria-label="Fechar"]'));
    expect(document.querySelector('.best-detail')).toBeNull();
  });

  it('Escape fecha', async () => {
    stubBanco(); montar();
    await pronta();
    await abrir('Águia');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.best-detail')).toBeNull();
  });
});

/* "Arrume o tooltip para não ser uma linha só" (usuário, 26/09/2026). Era
   white-space: nowrap — a explicação atravessava a tela numa faixa. */
describe('o tooltip dos rótulos quebra linha', () => {
  /* Só Técnicas, Habilidades e Magias têm tooltip desde 26/09/2026 ("não
     precisa de tooltip nos demais itens"); o teste usa uma habilidade. */
  it('o nome da linha em destaque em cima, a explicação embaixo, com largura máxima', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const rot = [...secao(det, 'Habilidades').querySelectorAll('.best-stat-lbl')].find((l) => l.textContent === 'Sentidos');
    fireEvent.mouseEnter(rot);
    const tip = await vi.waitFor(() => {
      const t = document.querySelector('[role="tooltip"]');
      expect(t).toBeTruthy();
      return t;
    });
    expect(tip.style.whiteSpace).toBe('normal');
    expect(tip.style.maxWidth).toBe('280px');
    const [nome, explicacao] = [...tip.children].filter((c) => c.textContent);
    expect(nome.textContent).toBe('Sentidos');
    expect(explicacao.textContent).toBe('Perceber o que escapa aos outros.');
  });
});

describe('a tabela guarda só o mínimo', () => {
  // Subtipo, Elemento e Plano voltaram em 25/09/2026 (pedido do usuário).
  // Visibilidade saiu em 25/09/2026 ("Remova a coluna visibilidade"); o olho fica.
  /* SÓ O NOME desde 26/09/2026: "em todas as tabelas de itens, magias, etc,
     remova as colunas e deixe apenas o nome e o botão de editar". Classe virou
     o submenu; subtipo, elemento, plano e estágio foram para a janela. */
  it('só a coluna Nome — e os botões', async () => {
    stubBanco(); montar();
    await pronta();
    expect(cabecalho()).toEqual(['Nome']);
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

  /* Os dois botões saíram da linha em 26/09/2026 e foram para o cabeçalho da
     janela, ao lado do X (ver criatura-permissao-olho.test.jsx). */
  it('a linha não tem mais botões', async () => {
    stubBanco(); montar();
    await pronta();
    const tr = linhaDe('Águia');
    // Botões, não ícones: o olho de VISIBILIDADE ao lado do nome é um ícone só.
    expect(tr.querySelector('button .ti-eye'), 'botão de ver').toBeNull();
    expect(tr.querySelector('button .ti-pencil'), 'botão de editar').toBeNull();
  });

  it('sem mesa selecionada, a coluna Visibilidade não existe', async () => {
    stubBanco(); montar({ historiaId: null });
    await pronta();
    expect(cabecalho()).toEqual(['Nome']);
  });
});

describe('as oito seções, na ordem que o usuário ditou', () => {
  it('os subtítulos', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    /* A Águia não tem magia, e o equipamento dela é só arma — as duas seções
       não aparecem. Sobram seis, na ordem de 25/09/2026 — depois da
       Descrição, que ganhou título em 26/09/2026. */
    expect([...det.querySelectorAll('.best-secao-titulo')].map((t) => t.textContent.trim()))
      .toEqual([
        'Descrição',
        'Características', 'Atributos', 'Informações',
        'Técnicas de Combate', 'Habilidades', 'Ataques',
      ]);
  });

  /* "Eu quero três colunas: Características - Atributos - Informações. O
     restante das informações não precisa ser card, quero que seja listas com
     quatro colunas: Técnicas de Combate - Habilidades - Ataques - Magias."
     (usuário, 25/09/2026). Equipamentos: lista de largura cheia, embaixo. */
  /* Sem mini-cards desde 26/09/2026 ("remova o minicard dentro de criaturas
     e transforme em listas"): o topo mantém as três colunas, mas cada uma é
     lista nome · valor, igual às de baixo. */
  it('topo com três seções em lista; embaixo, listas', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    const titulos = (sel) => [...det.querySelectorAll(sel + ' .best-secao-titulo')].map((t) => t.textContent.trim());
    expect(titulos('.best-ficha-topo')).toEqual(['Características', 'Atributos', 'Informações']);
    const doTopo = [...det.querySelectorAll('.best-ficha-topo .best-stat')];
    expect(doTopo.length).toBeGreaterThan(0);
    doTopo.forEach((li) => {
      expect(li.tagName).toBe('LI');
      expect(li.classList.contains('best-stat--linha')).toBe(true);
    });
    expect(det.querySelector('.best-ficha-topo .best-detail-stats'), 'sobrou mini-card no topo').toBeNull();
    // A Águia Real tem magia e não tem ataque: a coluna Ataques some.
    expect(titulos('.best-ficha-listas')).toEqual(['Técnicas de Combate', 'Habilidades', 'Magias']
      .filter((t) => secao(det, t)));
    det.querySelectorAll('.best-ficha-listas .best-stat').forEach((li) => {
      expect(li.tagName).toBe('LI');
      expect(li.classList.contains('best-stat--linha')).toBe(true);
    });
  });

  it('Equipamentos vira lista de largura cheia, depois das quatro colunas', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Couraçado');
    const eq = secao(det, 'Equipamentos');
    expect(eq, 'seção Equipamentos').toBeTruthy();
    expect(eq.closest('.best-ficha-extra')).toBeTruthy();
    expect(eq.querySelector('ul.best-lista li.best-stat--linha')).toBeTruthy();
  });

  it('a descrição vem antes das seções', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    // A descrição é a PRIMEIRA seção, com o título "Descrição" (26/09/2026).
    const primeira = det.querySelector('.best-secao');
    expect(primeira.classList.contains('best-secao--descricao')).toBe(true);
    expect(primeira.querySelector('.best-secao-titulo').textContent).toBe('Descrição');
    expect(primeira.querySelector('.best-desc').textContent).toMatch(/ave de rapina/);
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
/* POR EXTENSO (26/09/2026): "INT o nome por extenso 'Intelecto'. EH =
   Energia Heroica." De 17/09 até aqui o rótulo era a sigla, com o nome no
   tooltip; agora o rótulo é o nome e o tooltip fica só com a explicação. */
describe('Atributos e Informações por extenso', () => {
  it('Atributos: os sete nomes inteiros', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardsDe(det, 'Atributos')).toEqual([
      ['Intelecto', 'i'], ['Aura', '0'], ['Carisma', '1'], ['Força', '0'],
      ['Físico', '0'], ['Agilidade', '2'], ['Percepção', '4'],
    ]);
  });

  it('sem tooltip (26/09/2026: só Técnicas, Habilidades e Magias têm)', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardDe(det, 'Atributos', 'Intelecto').querySelector('[data-tip]')).toBeNull();
    expect(cardDe(det, 'Informações', 'Energia Heroica').querySelector('[data-tip]')).toBeNull();
  });

  it('nenhuma sigla sobrou como rótulo', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    const rotulos = [...cardsDe(det, 'Atributos'), ...cardsDe(det, 'Informações')].map(([l]) => l);
    for (const sigla of ['INT', 'AUR', 'CAR', 'FOR', 'FIS', 'AGI', 'PER', 'EF', 'EH', 'RF', 'RM', 'AR', 'AB', 'DF', 'VB']) {
      expect(rotulos).not.toContain(sigla);
    }
  });
});

describe('Informações', () => {
  it('as sete, com as resistências calculadas — Defesa mora dentro de Armadura', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardsDe(det, 'Informações').map(([l]) => l)).toEqual([
      // Estágio abre Informações desde 26/09/2026 ("fica junto com informações").
      'Estágio', 'Energia Física', 'Energia Heroica', 'Resistência Física', 'Resistência Mágica',
      'Armadura', 'Absorção', 'Velocidade',
    ]);
    // RF = estágio + físico = 1 + 0; RM = estágio + aura = 1 + 0.
    expect(valorDe(det, 'Informações', 'Resistência Física'))
      .toBe(String(window.CriaturaFormulas.resistenciaFisica(AGUIA)));
    expect(valorDe(det, 'Informações', 'Resistência Mágica'))
      .toBe(String(window.CriaturaFormulas.resistenciaMagica(AGUIA)));
  });

  /* "A Armadura é L2, (Armadura + Defesa)" (usuário, 26/09/2026). */
  it('a armadura é a sigla colada à defesa: "L2"', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(valorDe(det, 'Informações', 'Armadura')).toBe('L2');
    // Sem tooltip desde 26/09/2026.
    expect(cardDe(det, 'Informações', 'Armadura').querySelector('[data-tip]')).toBeNull();
  });

  it('defesa negativa fica "L-1"; armadura vazia conta como L', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, armadura: null, defesa: -1 }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(valorDe(det, 'Informações', 'Armadura')).toBe('L-1');
  });
});

describe('Características', () => {
  /* 26/09/2026: "4kg" ao invés de "4", altura "0,80m", Classe, Elemento,
     Grupo e Montaria por extenso. Grupo continua sem o prefixo "Grupo "
     (17/09/2026: "Grupo Pequeno = Pequeno"). */
  it('Estágio, Peso, Altura, Classe, Elemento, Grupo e Montaria', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    expect(cardsDe(det, 'Características')).toEqual([
      // Estágio foi para Informações em 26/09/2026.
      ['Peso', '4kg'], ['Altura', '0,80m'],
      // Subtipo e Plano vieram da tabela (26/09/2026). A Águia não tem subtipo.
      ['Classe', 'Animal'], ['Subtipo', '—'], ['Elemento', 'Ar'], ['Plano', 'Material'],
      ['Grupo', 'Pequeno'], ['Montaria', 'Não'],
    ]);
  });

  it('"Solitário" passa intacto', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia Real');
    expect(valorDe(det, 'Características', 'Grupo')).toBe('Solitário');
  });

  it('montaria que pode ser montada diz Sim', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, montaria: true }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(valorDe(det, 'Características', 'Montaria')).toBe('Sim');
  });

  it('peso fracionado usa vírgula: 0,5kg', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, peso: 0.5 }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(valorDe(det, 'Características', 'Peso')).toBe('0,5kg');
  });

  /* A coluna `altura` nasceu vazia nas ~200 criaturas do catálogo
     (scripts/sql/criaturas-altura-2026-09-17.sql). "—" distingue "não
     preenchida" de "mede zero" — e sem unidade: "—m" não diz nada. */
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

/* ── Classe e Elemento por extenso ───────────────────────────────────────
   De 17/09/2026 até 26/09/2026 eram ícones ("para a classe, use o ícone, para
   o elemento, use os ícones"). Voltaram à palavra: "Classe o nome por
   extenso. Elemento o nome por extenso." */
describe('Classe e Elemento por extenso', () => {
  it('sem glifo no valor: a palavra que o banco guarda', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, elemento: 'Fogo, Luz' }] });
    montar();
    await pronta();
    const det = await abrir('Águia');
    expect(iconeDe(det, 'Características', 'Classe')).toBeNull();
    expect(iconeDe(det, 'Características', 'Elemento')).toBeNull();
    expect(valorDe(det, 'Características', 'Classe')).toBe('Animal');
    expect(valorDe(det, 'Características', 'Elemento')).toBe('Fogo, Luz');
  });
});

/* "Não precisa de tooltip nos demais itens" (usuário, 26/09/2026): só as
   linhas de Técnicas, Habilidades e Magias explicam o que são. */
describe('tooltip só em Técnicas, Habilidades e Magias', () => {
  it('as outras seções não têm', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    for (const t of ['Características', 'Atributos', 'Informações', 'Ataques']) {
      expect(secao(det, t).querySelectorAll('[data-tip]'), t).toHaveLength(0);
    }
  });

  it('Técnicas e Habilidades têm, em toda linha', async () => {
    stubBanco(); montar();
    await pronta();
    const det = await abrir('Águia');
    for (const t of ['Técnicas de Combate', 'Habilidades']) {
      const linhas = [...secao(det, t).querySelectorAll('.best-stat')];
      expect(linhas.length, t).toBeGreaterThan(0);
      expect(linhas.filter((c) => !c.querySelector('[data-tip]')), t).toEqual([]);
    }
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

/* Patente pelo estágio ao lado do nome (25/09/2026). */
/* A patente (C, B, A, S… pelo estágio) saiu em 26/09/2026: "pode remover
   aqueles ícones de C,A,B,S das criaturas". No lugar, o ícone de quem pode ver
   (criatura-permissao-olho.test.jsx). */
describe('a tabela não mostra mais a patente', () => {
  it('nenhum hexágono de estágio no nome', async () => {
    stubBanco(); montar();
    await pronta();
    expect(linhaDe('Águia').querySelector('.best-patente, [class*="ti-hexagon"]')).toBeNull();
  });
});

/* "A barra de busca de criaturas filtra por nome, classe, subtipo, elemento,
   montaria e plano." (usuário, 26/09/2026) — sem acento e sem caixa. */
describe('a busca de criaturas olha além do nome', () => {
  const buscar = (txt) => fireEvent.change(document.querySelector('.fp-card-top input[type="search"]'), { target: { value: txt } });
  const nomes = () => linhas().map((tr) => tr.querySelector('.best-name').textContent.trim()).sort();

  it('pela classe, sem acento', async () => {
    stubBanco(); montar();
    await pronta();
    buscar('mistico');
    expect(nomes()).toEqual(['Águia Real']);
  });

  it('pelo elemento e pelo plano', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, elemento: 'Ar' }, { ...AGUIA_REAL, elemento: 'Fogo', plano: 'Elemental' }] });
    montar();
    await pronta();
    buscar('fogo');
    expect(nomes()).toEqual(['Águia Real']);
    buscar('elemental');
    expect(nomes()).toEqual(['Águia Real']);
  });

  it('pelo subtipo, e "montaria" acha as que podem ser montadas', async () => {
    stubBanco({ criaturas: [{ ...AGUIA, subtipo: 'Ave' }, { ...AGUIA_REAL, montaria: true }] });
    montar();
    await pronta();
    buscar('ave');
    expect(nomes()).toEqual(['Águia']);
    buscar('montaria');
    expect(nomes()).toEqual(['Águia Real']);
  });
});
