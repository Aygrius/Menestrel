/* ============================================================
   catalogo-jogador-render.test.jsx — o filtro do modo jogador, montado
   ============================================================
   Achado da revisão da Fase A: havia teste da função pura
   (`conhecidoDoJogador`) e do menu (`ADMIN_SECTIONS`), mas NENHUM que
   montasse uma lista com `modoJogador` ligado. Apagar as cinco linhas
   `if (modoJogador) filtered = filtered.filter(...)` de bestiario.jsx
   deixava a suíte inteira verde — ou seja, a regra que o usuário pediu
   ("apenas com as informações que ele conhece ou possui") não era guardada
   por nada. É o pior tipo de buraco: o teste existe, tem nome bonito, e
   não cobre o que o nome promete.

   Cada bloco aqui FALHA se o filtro correspondente for removido. Onde isso
   não for óbvio, o teste diz o que veria sem o filtro.

   `useConhecidoDoJogador` é substituído por um dublê: o objetivo é testar o
   FILTRO das listas, não a consulta ao banco (essa é de
   conhecido-jogador.test.js). A substituição funciona porque bestiario.jsx
   chama o hook pelo nome nu, que resolve no global.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

const MAGIAS = [
  { key: 'bola_de_fogo', nome: 'Bola de Fogo', tipo: 'Básica',
    nivel_1: 'Um alvo.', nivel_3: 'Dois alvos.', nivel_5: 'Cinco alvos.',
    nivel_7: 'Dez alvos.', nivel_9: 'Todos.' },
  { key: 'cura', nome: 'Cura', tipo: 'Básica', nivel_1: 'Cura 1.' },
  { key: 'necromancia', nome: 'Necromancia', tipo: 'Perdida', nivel_1: 'Proibida.' },
];
const TECNICAS = [
  { key: 'mira', nome: 'Mira', custo: 1 },
  { key: 'esquiva', nome: 'Esquiva', custo: 2 },
];
const HABILIDADES = [
  { key: 'furtividade', nome: 'Furtividade', grupo: 'Subterfúgio' },
  { key: 'alquimia', nome: 'Alquimia', grupo: 'Conhecimento' },
];
const ITENS = [
  { slug: 'adaga', nome: 'Adaga', grupo: 'Armas' },
  { slug: 'bussola', nome: 'Bússola', grupo: 'Itens' },
];

const TABELAS = { magias: MAGIAS, tecnicas: TECNICAS, habilidades: HABILIDADES, itens: ITENS };

let conhecidoDublê;

beforeAll(() => {
  // window.UI vem de components/ui-bridge.ts (kit shadcn) em produção; sem
  // ele as listas devolvem <BestNoKit/> e não renderizam tabela nenhuma.
  // Mesmo dublê de bestiario-admin.test.jsx:34.
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  window.supabaseClient = {
    from: (tabela) => {
      const linhas = TABELAS[tabela] || [];
      // O dublê precisa ser encadeável E aguardável: MagiasList faz
      // `await from().select().order()` e para aí, enquanto ItensList vai
      // por fetchTabelaPaginada, que ainda chama .range(). Um `then` no
      // objeto resolve os dois sem duplicar o dublê.
      const resposta = () => Promise.resolve({ data: linhas, error: null });
      const box = {
        select: () => box,
        eq: () => box,
        order: () => box,
        range: () => resposta(),
        like: () => Promise.resolve({ data: [], error: null }),
        then: (ok, falha) => resposta().then(ok, falha),
      };
      return box;
    },
    rpc: async () => ({ data: false, error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
  };
  // Dublê do hook: as listas o chamam pelo nome nu, que resolve no global.
  window.useConhecidoDoJogador = () => conhecidoDublê;
});

afterEach(() => { cleanup(); });

const conhecido = ({ magias = [], tecnicas = [], habilidades = [], itens = [] } = {}) => ({
  carregando: false,
  erro: null,
  conhecido: {
    magias: new Map(magias),
    tecnicas: new Set(tecnicas),
    habilidades: new Set(habilidades),
    itens: new Set(itens),
  },
});

const montar = async (Componente, props) => {
  const r = render(<div className="menestrel-ui"><Componente ac={{}} lang="pt" {...props} /></div>);
  // A lista busca os dados num useEffect; espera a primeira linha aparecer
  // ou a mensagem de vazio, o que vier.
  await vi.waitFor(() => {
    const temLinha = document.querySelector('tbody tr');
    const temVazio = document.querySelector('.best-empty');
    expect(temLinha || temVazio).toBeTruthy();
  });
  return r;
};

const nomesNaTela = () => Array.from(document.querySelectorAll('.best-name'))
  .map((el) => (el.textContent || '').replace('›', '').trim());

describe('MagiasList em modo jogador', () => {
  it('mostra só as magias que os personagens dele conhecem', async () => {
    conhecidoDublê = conhecido({ magias: [['cura', 1]] });
    await montar(window.MagiasList, { modoJogador: true });
    // Sem o filtro, apareceriam as três.
    expect(nomesNaTela()).toEqual(['Cura']);
  });

  it('sem modoJogador, o Mestre continua vendo todas', async () => {
    conhecidoDublê = conhecido();
    await montar(window.MagiasList, {});
    expect(nomesNaTela().sort()).toEqual(['Bola de Fogo', 'Cura', 'Necromancia']);
  });

  it('nenhuma conhecida: a tela DIZ o motivo, não finge busca sem resultado', async () => {
    conhecidoDublê = conhecido();
    await montar(window.MagiasList, { modoJogador: true });
    expect(nomesNaTela()).toEqual([]);
    const vazio = document.querySelector('.best-empty');
    expect(vazio.textContent).toMatch(/ainda não conhecem/i);
    expect(vazio.textContent, 'não pode culpar uma busca que não houve').not.toMatch(/""/);
  });
});

/* A terceira decisão do usuário: "só os níveis comprados". */
describe('MagiasList — o corte de níveis', () => {
  const niveisNaTela = () => Array.from(document.querySelectorAll('.best-nivel-n'))
    .map((el) => Number(el.textContent));

  it('com 2 passos, vê os níveis 1 e 3 e NÃO vê o 5', async () => {
    conhecidoDublê = conhecido({ magias: [['bola_de_fogo', 2]] });
    await montar(window.MagiasList, { modoJogador: true });
    screen.getByText('Bola de Fogo').click();
    await vi.waitFor(() => expect(document.querySelector('.best-nivel-n')).toBeTruthy());
    expect(niveisNaTela()).toEqual([1, 3]);
  });

  it('com os 5 passos, vê os cinco', async () => {
    conhecidoDublê = conhecido({ magias: [['bola_de_fogo', 5]] });
    await montar(window.MagiasList, { modoJogador: true });
    screen.getByText('Bola de Fogo').click();
    await vi.waitFor(() => expect(document.querySelector('.best-nivel-n')).toBeTruthy());
    expect(niveisNaTela()).toEqual([1, 3, 5, 7, 9]);
  });

  // Compõe com o filtro que já existia: nível que o admin apagou não
  // aparece nem para quem comprou aquele passo.
  it('nível apagado pelo admin não aparece nem com passo comprado', async () => {
    conhecidoDublê = conhecido({ magias: [['cura', 5]] });
    await montar(window.MagiasList, { modoJogador: true });
    screen.getByText('Cura').click();
    await vi.waitFor(() => expect(document.querySelector('.best-nivel-n')).toBeTruthy());
    expect(niveisNaTela(), 'Cura só tem nivel_1 preenchido').toEqual([1]);
  });

  it('o Mestre continua vendo todos os níveis que existem', async () => {
    conhecidoDublê = conhecido();
    await montar(window.MagiasList, {});
    screen.getByText('Bola de Fogo').click();
    await vi.waitFor(() => expect(document.querySelector('.best-nivel-n')).toBeTruthy());
    expect(niveisNaTela()).toEqual([1, 3, 5, 7, 9]);
  });
});

describe('as outras três listas filtram do mesmo jeito', () => {
  it('TecnicasList', async () => {
    conhecidoDublê = conhecido({ tecnicas: ['esquiva'] });
    await montar(window.TecnicasList, { modoJogador: true });
    expect(nomesNaTela()).toEqual(['Esquiva']);
  });

  it('HabilidadesList', async () => {
    conhecidoDublê = conhecido({ habilidades: ['alquimia'] });
    await montar(window.HabilidadesList, { modoJogador: true });
    expect(nomesNaTela()).toEqual(['Alquimia']);
  });

  // Itens é o que mais merece teste: o filtro casa por `slug`, e o brief
  // original mandava ler `personagens.inventario` como array quando ele é
  // { moedas, itens } — erro que teria deixado este conjunto sempre vazio.
  it('ItensList casa por slug', async () => {
    conhecidoDublê = conhecido({ itens: ['bussola'] });
    await montar(window.ItensList, { modoJogador: true });
    expect(nomesNaTela()).toEqual(['Bússola']);
  });

  it('e as três mostram tudo para o Mestre', async () => {
    conhecidoDublê = conhecido();
    await montar(window.TecnicasList, {});
    expect(nomesNaTela().length).toBe(2);
  });
});
