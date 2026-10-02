/* ============================================================
   menu-submenus.test.jsx — Treinamento, Comércio e Diário (26/09/2026)
   ============================================================
   "Magias, Técnicas e Habilidades vão virar um submenu de Treinamento.
    Magias Básicas, Ancestrais e Perdidas serão submenus de Magias. Técnicas
    Básicas e Especializadas, de Técnicas. Habilidades de Profissão, de
    Influência, etc, de Habilidades. Lugares e NPCs vão ser um submenu de
    Diário. Lugares vai se chamar Reinos; NPCs, Conhecidos. Itens vira
    submenu de Comércio; Armas, Minerais, Consumíveis, etc serão submenus de
    Comércio." (usuário)

   Decisões do usuário no mesmo dia: painel ao lado da barra (ela continua só
   de ícones); Técnica Especializada = a permissão só cita academias/guildas;
   Diário = Reinos + Conhecidos (+ Memórias no Jogador); Comércio = Todos + os
   14 grupos de itens.

   Três camadas guardadas aqui: a ÁRVORE (ADMIN_MENU), o PAINEL que a mostra
   (NavMenuPainel) e o FILTRO que cada folha liga nas listas.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';

const MAGIAS = [
  { key: 'bola', nome: 'Bola de Fogo', tipo: 'Básica', permissao: 'Mago' },
  { key: 'runa', nome: 'Runa Antiga', tipo: 'Ancestral', permissao: 'Mago' },
  { key: 'necro', nome: 'Necromancia', tipo: 'Perdida', permissao: 'Colégio Necromântico' },
  { key: 'ilusao', nome: 'Ilusão', tipo: 'Básica', permissao: 'Colégio Ilusionista' },
  { key: 'cura', nome: 'Cura', tipo: 'Básica', permissao: 'Sacerdote' },
];
const TECNICAS = [
  { key: 'mira', nome: 'Mira', permissao: 'Guerreiro, Rastreador' },
  { key: 'livre', nome: 'Golpe Livre', permissao: null },
  { key: 'lanca', nome: 'Carga de Lança', permissao: 'Academia de Cavaleiros' },
  { key: 'misto', nome: 'Punhal Oculto', permissao: 'Guerreiro, Guilda de Ladrões' },
];
const HABILIDADES = [
  { key: 'furt', nome: 'Furtividade', grupo: 'Subterfúgio' },
  { key: 'alq', nome: 'Alquimia', grupo: 'Conhecimento' },
  { key: 'lab', nome: 'Lábia', grupo: 'Influência' },
];
const ITENS = [
  { slug: 'adaga', nome: 'Adaga', grupo: 'Armas' },
  { slug: 'ferro', nome: 'Ferro', grupo: 'Minerais' },
  { slug: 'bussola', nome: 'Bússola', grupo: 'Itens' },
];
const TABELAS = { magias: MAGIAS, tecnicas: TECNICAS, habilidades: HABILIDADES, itens: ITENS };

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

const grupo = (perfil, id) => window.ADMIN_MENU[perfil].find((n) => n.id === id);
const rotulos = (nos) => nos.map((n) => n.rotulo.pt);

/* ── A árvore ─────────────────────────────────────────────────────────── */
describe('ADMIN_MENU — a árvore', () => {
  it.each(['master', 'player'])('%s: toda folha aponta para uma seção que existe', (perfil) => {
    const ids = new Set(window.ADMIN_SECTIONS[perfil].map((s) => s.id));
    for (const f of window.folhasDoMenu(window.ADMIN_MENU[perfil])) {
      expect(ids.has(f.secao), `folha para "${f.secao}" sem seção no ${perfil}`).toBe(true);
    }
  });

  it.each(['master', 'player'])('%s: nenhum destino visível ficou sem caminho no menu', (perfil) => {
    // As mesmas ocultas do AdminConsole: inventário/loja vivem na ficha.
    const ocultas = ['inventario', 'loja', 'itens_campanha'];
    const noMenu = new Set(window.folhasDoMenu(window.ADMIN_MENU[perfil]).map((f) => f.secao));
    for (const s of window.ADMIN_SECTIONS[perfil]) {
      if (ocultas.includes(s.id)) continue;
      expect(noMenu.has(s.id), `"${s.id}" sumiu do menu do ${perfil}`).toBe(true);
    }
  });

  it('Magias, Técnicas e Habilidades moram em Treinamento — e só lá', () => {
    for (const perfil of ['master', 'player']) {
      const t = grupo(perfil, 'treinamento');
      expect(rotulos(t.filhos)).toEqual(['Magias', 'Técnicas', 'Habilidades']);
      const topo = window.ADMIN_MENU[perfil].filter((n) => n.secao).map((n) => n.secao);
      expect(topo).not.toEqual(expect.arrayContaining(['magias']));
      expect(topo).not.toContain('tecnicas');
      expect(topo).not.toContain('habilidades');
    }
  });

  /* Sem "Todas" (26/09/2026): "você criou um Todas que eu não pedi". Cada
     subgrupo tem só as divisões ditadas, e toda folha filtra. */
  /* Exceção de 29/09/2026: "quero que seja possível clicar em magias e ver
     todas as magias" — Magias, Técnicas e Habilidades são destino sem filtro.
     Continua sem folha chamada "Todas". */
  it('nenhuma folha é "Todas": só Magias, Técnicas e Habilidades abrem sem filtro', () => {
    for (const perfil of ['master', 'player']) {
      for (const id of ['treinamento', 'comercio', 'bestiario']) {
        const folhas = window.folhasDoMenu([grupo(perfil, id)]);
        const semFiltro = folhas.filter((f) => !f.filtro).map((f) => f.rotulo.pt);
        expect(semFiltro, `${perfil}/${id}`).toEqual(id === 'treinamento' ? ['Magias', 'Técnicas', 'Habilidades'] : []);
        expect(folhas.map((f) => f.rotulo.pt)).not.toEqual(expect.arrayContaining(['Todas']));
        expect(folhas.map((f) => f.rotulo.pt)).not.toEqual(expect.arrayContaining(['Todos']));
      }
    }
  });

  it('Magias › Básicas, Ancestrais, Perdidas — com o tipo do banco', () => {
    const magias = grupo('master', 'treinamento').filhos[0];
    expect(rotulos(magias.filhos)).toEqual(['Básicas', 'Ancestrais', 'Perdidas']);
    expect(magias.filhos.map((f) => f.filtro)).toEqual(['Básica', 'Ancestral', 'Perdida']);
  });

  it('Técnicas › Básicas, Especializadas', () => {
    const tec = grupo('master', 'treinamento').filhos[1];
    expect(rotulos(tec.filhos)).toEqual(['Básicas', 'Especializadas']);
  });

  it('Habilidades › os seis grupos do banco', () => {
    const hab = grupo('master', 'treinamento').filhos[2];
    expect(hab.filhos.map((f) => f.filtro)).toEqual(
      ['Profissional', 'Influência', 'Conhecimento', 'Manobra', 'Subterfúgio', 'Geral']);
    // O título da página diz o nome inteiro, como o usuário escreveu.
    expect(hab.filhos[0].titulo.pt).toBe('Habilidades de Profissão');
  });

  /* "Diário" saiu em 26/09/2026 ("remova o submenu Diário"): 13 grupos. */
  it('Comércio › os 13 grupos de itens, sem Diário', () => {
    const c = grupo('master', 'comercio');
    expect(c.filhos).toHaveLength(13);
    expect(c.filhos.map((f) => f.filtro)).not.toContain('Diario');
    expect(c.filhos[0].rotulo.pt).toBe('Armas');
    expect(c.filhos.every((f) => f.secao === 'itens')).toBe(true);
    expect(c.filhos.map((f) => f.filtro).filter(Boolean)).toEqual(expect.arrayContaining(
      ['Armas', 'Armaduras', 'Consumíveis', 'Itens', 'Minerais', 'Moedas']));
    expect(window.ADMIN_MENU.master.some((n) => n.secao === 'itens')).toBe(false);
  });

  /* "Na tabela criaturas, criar um submenu com a classe." (26/09/2026) */
  it('Criaturas › as oito classes do catálogo (Demônio virou Infernal em 28/09/2026), nos dois perfis', () => {
    for (const perfil of ['master', 'player']) {
      const c = grupo(perfil, 'bestiario');
      expect(c.filhos.map((f) => f.filtro)).toEqual(
        ['Animal', 'Celestial', 'Civilizado', 'Dragão', 'Elemental', 'Infernal', 'Místico', 'Morto']);
      expect(c.filhos.every((f) => f.secao === 'criaturas')).toBe(true);
      expect(window.ADMIN_MENU[perfil].some((n) => n.secao === 'criaturas'), 'Criaturas solta no topo').toBe(false);
    }
  });

  it('Diário: Reinos e Conhecidos no Mestre; o Jogador também tem Memórias', () => {
    // Cidades entrou em 26/09/2026 ("adicione um menu novo no diário chamado cidades").
    expect(rotulos(grupo('master', 'diario').filhos)).toEqual(['Reinos', 'Cidades', 'Conhecidos']);
    expect(rotulos(grupo('player', 'diario').filhos)).toEqual(['Reinos', 'Cidades', 'Conhecidos', 'Memórias']);
    expect(window.ADMIN_COPY.pt.sections.lugares.label).toBe('Reinos');
    expect(window.ADMIN_COPY.pt.sections.npcs.label).toBe('Conhecidos');
  });
});

/* ── A regra das técnicas ─────────────────────────────────────────────── */
describe('categoriaTecnica — pela permissão', () => {
  const cat = (permissao) => window.categoriaTecnica({ permissao });
  it('sem restrição é básica', () => { expect(cat(null)).toBe('basica'); expect(cat('')).toBe('basica'); });
  it('só profissões é básica', () => { expect(cat('Guerreiro, Rastreador')).toBe('basica'); });
  it('só academias/guildas é especializada', () => {
    expect(cat('Academia de Cavaleiros')).toBe('especializada');
    expect(cat('Academia de Gladiadores, Guilda de Piratas')).toBe('especializada');
  });
  it('mista (alguma profissão pode) é básica', () => { expect(cat('Guerreiro, Guilda de Ladrões')).toBe('basica'); });
});

/* ── O filtro nas listas ──────────────────────────────────────────────── */
const montar = async (Componente, props) => {
  render(<div className="menestrel-ui"><Componente ac={{}} lang="pt" {...props} /></div>);
  await vi.waitFor(() => expect(document.querySelector('tbody tr') || document.querySelector('.best-empty')).toBeTruthy());
};
const nomes = () => [...document.querySelectorAll('.best-name')].map((el) => el.textContent.replace('›', '').trim()).sort();
const titulo = () => document.querySelector('.fp-card-top .ms-title').textContent;

describe('cada folha filtra a lista', () => {
  it('Magias Básicas', async () => {
    await montar(window.MagiasList, { filtro: 'Básica', titulo: 'Magias Básicas' });
    expect(nomes()).toEqual(['Bola de Fogo', 'Cura', 'Ilusão']);
    expect(titulo()).toBe('Magias Básicas');
  });
  it('Magias sem filtro mostra todas, com o título de sempre', async () => {
    await montar(window.MagiasList, {});
    expect(nomes()).toHaveLength(5);
    expect(titulo()).toBe('Magias');
  });
  it('Técnicas Especializadas', async () => {
    await montar(window.TecnicasList, { filtro: 'especializada' });
    expect(nomes()).toEqual(['Carga de Lança']);
  });
  it('Técnicas Básicas (a mista entra)', async () => {
    await montar(window.TecnicasList, { filtro: 'basica' });
    expect(nomes()).toEqual(['Golpe Livre', 'Mira', 'Punhal Oculto']);
  });
  it('Habilidades de Influência', async () => {
    await montar(window.HabilidadesList, { filtro: 'Influência' });
    expect(nomes()).toEqual(['Lábia']);
  });
  it('Magias Básicas do Mago: a profissão e os Colégios dela', async () => {
    await montar(window.MagiasList, { filtro: 'Básica|Mago' });
    expect(nomes()).toEqual(['Bola de Fogo', 'Ilusão']);
  });
  it('Técnicas Básicas do Guerreiro (a sem permissão vale para todos)', async () => {
    await montar(window.TecnicasList, { filtro: 'basica|Guerreiro' });
    expect(nomes()).toEqual(['Golpe Livre', 'Mira', 'Punhal Oculto']);
  });
  it('Técnicas Especializadas do Guerreiro (as Academias)', async () => {
    await montar(window.TecnicasList, { filtro: 'especializada|Guerreiro' });
    expect(nomes()).toEqual(['Carga de Lança']);
  });
  it('Comércio › Minerais', async () => {
    await montar(window.ItensList, { filtro: 'Minerais', titulo: 'Minerais' });
    expect(nomes()).toEqual(['Ferro']);
    expect(titulo()).toBe('Minerais');
  });
});

/* ── O painel ─────────────────────────────────────────────────────────── */
describe('NavMenuPainel', () => {
  const ancora = { top: 100, right: 64, left: 8, bottom: 140, width: 56, height: 40 };
  const abrir = (perfil, id, extra = {}) => {
    const onEscolher = vi.fn();
    const onFechar = vi.fn();
    render(<window.NavMenuPainel grupo={grupo(perfil, id)} ancora={ancora} lang="pt"
      folhaAtual={null} onEscolher={onEscolher} onFechar={onFechar} {...extra} />);
    return { onEscolher, onFechar };
  };
  const itens = (col) => [...col.querySelectorAll('.mc-menu-item')].map((b) => b.textContent.trim());

  it('Treinamento: a primeira coluna tem os três, a segunda só aparece ao passar em um', () => {
    abrir('master', 'treinamento');
    const cols = () => document.querySelectorAll('.mc-menu-col');
    expect(cols()).toHaveLength(1);
    expect(itens(cols()[0])).toEqual(['Magias', 'Técnicas', 'Habilidades']);
    fireEvent.mouseEnter([...cols()[0].querySelectorAll('.mc-menu-item')][0]);
    expect(cols()).toHaveLength(2);
    expect(itens(cols()[1])).toEqual(['Básicas', 'Ancestrais', 'Perdidas']);
  });

  it('escolher a folha entrega a seção e o filtro', () => {
    const { onEscolher } = abrir('master', 'treinamento');
    fireEvent.mouseEnter(document.querySelector('.mc-menu-item--pai'));
    const perdidas = [...document.querySelectorAll('.mc-menu-col--sub .mc-menu-item')].find((b) => b.textContent.trim() === 'Perdidas');
    fireEvent.click(perdidas);
    expect(onEscolher).toHaveBeenCalledTimes(1);
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ secao: 'magias', filtro: 'Perdida' });
  });

  it('abre já no subgrupo da página atual, com a folha marcada', () => {
    const basicas = grupo('master', 'treinamento').filhos[1].filhos[0];
    abrir('master', 'treinamento', { folhaAtual: basicas });
    const sub = document.querySelector('.mc-menu-col--sub');
    expect(sub.getAttribute('aria-label')).toBe('Técnicas');
    expect(sub.querySelector('.is-atual').textContent.trim()).toBe('Básicas');
  });

  /* "clicar em magias e ver todas as magias, ou passar o mouse e abrir para
     básicas e clicar pra ver só as básicas, e depois das básicas, ter as
     profissões" (usuário, 29/09/2026). Terceira coluna; a profissão conta as
     especializações dela. */
  it('clicar em Magias navega para todas', () => {
    const { onEscolher } = abrir('master', 'treinamento');
    fireEvent.click(document.querySelector('.mc-menu-item--pai'));
    expect(onEscolher).toHaveBeenCalledTimes(1);
    expect(onEscolher.mock.calls[0][0].secao).toBe('magias');
    expect(onEscolher.mock.calls[0][0].filtro).toBeUndefined();
  });

  it('Básicas: clicar navega; passar o mouse abre as profissões', () => {
    const { onEscolher } = abrir('master', 'treinamento');
    fireEvent.mouseEnter(document.querySelector('.mc-menu-item--pai'));
    const basicas = () => [...document.querySelectorAll('.mc-menu-col')[1].querySelectorAll('.mc-menu-item')]
      .find((b) => b.textContent.trim() === 'Básicas');
    fireEvent.mouseEnter(basicas());
    const cols = document.querySelectorAll('.mc-menu-col');
    expect(cols).toHaveLength(3);
    expect(itens(cols[2])).toEqual(['Bardo', 'Mago', 'Rastreador', 'Sacerdote']);
    fireEvent.click([...cols[2].querySelectorAll('.mc-menu-item')][1]);
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ secao: 'magias', filtro: 'Básica|Mago' });
    fireEvent.click(basicas());
    expect(onEscolher.mock.calls[1][0]).toMatchObject({ secao: 'magias', filtro: 'Básica' });
  });

  it('Diário é uma coluna só, de folhas', () => {
    const { onEscolher } = abrir('player', 'diario');
    expect(itens(document.querySelector('.mc-menu-col'))).toEqual(['Reinos', 'Cidades', 'Conhecidos', 'Memórias']);
    fireEvent.click([...document.querySelectorAll('.mc-menu-item')][1]);
    expect(onEscolher.mock.calls[0][0].secao).toBe('cidades');
  });

  it('Escape e clique fora fecham', () => {
    const { onFechar } = abrir('master', 'comercio');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(document.body);
    expect(onFechar).toHaveBeenCalledTimes(2);
  });

  it('clique dentro não fecha', () => {
    const { onFechar } = abrir('master', 'comercio');
    fireEvent.mouseDown(document.querySelector('.mc-menu-col'));
    expect(onFechar).not.toHaveBeenCalled();
  });
});

/* "Nos menus da esquerda, ao clicar, aparece 'treinamento' acima dos menus,
   remova" (usuário, 26/09/2026). */
describe('o painel não tem título', () => {
  it('nem na primeira coluna, nem na segunda', () => {
    render(<window.NavMenuPainel grupo={window.ADMIN_MENU.master.find((n) => n.id === 'treinamento')}
      ancora={{ top: 100, right: 64 }} lang="pt" folhaAtual={null} onEscolher={() => {}} onFechar={() => {}} />);
    fireEvent.mouseEnter(document.querySelector('.mc-menu-item--pai'));
    expect(document.querySelectorAll('.mc-menu-titulo')).toHaveLength(0);
    expect(document.querySelector('.mc-menu-painel').textContent).not.toMatch(/Treinamento/);
  });
});
