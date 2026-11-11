/* ============================================================
   cena-um-por-pagina.test.jsx — a Cena, um capítulo por página (10/11/2026)
   ============================================================
   Usuário: "Na página de Cena, eu quero um capítulo por página, um botão
   para inserir uma imagem que será usada junto com o texto do capítulo."
   A Cena do Mestre abre no capítulo em andamento, anda com Anterior e
   Próximo, e põe a imagem no próprio capítulo (historias.capitulos[]
   .imagem_url). A Mesa do Jogador continua na grade e mostra a imagem.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './historias.jsx';

/* O cliente do Supabase de mentira: guarda o que foi enviado e gravado. */
function clienteFalso(capitulosDoBanco) {
  const feito = { uploads: [], updates: [] };
  const consulta = (tabela) => {
    const q = {
      select: () => q, eq: () => q, order: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: { capitulos: capitulosDoBanco }, error: null }),
      update: (v) => { feito.updates.push({ tabela, v }); return { eq: () => Promise.resolve({ error: null }) }; },
    };
    return q;
  };
  return {
    feito,
    from: consulta,
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'mestre-1' } } }) },
    storage: {
      from: () => ({
        upload: (path, arq) => { feito.uploads.push({ path, arq }); return Promise.resolve({ error: null }); },
        getPublicUrl: (path) => ({ data: { publicUrl: 'https://x/' + path } }),
      }),
    },
  };
}

const CAPS = [
  { id: 'c1', titulo: 'A Estrada', texto: 'Partimos ao amanhecer.' },
  { id: 'c2', titulo: 'A Ponte', texto: 'O rio subiu.' },
  { id: 'c3', titulo: 'A Torre', texto: 'Ninguém voltou.', imagem_url: 'https://x/torre.jpg' },
];
const H = { id: 7, mestre_id: 'mestre-1', capitulos: CAPS };

let Cena;
beforeAll(() => { Cena = window.CenaCronica; });
afterEach(() => { cleanup(); delete globalThis.supabaseClient; });

const montar = (props = {}) => {
  globalThis.supabaseClient = props.cliente || clienteFalso(CAPS);
  return render(
    <div className="menestrel-ui">
      <Cena h={H} personagens={[]} lang="pt" onEscrever={() => {}} onNovoCapitulo={() => {}} {...props} />
    </div>,
  );
};

describe('a Cena do Mestre: um capítulo por página', () => {
  it('abre no capítulo em andamento, com a imagem junto do texto', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'A Torre' })).toBeTruthy();
    expect(screen.getByText('Ninguém voltou.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Imagem de A Torre' }).getAttribute('src')).toBe('https://x/torre.jpg');
    expect(screen.getByRole('navigation', { name: 'Capítulos' }).textContent).toMatch(/Capítulo\s*3\s*de\s*3/);
    expect(screen.queryByText('A Estrada')).toBeNull();          // um por página
  });

  it('Anterior e Próximo andam pelo livro, e param nas pontas', () => {
    montar();
    const prox = screen.getByRole('button', { name: /Próximo/ });
    expect(prox.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByRole('heading', { name: 'A Ponte' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByRole('heading', { name: 'A Estrada' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Anterior/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
    expect(screen.getByRole('heading', { name: 'A Ponte' })).toBeTruthy();
  });

  it('sem imagem: "Inserir imagem"; com imagem: "Trocar imagem" e o botão de tirar', () => {
    montar();
    expect(screen.getByRole('button', { name: /Trocar imagem/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tirar imagem' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByRole('button', { name: /Inserir imagem/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tirar imagem' })).toBeNull();
  });

  it('inserir: envia para a pasta do Mestre e grava a url no capítulo certo', async () => {
    const cliente = clienteFalso(CAPS);
    const onAlterado = vi.fn();
    montar({ cliente, onAlterado });
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));     // A Ponte
    const arq = new File(['x'], 'ponte.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('cena-imagem-input'), { target: { files: [arq] } });
    await waitFor(() => expect(onAlterado).toHaveBeenCalled());
    expect(cliente.feito.uploads[0].path).toBe('mestre-1/capitulos/7/c2');
    const gravados = cliente.feito.updates[0].v.capitulos;
    expect(gravados[1].imagem_url).toMatch(/^https:\/\/x\/mestre-1\/capitulos\/7\/c2\?v=\d+$/);
    expect(gravados[0]).toEqual(CAPS[0]);
    expect(gravados[2]).toEqual(CAPS[2]);
    expect(screen.getByRole('img', { name: 'Imagem de A Ponte' })).toBeTruthy();
  });

  it('arquivo que não é imagem não sobe', () => {
    const cliente = clienteFalso(CAPS);
    montar({ cliente });
    fireEvent.change(screen.getByTestId('cena-imagem-input'),
      { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert').textContent).toMatch(/arquivo de imagem/);
    expect(cliente.feito.uploads).toHaveLength(0);
  });
});

/* O TEXTO EM PÁGINAS (11/11/2026, usuário: "Na página 'Cena', não teremos uma
   barra vertical. O texto poderá ser navegável por páginas."). O jsdom não
   faz layout: a largura da vista e a do fluxo em colunas são simuladas — um
   capítulo que ocupa três larguras de página tem três páginas. */
describe('a Cena do Mestre: o texto em páginas', () => {
  const props = ['clientWidth', 'scrollWidth'];
  const originais = {};
  beforeAll(() => {
    props.forEach((k) => { originais[k] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k); });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true,
      get() { return this.classList && this.classList.contains('cena-paginas') ? 600 : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true,
      get() { return this.classList && this.classList.contains('cena-paginas-fluxo') ? 600 * 3 + 48 * 2 : 0; } });
  });
  // Os originais moram em Element.prototype: basta tirar a sombra posta aqui.
  afterAll(() => { props.forEach((k) => { if (originais[k]) Object.defineProperty(HTMLElement.prototype, k, originais[k]); else delete HTMLElement.prototype[k]; }); });

  it('Próximo vira a página; na última página do último capítulo, para', () => {
    montar();
    const nav = () => screen.getByRole('navigation', { name: 'Capítulos' });
    expect(nav().textContent).toMatch(/Capítulo\s*3\s*de\s*3\s*·\s*Página\s*1\s*de\s*3/);
    fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
    expect(nav().textContent).toMatch(/Página\s*2\s*de\s*3/);
    fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
    expect(nav().textContent).toMatch(/Página\s*3\s*de\s*3/);
    expect(screen.getByRole('button', { name: /Próximo/ }).disabled).toBe(true);
    // O fluxo desliza uma largura de página (+ o vão) por página.
    expect(document.querySelector('.cena-paginas-fluxo').style.transform).toBe('translateX(-1296px)');
  });
  it('Anterior na primeira página volta à ÚLTIMA página do capítulo anterior', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    const nav = screen.getByRole('navigation', { name: 'Capítulos' });
    expect(nav.textContent).toMatch(/Capítulo\s*2\s*de\s*3\s*·\s*Página\s*3\s*de\s*3/);
  });
  it('sem barra vertical: a vista recorta e o fluxo corre em colunas', () => {
    montar();
    const vista = document.querySelector('.cena-paginas');
    expect(vista.style.height).toMatch(/px$/);
    expect(document.querySelector('.cena-paginas-fluxo').style.columnWidth).toBe('600px');
  });
});

describe('a Mesa do Jogador continua na grade', () => {
  it('cartões, e a imagem aparece ao abrir o capítulo', () => {
    montar({ somenteLeitura: true });
    expect(screen.queryByRole('navigation', { name: 'Capítulos' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Inserir imagem|Trocar imagem/ })).toBeNull();
    fireEvent.click(screen.getByText('A Torre'));
    expect(screen.getByRole('img', { name: 'Imagem de A Torre' })).toBeTruthy();
  });
});

describe('capitulosComImagem', () => {
  it('troca e tira só no capítulo pedido', () => {
    const f = window.capitulosComImagem;
    expect(f(CAPS, 'c1', 'u')[0]).toEqual({ ...CAPS[0], imagem_url: 'u' });
    expect(f(CAPS, 'c3', null)[2]).toEqual({ id: 'c3', titulo: 'A Torre', texto: 'Ninguém voltou.' });
    expect(f(CAPS, 'c3', null)[1]).toBe(CAPS[1]);
  });
});

describe('a imagem atravessa a edição do capítulo', () => {
  it('a janela de edição lê e devolve imagem_url', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const fonte = readFileSync(resolve(__dirname, 'historias.jsx'), 'utf8');
    expect(fonte).toMatch(/data_capitulo: c\.data_capitulo \?\? null, imagem_url: c\.imagem_url \?\? null/);
    expect(fonte).toMatch(/\.\.\.\(imagem_url \? \{ imagem_url \} : \{\}\)/);
  });
});
