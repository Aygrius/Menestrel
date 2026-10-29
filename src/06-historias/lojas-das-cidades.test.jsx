/* ============================================================
   lojas-das-cidades.test.jsx — o botão que abre a loja de cada cidade
   ============================================================
   "Para cada cidade do sistema, haverá uma loja aberta com itens à venda de
   forma fixa" (usuário, 28/10/2026) · a lista sai "pela economia da cidade"
   (01-core/lojas-cidade.jsx).

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
import '../01-core/lojas-cidade.jsx';
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
  const historia = { ...HISTORIA, ...over };
  const tabelas = {
    __authUserId: 'u1',
    historias: [{ id: 13, mestre_id: 'u1', estoque_loja: historia.estoque_loja }],
    cidades: CIDADES,
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

describe('o botão "Lojas das cidades"', () => {
  it('abre uma loja por cidade da aventura, pulando o que não é cidade e a ruína', async () => {
    const { tabelas } = montar();
    await waitFor(() => expect(botao(/Lojas das cidades/)).toBeTruthy());
    await waitFor(() => expect(botao(/Lojas das cidades/).disabled).toBe(false));
    fireEvent.click(botao(/Lojas das cidades/));

    await waitFor(() => expect(recado()).toBeTruthy());
    /* Crássia e Carom entram; "Montes Crássios" não é cidade e Deiamon está
       em ruínas (população 0). */
    expect(recado().textContent).toMatch(/2 loja\(s\) aberta\(s\)/);

    /* O que foi GRAVADO: a linha da história no banco falso. */
    const comercios = tabelas.historias[0].estoque_loja.comercios;
    expect(comercios.map((c) => c.lugar || c.nome)).toEqual(['Estoque', 'Crássia', 'Carom']);
    // "De forma fixa": estoque ilimitado em tudo o que a regra põe na vitrine.
    const crassia = comercios.find((c) => c.lugar === 'Crássia');
    expect(crassia.itens.length).toBeGreaterThan(0);
    expect(crassia.itens.every((e) => e.estoque === null)).toBe(true);
    expect(crassia.itens.map((e) => e.slug)).toContain('ferro');
    // O seletor passa a listar as três, e abre na primeira que nasceu.
    await waitFor(() => {
      expect(document.querySelector('.estoque-seletor-loja .select-pill-btn').textContent)
        .toMatch(/Crássia/);
    });
  });

  /* ── A MENSAGEM ERRADA (28/10/2026) ──────────────────────────────────────
     "Aparece a mensagem 'Toda cidade desta aventura já tem loja.'" — e não
     tinha. A primeira volta dizia isso em TRÊS casos diferentes: todas já
     terem loja, nenhum lugar ser cidade do catálogo, e todas as cidades
     serem ruína. Uma mensagem que mente sobre o motivo é pior que nenhuma,
     porque manda o Mestre procurar o problema no lugar errado. */
  it('nenhum lugar é cidade: diz isso, e não que já existe loja', async () => {
    montar({ lugares: ['Montes Crássios', 'Deserto do Real'] });
    await waitFor(() => expect(botao(/Lojas das cidades/)?.disabled).toBe(false));
    fireEvent.click(botao(/Lojas das cidades/));
    await waitFor(() => expect(recado()).toBeTruthy());
    expect(recado().textContent).toMatch(/nenhum lugar.*é cidade do catálogo/i);
    expect(recado().textContent).not.toMatch(/já exist/i);
  });

  it('todas em ruínas: diz que não há cidade habitada', async () => {
    montar({ lugares: ['Deiamon'] });
    await waitFor(() => expect(botao(/Lojas das cidades/)?.disabled).toBe(false));
    fireEvent.click(botao(/Lojas das cidades/));
    await waitFor(() => expect(recado()).toBeTruthy());
    expect(recado().textContent).toMatch(/nenhuma cidade habitada/i);
  });

  /* ── JÁ EXISTIREM NÃO É RECADO (28/10/2026) ────────────────────────────
     "Remova o texto 'As 9 loja(s) de cidade já existem — escolha no seletor
     ao lado'." (usuário)

     A frase nasceu quando o seletor estava fora da tela (transbordo do trilho
     centralizado) e o Mestre não achava as lojas. Consertado o trilho, ela
     virou ruído: dizer que existe o que está ali na lista não informa nada.

     As que explicam uma AUSÊNCIA continuam — é o caso dos dois testes acima. */
  it('as que já têm loja: o botão não diz nada', async () => {
    montar({
      lugares: ['Crássia'],
      estoque_loja: { comercios: [{ id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true, itens: [] }], editando_em: null },
    });
    await waitFor(() => expect(botao(/Lojas das cidades/)?.disabled).toBe(false));
    fireEvent.click(botao(/Lojas das cidades/));
    /* O clique termina (o botão volta de desabilitado) e nenhum recado nasce. */
    await waitFor(() => expect(botao(/Lojas das cidades/).disabled).toBe(false));
    expect(recado()).toBeNull();
  });

  it('sem lugares na aventura, diz isso', async () => {
    montar({ lugares: [] });
    await waitFor(() => expect(botao(/Lojas das cidades/)?.disabled).toBe(false));
    fireEvent.click(botao(/Lojas das cidades/));
    await waitFor(() => expect(recado()).toBeTruthy());
    expect(recado().textContent).toMatch(/ainda não tem lugares/);
  });
});

/* ── REFAZER O ESTOQUE PELA ECONOMIA (28/10/2026) ─────────────────────────
   As lojas criadas ANTES do teto de 60 ficaram enormes — no banco do usuário,
   Haafel com 240 itens e Saupami com 221. Sem reaplicar a regra, a única
   saída seria apagar e recriar cada uma. */
describe('refazer o estoque de uma loja', () => {
  const GRANDE = Array.from({ length: 200 }, (_, i) => (
    { slug: 'ferro', entryId: 'velho' + i, estoque: 7, preco_latao_override: null }));

  it('reaplica a regra na loja aberta e respeita o teto', async () => {
    const { tabelas } = montar({
      lugares: ['Crássia'],
      estoque_loja: {
        comercios: [{ id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true, itens: GRANDE }],
        editando_em: null,
      },
    });
    await waitFor(() => expect(document.querySelector('.estoque-refazer')).toBeTruthy());
    await waitFor(() => expect(document.querySelector('.estoque-refazer').disabled).toBe(false));
    fireEvent.click(document.querySelector('.estoque-refazer'));

    await waitFor(() => expect(recado()).toBeTruthy());
    const loja = tabelas.historias[0].estoque_loja.comercios[0];
    expect(loja.itens.length).toBeLessThanOrEqual(window.LOJA_CIDADE_MAX);
    expect(loja.itens.length).toBeLessThan(GRANDE.length);
    // A loja em si não muda de identidade: mesmo id, mesma cidade.
    expect(loja.id).toBe('c1');
    expect(loja.lugar).toBe('Crássia');
    expect(recado().textContent).toMatch(/Estoque refeito/);
  });

  /* Sem cidade não há economia que ler — e a loja legada "Estoque" é
     justamente essa. O botão nem aparece. */
  it('loja sem cidade não oferece o refazer', async () => {
    montar({
      estoque_loja: { comercios: [{ id: 'legado', nome: 'Estoque', ativo: true, itens: [] }], editando_em: null },
    });
    await waitFor(() => expect(document.querySelector('.estoque-seletor-loja')).toBeTruthy());
    expect(document.querySelector('.estoque-refazer')).toBeNull();
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
    montar({
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
      montar({
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
    montar({
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
