/* ============================================================
   lojas-das-cidades.test.jsx — a loja de cada cidade
   ============================================================
   "Para cada cidade do sistema, haverá uma loja aberta com itens à venda de
   forma fixa" (usuário, 28/10/2026). Desde 30/10/2026 a loja nasce vazia e
   o Mestre monta o estoque à mão — o "pela economia da cidade" saiu.

   E, no mesmo dia, o relato que trouxe este arquivo: "Ao clicar em 'lojas das
   cidades' aparece a mensagem 'Toda cidade desta aventura já tem loja.' e eu
   não consigo escolher a loja para ver os itens."

   Nenhum teste cobria a AÇÃO — só a regra pura por trás dela. Aqui o
   componente de verdade é montado com um supabase falso e o botão é clicado,
   que é a única forma de ver o que o Mestre vê.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './historias.jsx';
import './estoque-mestre.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let View;
beforeAll(() => {
  View = window.EstoqueMestreView;
  expect(View, 'EstoqueMestreView precisa estar no window').toBeTypeOf('function');
  window.UI = {
    ...window.UI,
    Table: 'table', TableHeader: 'thead', TableBody: 'tbody',
    TableRow: 'tr', TableHead: 'th', TableCell: 'td',
    Input: (props) => <input {...props} />,
  };
});
const stubOriginal = globalThis.supabaseClient;
const fetchOriginal = globalThis.fetchCatalogoCompleto;
afterEach(() => {
  cleanup();
  globalThis.supabaseClient = stubOriginal;
  globalThis.fetchCatalogoCompleto = fetchOriginal;
  window.fetchCatalogoCompleto = fetchOriginal;
});

// Catálogo magro: só o bastante para a base e um tema.
const CATALOGO = [
  ...['racao', 'agua', 'corda_material', 'pederneira', 'oleo', 'cantil', 'mochila', 'saco']
    .map((slug) => ({ id: slug, slug, nome: slug, grupo: 'Consumíveis', valor_latao: 10 })),
  { id: 'est', slug: 'estalagem_popular', nome: 'Diária', grupo: 'Serviços', valor_latao: 50 },
  { id: 'fe', slug: 'ferro', nome: 'Ferro', grupo: 'Minerais', valor_latao: 300 },
  { id: 'ca', slug: 'carvao', nome: 'Carvão', grupo: 'Minerais', valor_latao: 20 },
];

const CIDADES = [
  { nome: 'Crássia', populacao: 16000, historia_id: 13,
    economia: 'A prosperidade de Crássia depende da extração e do processamento do bronze, que abastece as grandes forjas da capital.' },
  { nome: 'Deiamon', populacao: 0, historia_id: 13,
    economia: 'Sem habitantes ou atividades comerciais regulares. Sua riqueza permanece enterrada sob os escombros, na forma de depósitos minerais.' },
  { nome: 'Carom', populacao: 7000, historia_id: 13,
    economia: 'Carom é um grande centro pesqueiro, abastecendo o reino com peixes de água doce.' },
];

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado', mestre_id: 'u1',
  // "Montes Crássios" é LUGAR e não cidade: não ganha loja, e está certo.
  lugares: ['Crássia', 'Montes Crássios', 'Deiamon', 'Carom'],
  estoque_loja: { comercios: [{ id: 'legado', nome: 'Estoque', ativo: true, itens: [] }], editando_em: null },
};

function montar(over = {}) {
  const { cidades = CIDADES, reinos = [], ...resto } = over;
  const historia = { ...HISTORIA, ...resto };
  const tabelas = {
    __authUserId: 'u1',
    historias: [{ id: 13, mestre_id: 'u1', estoque_loja: historia.estoque_loja }],
    cidades,
    reinos,
    anuncios_loja: [],
    __updates: [],
  };
  globalThis.supabaseClient = fakeSupabase(tabelas);
  const cat = async () => ({ data: CATALOGO, error: null });
  globalThis.fetchCatalogoCompleto = cat;
  window.fetchCatalogoCompleto = cat;
  const r = render(<View historia={historia} lang="pt" onChanged={() => {}} />);
  return { ...r, tabelas };
}

const botao = (re) => [...document.querySelectorAll('button')]
  .find((b) => re.test(b.textContent || '') || re.test(b.getAttribute('aria-label') || ''));
const recado = () => document.querySelector('.estoque-recado');

/* ── TODA CIDADE E TODO REINO TÊM LOJA, FIXA (30/10/2026) ─────────────────
   "Crie uma 'loja' para cada cidade e reino cadastrados no sistema, essas
   lojas são fixas e não podem ser excluídas." (usuário) · nascem VAZIAS
   (escolha do usuário na mesma conversa).

   Saiu junto a lista "Nova loja" de 29/10: não sobra cidade sem loja para
   ela oferecer. */
describe('as lojas fixas de cidade e reino', () => {
  const lugaresDasLojas = (t) => t.historias[0].estoque_loja.comercios.map((c) => c.lugar || c.nome);

  it('ao abrir, as que faltam nascem vazias — cidade e reino, sem a ruína', async () => {
    const { tabelas } = montar({ reinos: [{ nome: 'Abadom', historia_id: null }] });
    await waitFor(() => expect(lugaresDasLojas(tabelas)).toEqual(['Estoque', 'Abadom', 'Carom', 'Crássia']));
    const novas = tabelas.historias[0].estoque_loja.comercios.slice(1);
    novas.forEach((c) => expect(c).toMatchObject({ nome: c.lugar, ativo: true, itens: [] }));
    // Deiamon está em ruínas (população 0): não tem quem venda.
    expect(lugaresDasLojas(tabelas)).not.toContain('Deiamon');
  });

  it('não recria a que já existe, nem com o acento diferente', async () => {
    const { tabelas } = montar({
      estoque_loja: { comercios: [
        { id: 'c1', nome: 'Crassia', lugar: 'Crassia', ativo: true, itens: [{ slug: 'ferro', entryId: 'e1', estoque: 3 }] },
      ], editando_em: null },
    });
    await waitFor(() => expect(lugaresDasLojas(tabelas)).toEqual(['Crassia', 'Carom']));
    // A que existia ficou intacta, com o estoque dela.
    expect(tabelas.historias[0].estoque_loja.comercios[0].itens).toHaveLength(1);
  });

  it('a loja de cidade não tem "Excluir"; a loja sem cidade continua tendo', async () => {
    montar({
      cidades: [CIDADES[0]],
      estoque_loja: { comercios: [
        { id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true, itens: [] },
        { id: 'legado', nome: 'Estoque', ativo: true, itens: [] },
      ], editando_em: null },
    });
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    // Espera o catálogo de lugares chegar: antes dele, nenhum dos dois mostra o botão.
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja .select-pill-btn').textContent).toMatch(/Crássia/));
    expect(botao(/Excluir esta loja/)).toBeFalsy();

    fireEvent.click(document.querySelector('.estoque-seletor-loja .select-pill-btn'));
    fireEvent.click([...document.querySelectorAll('.select-pill-drop li')].find((l) => l.textContent.includes('Estoque')));
    await waitFor(() => expect(botao(/Excluir esta loja/)).toBeTruthy());
  });

  /* 31/10/2026, usuário: "vejo que a loja Deiamon tem a exclusão habilitada".
     Ruína não ganha loja nova, mas a que já existe é de cidade: não se exclui. */
  it('a loja de uma ruína que já existe também não tem "Excluir"', async () => {
    montar({
      cidades: [CIDADES[1]],
      estoque_loja: { comercios: [
        { id: 'd1', nome: 'Deiamon', lugar: 'Deiamon', ativo: true, itens: [] },
      ], editando_em: null },
    });
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja .select-pill-btn').textContent).toMatch(/Deiamon/));
    // Dá tempo de o catálogo de lugares chegar antes de afirmar a ausência.
    await new Promise((r) => setTimeout(r, 50));
    expect(botao(/Excluir esta loja/)).toBeFalsy();
  });

  /* 31/10/2026, usuário: "O botão da loja aberta ou fechada pode ser um botão
     parecido com o seletor de quantidade, mas em pílula com Sim ou Não". */
  it('Aberta é uma pílula Sim | Não, e Não fecha a loja', async () => {
    const { tabelas } = montar({
      cidades: [CIDADES[1]],
      estoque_loja: { comercios: [
        { id: 'd1', nome: 'Deiamon', lugar: 'Deiamon', ativo: true, itens: [] },
      ], editando_em: null },
    });
    await waitFor(() => expect(document.querySelector('.estoque-sim-nao')).toBeTruthy());
    const ops = [...document.querySelectorAll('.estoque-sim-nao [role="radio"]')];
    expect(ops.map((b) => [b.textContent, b.getAttribute('aria-checked')])).toEqual([['Sim', 'true'], ['Não', 'false']]);
    // Sem o ícone da loja ao lado do nome.
    expect(document.querySelector('.estoque-painel-corpo .loja-painel-ic')).toBeNull();
    fireEvent.click(ops[1]);
    await waitFor(() => expect(tabelas.historias[0].estoque_loja.comercios[0].ativo).toBe(false));
  });

  it('o "Nova loja" e o "Lojas das cidades" não existem mais', async () => {
    const { tabelas } = montar();
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    // Espera as lojas fixas gravarem: sem isso a gravação cai depois do
    // afterEach, já no supabase que recusa rede.
    await waitFor(() => expect(lugaresDasLojas(tabelas)).toContain('Crássia'));
    expect(document.querySelector('.estoque-nova-loja')).toBeNull();
    expect(botao(/Lojas das cidades/)).toBeFalsy();
  });
});

describe('as regras puras das lojas fixas', () => {
  it('cidade e reino de mesmo nome dividem a loja; a lista sai em ordem', () => {
    expect(window.lugaresComLoja([{ nome: 'Saravossa' }, { nome: 'Abrasil' }], [{ nome: 'saravossa' }, { nome: 'Abadom' }]))
      .toEqual(['Abadom', 'Abrasil', 'Saravossa']);
  });
  it('lojaEhFixa reconhece o lugar sem acento e sem caixa; sem lugar, não', () => {
    expect(window.lojaEhFixa({ lugar: 'CRASSIA' }, ['Crássia'])).toBe(true);
    expect(window.lojaEhFixa({ nome: 'Estoque' }, ['Crássia'])).toBe(false);
  });
});

/* ── ESCOLHER A LOJA (28/10/2026) ─────────────────────────────────────────
   "Não consigo escolher a loja para ver os itens." O seletor é o SelectPill,
   e o teste abre e escolhe como o Mestre abre e escolhe. */
describe('o seletor de loja do trilho', () => {
  /* A FORMA DE VERDADE DO BANCO (28/10/2026): dez lojas, a primeira é a
     legada sem cidade. É a lista que o usuário tinha na tela quando disse
     "não consigo escolher a loja". */
  it('lista as dez lojas do banco, a legada inclusive', async () => {
    const nomes = ['Abrasil', 'Saupami', 'Saravossa', 'Bassani', 'Ilha dos Corvos',
      'Sula', 'Cidade Dourada', 'Farzelo', 'Haafel'];
    montar({ cidades: [],
      estoque_loja: {
        comercios: [
          { id: 'legado', nome: 'Estoque', ativo: true, itens: [] },
          ...nomes.map((n, i) => ({ id: 'c' + i, nome: n, lugar: n, ativo: true,
            itens: [{ slug: 'ferro', entryId: 'e' + i, estoque: null, preco_latao_override: null }] })),
        ],
        editando_em: null,
      },
    });
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    fireEvent.click(document.querySelector('.estoque-seletor-loja .select-pill-btn'));
    const opcoes = [...document.querySelectorAll('.select-pill-drop li')].map((l) => l.textContent.trim());
    expect(opcoes).toEqual(['Estoque', ...nomes]);
    const haafel = [...document.querySelectorAll('.select-pill-drop li')]
      .find((l) => l.textContent.includes('Haafel'));
    fireEvent.click(haafel);
    await waitFor(() => {
      expect(document.querySelector('.estoque-seletor-loja .select-pill-btn').textContent).toMatch(/Haafel/);
    });
  });

  /* ── O SELETOR NÃO PODE SUMIR (28/10/2026) ──────────────────────────────
     "Mas a lista suspensa não aparece." (usuário) — e a única forma de isso
     acontecer com dez comércios na mão era `window.SelectPill` ausente na
     hora do render: a condição `&& SelectPill` apagava a porta de entrada do
     estoque em silêncio. Sem o dropdown do sistema, entra um <select>. */
  it('sem o SelectPill no window, o Mestre ainda escolhe a loja', async () => {
    const guardado = window.SelectPill;
    try {
      window.SelectPill = undefined;
      montar({ cidades: [],
        estoque_loja: {
          comercios: [
            { id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true, itens: [] },
            { id: 'c2', nome: 'Carom', lugar: 'Carom', ativo: true, itens: [] },
          ],
          editando_em: null,
        },
      });
      await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
      const nativo = document.querySelector('.estoque-seletor-nativo');
      expect(nativo, 'faltou o seletor de reserva').toBeTruthy();
      expect([...nativo.options].map((o) => o.textContent)).toEqual(['Crássia', 'Carom']);
      fireEvent.change(nativo, { target: { value: 'c2' } });
      await waitFor(() => expect(document.querySelector('.estoque-seletor-nativo').value).toBe('c2'));
    } finally {
      window.SelectPill = guardado;
    }
  });

  it('lista as lojas e trocar nele troca o estoque mostrado', async () => {
    montar({ cidades: [],
      lugares: ['Crássia'],
      estoque_loja: {
        comercios: [
          { id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true,
            itens: [{ slug: 'ferro', entryId: 'e1', estoque: null, preco_latao_override: null }] },
          { id: 'c2', nome: 'Carom', lugar: 'Carom', ativo: true,
            itens: [{ slug: 'carvao', entryId: 'e2', estoque: null, preco_latao_override: null }] },
        ],
        editando_em: null,
      },
    });
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    const pill = document.querySelector('.estoque-seletor-loja .select-pill-btn');
    expect(pill.textContent).toMatch(/Crássia/);

    fireEvent.click(pill);
    const opcoes = [...document.querySelectorAll('.select-pill-drop li')].map((l) => l.textContent.trim());
    expect(opcoes).toEqual(['Crássia', 'Carom']);

    const carom = [...document.querySelectorAll('.select-pill-drop li')]
      .find((l) => l.textContent.includes('Carom'));
    fireEvent.click(carom);
    await waitFor(() => {
      expect(document.querySelector('.estoque-seletor-loja .select-pill-btn').textContent).toMatch(/Carom/);
    });
  });
});
