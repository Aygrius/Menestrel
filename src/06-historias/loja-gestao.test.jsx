/* ============================================================
   loja-gestao.test.jsx — a tela de gestão da loja (15/09/2026)
   ============================================================
   Pedidos do usuário, todos nesta tela:
     • "coloque os botões 'mostrar para jogadores', 'renomear' e 'excluir'
        inline com o título da loja, e remover 'oculto dos jogadores'";
     • "Na coluna da tabela, remova o 'preço', e coloque 'águia' em uma coluna
        e 'animais' em outra";
     • "Ao clicar no ícone do catálogo, abrir um modal para selecionar valor e
        estoque";
     • "Enquanto o mestre estiver editando a loja, ela automaticamente fecha e
        bloqueia para compra dos jogadores";
     • "Ao adicionar um item, salvar automaticamente. Remover botão de salvar."
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './historias.jsx';

let View;
beforeAll(() => {
  View = window.GerenciarLojaView;
  expect(View, 'GerenciarLojaView precisa estar no window').toBeTypeOf('function');
  // Kit do shadcn: dublê com tags nativas, como em bestiario-admin.test.jsx.
  window.UI = {
    ...window.UI,
    Table: 'table', TableHeader: 'thead', TableBody: 'tbody',
    TableRow: 'tr', TableHead: 'th', TableCell: 'td',
    Input: (props) => <input {...props} />,
  };
});
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; vi.useRealTimers(); });

const CATALOGO = [
  { slug: 'aguia', nome: 'Águia', grupo: 'Animais', valor_latao: 200, descricao: 'Ave de rapina.' },
  { slug: 'corda', nome: 'Corda', grupo: 'Itens', valor_latao: 30, descricao: 'Dez metros.' },
  { slug: 'quartzo', nome: 'Quartzo', grupo: 'Minerais', valor_latao: 50, descricao: 'Cristal.' },
];

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  estoque_loja: { comercios: [{ id: 'c1', nome: 'Feira de Farzelo', ativo: true, itens: [] }] },
};

function montar() {
  const escritas = [];
  globalThis.supabaseClient = {
    from: () => ({
      select: () => {
        const box = {
          eq: () => box, order: () => box, in: () => box,
          range: async () => ({ data: CATALOGO, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          then: (ok, falha) => Promise.resolve({ data: CATALOGO, error: null }).then(ok, falha),
        };
        return box;
      },
      update: (campos) => ({ eq: async () => { escritas.push(campos.estoque_loja); return { error: null }; } }),
    }),
  };
  const r = render(<div className="menestrel-ui">
    <View historia={HISTORIA} t={window.COPY.pt} lang="pt" onClose={() => {}} onSaved={() => {}} />
  </div>);
  return { ...r, escritas };
}

const textos = (sel) => [...document.querySelectorAll(sel)].map((el) => el.textContent.trim());
const esperarCatalogo = () => waitFor(() => expect(document.body.textContent).toMatch(/Águia/));

describe('cabeçalho do comércio', () => {
  it('mostrar/ocultar, renomear e excluir ficam na linha do título', async () => {
    montar();
    await esperarCatalogo();
    const header = document.querySelector('.loja-mng-v4-comercio-header');
    expect(header.textContent).toMatch(/Feira de Farzelo/);
    const rotulos = [...header.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(rotulos).toEqual(['Ocultar dos jogadores', 'Renomear', 'Excluir']);
  });

  it('o selo escrito "Oculto/Visível dos jogadores" saiu da tela', async () => {
    montar();
    await esperarCatalogo();
    expect(document.querySelector('.loja-mng-v4-status-badge')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Oculto dos jogadores/);
    expect(document.body.textContent).not.toMatch(/Visível para jogadores/);
  });

  it('não há botão de salvar: tudo grava sozinho', async () => {
    montar();
    await esperarCatalogo();
    const salvar = [...document.querySelectorAll('button')].find((b) => /^Salvar$/.test(b.textContent.trim()));
    expect(salvar).toBeFalsy();
  });
});

/* 15/09/2026: "A página de loja da aventura não está seguindo nosso padrão de
   layout/design [...] O modal quando clica no item está totalmente diferente.
   Alguns ícones de filtro estão bugados. Os botões de editar e excluir loja
   estão repetidos." */
describe('padrão do sistema', () => {
  it('a página vem no molde das outras do Mestre: fp-page > fp-card', async () => {
    const { container } = montar();
    await esperarCatalogo();
    const card = container.querySelector('.fp-page > .fp-card.loja-mng-v3-page');
    expect(card, 'a loja precisa do mesmo invólucro do Lore').toBeTruthy();
    expect(card.querySelector('.fp-card-top .ms-header')).toBeTruthy();
  });

  it('os modais são o ModalShell do projeto, não markup próprio', async () => {
    montar();
    await esperarCatalogo();
    const linha = [...document.querySelectorAll('.loja-mng-v3-panel--cat tbody tr')]
      .find((tr) => tr.textContent.includes('Águia'));
    fireEvent.click(linha);
    await waitFor(() => expect(document.querySelector('.ms-modal.loja-add-modal')).toBeTruthy());
    expect(document.querySelector('.loja-comercio-modal')).toBeNull();
    expect(document.querySelector('.loja-comercio-modal-backdrop')).toBeNull();
  });

  it('a lista de comércios não repete os botões de editar e excluir', async () => {
    montar();
    await esperarCatalogo();
    expect(document.querySelector('.loja-mng-v4-sidebar-actions')).toBeNull();
    const rotulos = [...document.querySelectorAll('.loja-mng-v4-sidebar-list button')]
      .map((b) => b.getAttribute('aria-label'));
    expect(rotulos).toEqual([]);
  });

  /* 15/09/2026: "Na coluna da esquerda, remova o texto 'comércios' e o ícone de
     '+' fica na linha do título 'loja' à direita." */
  it('a coluna da esquerda não tem mais título, e o + está na linha de "Loja"', async () => {
    const { container } = montar();
    await esperarCatalogo();
    expect(document.querySelector('.loja-mng-v4-sidebar-header')).toBeNull();
    expect(document.querySelector('.loja-mng-v4-sidebar').textContent).not.toMatch(/Comércios/);
    const header = container.querySelector('.fp-card-top .ms-header');
    expect(header.textContent).toMatch(/Loja/);
    const novo = [...header.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Novo comércio');
    expect(novo, 'o + tem que estar no cabeçalho da página').toBeTruthy();
    expect(novo.querySelector('.ti-plus')).toBeTruthy();
  });

  it('o catálogo mostra 10 itens por página', async () => {
    montar();
    await esperarCatalogo();
    expect(window.GerenciarLojaView.toString()).toMatch(/PAGE_SIZE_CAT\s*=\s*10/);
  });

  it('o chip de Minerais tem ícone — ti-gem não existe no Tabler', async () => {
    montar();
    await esperarCatalogo();
    const icones = [...document.querySelectorAll('.loja-mng-v3-panel--cat .best-chip i')]
      .map((i) => i.className);
    expect(icones.some((c) => c.includes('ti-diamond'))).toBe(true);
    expect(icones.some((c) => c.includes('ti-gem'))).toBe(false);
  });
});

describe('tabela do catálogo', () => {
  it('colunas Item, Grupo e Valor — sem a de Preço formatado', async () => {
    montar();
    await esperarCatalogo();
    // A seta de ordenação viaja junto no texto do cabeçalho.
    const cabecalhos = textos('.loja-mng-v3-panel--cat thead th').map((s) => s.replace(/[▲▼]/g, '').trim());
    expect(cabecalhos).toEqual(['Item', 'Grupo', 'Valor']);
  });

  it('"Águia" numa coluna, "Animais" na outra e o valor de tabela na terceira', async () => {
    montar();
    await esperarCatalogo();
    const linha = [...document.querySelectorAll('.loja-mng-v3-panel--cat tbody tr')]
      .find((tr) => tr.textContent.includes('Águia'));
    const celulas = [...linha.querySelectorAll('td')].map((td) => td.textContent.trim());
    expect(celulas).toEqual(['Águia', 'Animais', '200']);
  });
});

describe('adicionar item', () => {
  const abrirModalDaAguia = async () => {
    const linha = [...document.querySelectorAll('.loja-mng-v3-panel--cat tbody tr')]
      .find((tr) => tr.textContent.includes('Águia'));
    fireEvent.click(linha);
    return waitFor(() => {
      const m = document.querySelector('.loja-add-modal');
      expect(m).toBeTruthy();
      return m;
    });
  };

  it('clicar no item abre um modal com valor e estoque', async () => {
    montar();
    await esperarCatalogo();
    const modal = await abrirModalDaAguia();
    expect(modal.textContent).toMatch(/Águia/);
    expect(modal.textContent).toMatch(/Feira de Farzelo/);   // o comércio de destino
    // Rótulos no padrão do projeto (diario-field-label), com o destino e a
    // nota em blocos próprios — nada colado (15/09/2026).
    const rotulos = [...modal.querySelectorAll('.loja-add-modal-campo > .diario-field-label')].map((s) => s.textContent);
    // 15/09/2026: o rótulo "Estoque" saiu; o campo fica com aria-label e o ∞.
    expect(rotulos).toEqual(['Preço']);
    const campos = [...modal.querySelectorAll('.loja-add-modal-campo input')];
    expect(campos).toHaveLength(2);
    expect(campos[1].getAttribute('aria-label')).toBe('Estoque');
    expect(campos[1].getAttribute('placeholder')).toBe('∞');
    expect(modal.textContent).not.toMatch(/Estoque/);
    // 15/09/2026: o prefixo "Adicionando em:" e a nota do rodapé saíram.
    expect(modal.querySelector('.loja-add-modal-destino').textContent.trim()).toBe('Feira de Farzelo');
    expect(modal.querySelector('.loja-add-modal-nota')).toBeNull();
    expect(modal.textContent).not.toMatch(/Adicionando em/);
    expect(modal.textContent).not.toMatch(/ilimitado/);
    // A gaveta inline que fazia esse papel saiu.
    expect(document.querySelector('.loja-mng-v3-drawer')).toBeNull();
  });

  it('confirmar grava sozinho, com valor e estoque escolhidos', async () => {
    const { escritas } = montar();
    await esperarCatalogo();
    const modal = await abrirModalDaAguia();
    const [preco, estoque] = modal.querySelectorAll('input');
    fireEvent.change(preco, { target: { value: '150' } });
    fireEvent.change(estoque, { target: { value: '2' } });
    fireEvent.click([...modal.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Adicionar'));

    const gravado = await waitFor(() => {
      const comItem = escritas.filter((e) => e.comercios[0].itens.length === 1);
      expect(comItem.length).toBeGreaterThan(0);
      return comItem[comItem.length - 1];
    }, { timeout: 3000 });
    expect(gravado.comercios[0].itens[0]).toMatchObject({ slug: 'aguia', preco_latao_override: 150, estoque: 2 });
  });
});

describe('a loja fecha enquanto o Mestre edita', () => {
  it('a gravação carimba editando_em, e o carimbo fecha a loja', async () => {
    const { escritas } = montar();
    await esperarCatalogo();
    await waitFor(() => expect(escritas.length).toBeGreaterThan(0));
    const marca = escritas[0].editando_em;
    expect(typeof marca).toBe('string');
    expect(window.lojaEmEdicao({ editando_em: marca })).toBe(true);
  });

  it('o carimbo vence sozinho — aba fechada no tapa não tranca a loja para sempre', () => {
    const agora = Date.now();
    const velho = new Date(agora - window.LOJA_EDICAO_TTL_MS - 1000).toISOString();
    const recente = new Date(agora - 1000).toISOString();
    expect(window.lojaEmEdicao({ editando_em: recente }, agora)).toBe(true);
    expect(window.lojaEmEdicao({ editando_em: velho }, agora)).toBe(false);
    expect(window.lojaEmEdicao({ editando_em: null }, agora)).toBe(false);
    expect(window.lojaEmEdicao([], agora)).toBe(false);   // formato legado (array)
  });

  it('sair da tela solta o cadeado (editando_em volta a null)', async () => {
    const { escritas, unmount } = montar();
    await esperarCatalogo();
    await waitFor(() => expect(escritas.length).toBeGreaterThan(0));
    unmount();
    await waitFor(() => expect(escritas[escritas.length - 1].editando_em).toBeNull());
  });
});
