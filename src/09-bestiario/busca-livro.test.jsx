/* ============================================================
   busca-livro.test.jsx — Ctrl+K no Livro de Regras (22/10/2026)
   ============================================================
   1. A ordem: começo do nome antes de começo de palavra, antes de meio;
      sem acento e sem caixa.
   2. O Jogador só acha o que o personagem conhece — a busca não pode furar
      a regra das listas.
   3. Escolher chama quem abriu com a seção e a chave da entrada.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './conhecido-jogador.jsx';
import './bestiario.jsx';

const TABELAS = {
  criaturas: [{ id: 'c1', nome: 'Dragão de Fogo' }, { id: 'c2', nome: 'Lobo' }],
  itens: [{ slug: 'fogo-vivo', nome: 'Fogo Vivo' }, { slug: 'perg', nome: 'Pergaminho Bola de Fogo' }],
  magias: [{ key: 'bola_de_fogo', nome: 'Bola de Fogo' }, { key: 'luz', nome: 'Luz' }],
  tecnicas: [{ key: 'golpe', nome: 'Golpe Firme' }],
  habilidades: [{ key: 'furtividade', nome: 'Furtividade' }],
};
beforeAll(() => {
  const tabela = (nome) => {
    const q = {
      select: () => q, order: () => q, eq: () => q,
      range: () => Promise.resolve({ data: TABELAS[nome], error: null }),
      then: (ok, f) => Promise.resolve({ data: TABELAS[nome], error: null }).then(ok, f),
    };
    return q;
  };
  // eh_admin: quem cria no catálogo vê o "+ Nova …" no tipo (23/10/2026).
  window.supabaseClient = { from: tabela, rpc: (nome) => Promise.resolve({ data: nome === 'eh_admin' ? !!window.__ehAdmin : null, error: null }) };
  globalThis.supabaseClient = window.supabaseClient;
});
afterEach(cleanup);

describe('buscarNoLivro — ordem', () => {
  const indice = [
    { secao: 'itens', chave: 'a', nome: 'Pergaminho Bola de Fogo' },
    { secao: 'magias', chave: 'b', nome: 'Bola de Fogo' },
    { secao: 'itens', chave: 'c', nome: 'Fogo Vivo' },
    { secao: 'criaturas', chave: 'd', nome: 'Dragão de Fogo' },
  ];
  it('começo do nome primeiro, depois começo de palavra', () => {
    expect(window.buscarNoLivro(indice, 'fogo').map((r) => r.chave)).toEqual(['c', 'b', 'd', 'a']);
  });
  it('ignora acento e caixa', () => {
    expect(window.buscarNoLivro(indice, 'DRAGAO').map((r) => r.chave)).toEqual(['d']);
  });
  it('vazio não lista nada', () => {
    expect(window.buscarNoLivro(indice, '  ')).toEqual([]);
  });
});

async function abrir(props) {
  render(<div id="root"><div className="menestrel-ui"><window.BuscaLivro lang="pt" onClose={() => {}} onEscolher={() => {}} {...props} /></div></div>);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  const input = screen.getByRole('combobox');
  return {
    input,
    digitar: async (t) => { fireEvent.change(input, { target: { value: t } }); await act(async () => {}); },
    nomes: () => [...document.querySelectorAll('.busca-livro-nome')].map((n) => n.textContent),
  };
}

describe('BuscaLivro', () => {
  it('acha nas cinco listas e Enter escolhe a primeira', async () => {
    let escolhido = null;
    const b = await abrir({ onEscolher: (r) => { escolhido = r; } });
    await b.digitar('fogo');
    // Agrupados por tipo desde 23/10/2026, na ordem do melhor de cada grupo:
    // Itens (Fogo Vivo é o melhor de todos), depois Magias, depois Criaturas.
    expect(b.nomes()).toEqual(['Fogo Vivo', 'Pergaminho Bola de Fogo', 'Bola de Fogo', 'Dragão de Fogo']);
    fireEvent.keyDown(b.input, { key: 'Enter' });
    expect(escolhido).toMatchObject({ secao: 'itens', chave: 'fogo-vivo' });
  });

  it('seta para baixo muda a escolha', async () => {
    let escolhido = null;
    const b = await abrir({ onEscolher: (r) => { escolhido = r; } });
    await b.digitar('fogo');
    fireEvent.keyDown(b.input, { key: 'ArrowDown' });
    fireEvent.keyDown(b.input, { key: 'ArrowDown' });
    fireEvent.keyDown(b.input, { key: 'Enter' });
    expect(escolhido).toMatchObject({ secao: 'magias', chave: 'bola_de_fogo' });
  });

  /* 23/10/2026: "ao clicar, não vai abrir uma tabela com os itens, vai
     mostrar como se eu tivesse pesquisando". O tipo lista as entradas ali. */
  it('o tipo abre dentro da paleta, com todas as entradas dele', async () => {
    let escolhido = null;
    const b = await abrir({ onEscolher: (r) => { escolhido = r; } });
    // Paleta vazia: os cinco tipos, na MESMA linha dos resultados.
    expect(b.nomes()).toEqual(['Criaturas', 'Itens', 'Magias', 'Técnicas', 'Habilidades']);
    fireEvent.click(screen.getByText('Magias'));
    await act(async () => {});
    expect(b.nomes()).toEqual(['Bola de Fogo', 'Luz']);
    expect(escolhido, 'escolher o tipo não sai da paleta').toBeNull();
    // Digitar filtra dentro do tipo.
    await b.digitar('luz');
    expect(b.nomes()).toEqual(['Luz']);
    // A seta do grupo volta aos tipos.
    await b.digitar('');
    fireEvent.click(screen.getByLabelText('Voltar aos tipos'));
    expect(b.nomes()).toHaveLength(5);
  });

  it('quem cria no catálogo vê o "+ Nova magia" no tipo, e ele pede o editor em branco', async () => {
    window.__ehAdmin = true;
    try {
      let escolhido = null;
      await abrir({ onEscolher: (r) => { escolhido = r; } });
      expect(document.querySelector('.busca-livro-novo'), 'sem tipo, não há +').toBeNull();
      fireEvent.click(screen.getByText('Magias'));
      await act(async () => {});
      fireEvent.click(screen.getByText('Nova magia'));
      expect(escolhido).toEqual({ secao: 'magias', novo: true });
    } finally { window.__ehAdmin = false; }
  });

  it('quem não cria não vê o +', async () => {
    await abrir({});
    fireEvent.click(screen.getByText('Magias'));
    await act(async () => {});
    expect(document.querySelector('.busca-livro-novo')).toBeNull();
  });

  it('o Jogador só acha o que conhece', async () => {
    const antes = window.useConhecidoDoJogador;
    window.useConhecidoDoJogador = () => ({ carregando: false, erro: null, conhecido: {
      criaturas: new Set(), itens: new Set(['fogo-vivo']), magias: new Set(), tecnicas: new Set(), habilidades: new Set(),
    } });
    try {
      const b = await abrir({ modoJogador: true });
      await b.digitar('fogo');
      expect(b.nomes()).toEqual(['Fogo Vivo']);
    } finally { window.useConhecidoDoJogador = antes; }
  });
});
