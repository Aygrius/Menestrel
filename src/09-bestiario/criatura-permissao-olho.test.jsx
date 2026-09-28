/* ============================================================
   criatura-permissao-olho.test.jsx — o olho na tabela de Criaturas
   ============================================================
   "Agora que todos os menus forem padronizados assim, do lado do botão de
    editar (lápis), vamos adicionar um botão de ver (olho), onde teremos um
    modal para permitir quem pode ver aquela entrada, na história
    selecionada." (usuário, 17/09/2026)

   Escopo combinado: NPCs, Lugares e Criaturas — as três coisas que o Mestre
   já disponibiliza por história (historias.npc_ids / reino_ids / cidade_ids /
   criatura_ids + lore_acesso_pj). Itens, Magias, Habilidades e Técnicas
   ficaram de fora: são catálogo global, e as colunas item_ids/magia_ids
   existem no banco mas nenhuma tela escreve nelas.

   Por que a Criatura precisou vir PARA CÁ, e não continuar no Lore: a aba
   "Criatura" do GerenciarLoreView era a única porta para disponibilizar uma
   criatura à história, e ela só se alcançava por Histórias → card da mesa →
   botão "Lore" — o botão que o usuário pediu para remover no mesmo dia. Sem
   esta mudança, remover o botão apagaria a função sem substituto.

   O olho depende de MESA SELECIONADA: "na história selecionada" não existe
   sem uma. Sem mesa ele não aparece, em vez de aparecer e falhar ao salvar.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
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
/* Depois do bestiário: é de 13-diario que vem o PermissaoEntradaModal, o
   mesmo que as tabelas de NPCs e Lugares abrem. A CriaturasList o referencia
   em tempo de RENDER, não de carga, então a ordem invertida (13 depois de 09)
   não é problema — é a mesma ordem do main.tsx. */
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

const CRIATURAS = [
  { id: 15, nome: 'Lobisomem', tipo: 'Animal', estagio: 2, energia_fisica: 30, energia_heroica: 12 },
  { id: 16, nome: 'Balor',     tipo: 'Demônio', estagio: 5, energia_fisica: 80, energia_heroica: 40 },
];
const PROTAGONISTAS = [{ id: 42, nome: 'Thalia' }, { id: 87, nome: 'Yuldrous' }];
const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  protagonista_ids: [42, 87],
  criatura_ids: [15],
  npc_ids: [], reino_ids: [], cidade_ids: [],
  lore_acesso_pj: {},
};

let updatesFeitos;

/* Caixa encadeável E aguardável. `carregarCriaturas` faz
   `.select('*').order(...).order(...)` — dois `order` seguidos —, então um
   `order` que devolvesse a promessa direto quebraria no segundo. É o mesmo
   contrato do fake-supabase compartilhado; aqui é local porque este teste
   também precisa registrar os UPDATEs. */
function caixa(linhas) {
  const box = {
    eq: () => box,
    in: () => box,
    order: () => box,
    range: async () => ({ data: linhas, error: null }),
    maybeSingle: async () => ({ data: linhas[0] ?? null, error: null }),
    then: (res, rej) => Promise.resolve({ data: linhas, error: null }).then(res, rej),
  };
  return box;
}

function stubBanco({ historia = HISTORIA } = {}) {
  updatesFeitos = [];
  const linhasDe = (nome) => (nome === 'criaturas' ? CRIATURAS
    : nome === 'historias' ? [historia]
    : nome === 'personagens' ? PROTAGONISTAS
    : []);
  globalThis.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin' ? { data: true, error: null } : { data: null, error: null }),
    from: (nome) => ({
      select: () => caixa(linhasDe(nome)),
      update: (patch) => ({
        eq: () => ({
          select: async () => {
            updatesFeitos.push(patch);
            return { data: [{ id: historia.id, ...patch }], error: null };
          },
        }),
      }),
    }),
  };
}

const ac = () => (window.ADMIN_COPY.pt);
const montar = (props = {}) => render(
  <CriaturasList ac={ac()} lang="pt" modoJogador={false} {...props} />
);

const pronta = () => waitFor(() => expect(document.querySelector('tbody tr')).toBeTruthy());
const linhas = () => [...document.querySelectorAll('tbody tr:not(.best-detail)')];
const linhaDe = (nome) => linhas().find((tr) => (tr.textContent || '').includes(nome));
/* O olho e o lápis moram no CABEÇALHO DA JANELA desde 26/09/2026 ("o ícone de
   lápis deve aparecer do lado do x de fechar o modal"): abre a ficha pela
   linha e acha o ícone ao lado do X. */
const cabecalho = () => document.querySelector('.modal-best-detalhe .ms-header');
const abrirFicha = (nome) => fireEvent.click(linhaDe(nome));
const olhoDe = (nome) => { abrirFicha(nome); return cabecalho().querySelector('.ti-eye'); };

describe('com mesa selecionada, o olho aparece ao lado do lápis', () => {
  it('olho e lápis no cabeçalho da janela, antes do X — e não na linha', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    expect(linhaDe('Lobisomem').querySelector('button .ti-eye, button .ti-pencil')).toBeNull();
    abrirFicha('Lobisomem');
    await waitFor(() => expect(cabecalho().querySelector('.ti-pencil')).toBeTruthy());
    const botoes = [...cabecalho().querySelectorAll('button.ms-close')].map((b) => b.querySelector('i').className);
    expect(botoes).toEqual(['ti ti-eye', 'ti ti-pencil', 'ti ti-x']);
  });

  it('o olho abre o modal de permissão da criatura', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    fireEvent.click(olhoDe('Lobisomem').closest('button'));
    const modal = document.querySelector('.diario-permissao-modal');
    expect(modal).toBeTruthy();
    expect(modal.querySelector('.ms-title').textContent).toMatch(/Lobisomem/);
  });

  it('e abre no estado que a história já tem', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    // criatura_ids tem a 15 e nenhuma lista por PJ → "todos".
    fireEvent.click(olhoDe('Lobisomem').closest('button'));
    let marcado = [...document.querySelectorAll('.diario-permissao-modal input[type="radio"]')]
      .find((r) => r.checked);
    expect(marcado.value).toBe('todos');
  });

  it('criatura fora de criatura_ids abre em "ninguem"', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    fireEvent.click(olhoDe('Balor').closest('button'));
    const marcado = [...document.querySelectorAll('.diario-permissao-modal input[type="radio"]')]
      .find((r) => r.checked);
    expect(marcado.value).toBe('ninguem');
  });

  it('o lápis fecha a ficha e abre o editor', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    abrirFicha('Balor');
    await waitFor(() => expect(cabecalho().querySelector('.ti-pencil')).toBeTruthy());
    fireEvent.click(cabecalho().querySelector('.ti-pencil').closest('button'));
    expect(document.querySelector('.modal-best-detalhe')).toBeNull();
    expect(document.querySelector('.modal-catalogo')).toBeTruthy();
  });

  it('salvar grava criatura_ids na história, num update só', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    fireEvent.click(olhoDe('Balor').closest('button'));
    const radio = document.querySelector('.diario-permissao-modal input[value="todos"]');
    fireEvent.click(radio);
    const salvar = [...document.querySelectorAll('.diario-permissao-modal .ms-footer button')]
      .find((b) => /Salvar/i.test(b.textContent));
    fireEvent.click(salvar);
    await waitFor(() => expect(updatesFeitos.length).toBe(1));
    expect(updatesFeitos[0].criatura_ids).toEqual([15, 16]);
    expect(updatesFeitos[0]).toHaveProperty('lore_acesso_pj');
  });
});

/* "Você não adicionou o ícone nas criaturas" (usuário, 26/09/2026): quem pode
   ver, ao lado do nome, como em Reinos — olho = todos, olho riscado = ninguém. */
describe('o ícone de quem pode ver, ao lado do nome', () => {
  it('com mesa: olho na liberada, olho riscado na que ninguém vê', async () => {
    stubBanco(); montar({ historiaId: 13 });
    await pronta();
    await waitFor(() => expect(linhaDe('Lobisomem').querySelector('.best-name .diario-vis-ic')).toBeTruthy());
    expect(linhaDe('Lobisomem').querySelector('.diario-vis-ic i').className).toBe('ti ti-eye');
    expect(linhaDe('Balor').querySelector('.diario-vis-ic i').className).toBe('ti ti-eye-off');
  });

  it('sem mesa, não há ícone', async () => {
    stubBanco(); montar({ historiaId: null });
    await pronta();
    expect(document.querySelector('.best-name .diario-vis-ic')).toBeNull();
  });
});

describe('sem mesa selecionada não há "história selecionada"', () => {
  it('o olho não aparece', async () => {
    stubBanco(); montar({ historiaId: null });
    await pronta();
    abrirFicha('Lobisomem');
    // O lápis continua: editar o catálogo não depende de mesa.
    await waitFor(() => expect(cabecalho().querySelector('.ti-pencil')).toBeTruthy());
    expect(cabecalho().querySelector('.ti-eye')).toBeNull();
  });
});

describe('o Jogador não vê o olho', () => {
  /* Aqui a afirmação é sobre o FONTE, não sobre o render, e de propósito: no
     modo Jogador a tabela só lista as criaturas que o PJ ativo CONHECE
     (useConhecidoDoJogador → auth.getUser + profiles.pj_ativo_id), então um
     teste de render precisaria stubar a sessão e o PJ ativo — isto é, montar
     o assunto de outro módulo pra afirmar uma condição de uma linha. Sem
     esses stubs a tabela vem vazia e o "não tem olho" passaria por não ter
     linha nenhuma, que é o teste passando pelo motivo errado.

     A porta é uma condição só, e é ela que está travada aqui. A cobertura de
     render do caminho do Mestre (com e sem mesa) está nos describes acima. */
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const fonte = readFileSync(resolve(__dirname, 'bestiario.jsx'), 'utf8');

  it('a porta do olho exige não ser Jogador E ter mesa', () => {
    expect(fonte).toMatch(
      /const podeGerirVisibilidade = !modoJogador && !!historiaId;/
    );
  });

  it('e é ela que decide o olho no cabeçalho da janela', () => {
    const i = fonte.indexOf("icone: 'ti-eye'");
    expect(i).toBeGreaterThan(-1);
    // A condição imediatamente antes do olho é a porta, não outra coisa.
    expect(fonte.slice(i - 40, i)).toMatch(/podeGerirVisibilidade && \{ $/);
  });
});

describe('a fiação no shell', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const shell = readFileSync(resolve(__dirname, '..', '10-shell', 'shell.jsx'), 'utf8');

  it('a CriaturasList recebe a mesa ativa', () => {
    const i = shell.indexOf("current.id === 'criaturas' ?");
    expect(i, 'não achei o ramo da seção Criaturas').toBeGreaterThan(-1);
    // Janela larga: entre o `?` e o <CriaturasList> há o comentário que
    // explica de onde a prop veio.
    const trecho = shell.slice(i, i + 1200);
    expect(trecho).toMatch(/<CriaturasList/);
    expect(trecho).toMatch(/historiaId=\{mesaAtivaId\}/);
  });
});
