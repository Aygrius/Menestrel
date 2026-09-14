/* ============================================================
   leitura-doc.test.jsx — ler o livro (itens.doc_url) numa janela
   ============================================================
   "Alguns itens, como livros, possuem uma URL, ela serve para abrir o
   conteúdo do google documents em um modal na tela, não estou conseguindo
   abrir mais esses livros e mostrar o texto." (usuário, 13/09/2026)

   Travado aqui:
     • o link de EDIÇÃO do Google Docs vira o /preview do mesmo documento —
       o editor não embute num iframe, o preview sim;
     • link que não é Google Docs passa como veio;
     • a janela monta o iframe com o endereço de leitura e mantém o link
       "Abrir em nova aba" apontando pro original.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let urlLeituraDoc, LeituraDocModal;
beforeAll(() => {
  urlLeituraDoc = window.urlLeituraDoc;
  LeituraDocModal = window.LeituraDocModal;
  expect(urlLeituraDoc).toBeTypeOf('function');
  expect(LeituraDocModal).toBeTypeOf('function');
});
afterEach(cleanup);

// Links reais do catálogo (itens.doc_url), como o Mestre os colou.
const EDIT_COM_ABA = 'https://docs.google.com/document/d/1MbMRM6yObXmxiUKpXOAFfoILcLeYeCfJy_d9Gm-EIxs/edit?tab=t.cl1a0kl0g8l8';
const EDIT_COM_TITULO = 'https://docs.google.com/document/d/1Anwu6DhXHNRP8IBXBBr4GQG845KhEGIM2FNUhyZXnM0/edit?tab=t.0#heading=h.hckfjvmw9lz6';

describe('urlLeituraDoc', () => {
  it('o link de edição vira o /preview do mesmo documento', () => {
    expect(urlLeituraDoc(EDIT_COM_ABA))
      .toBe('https://docs.google.com/document/d/1MbMRM6yObXmxiUKpXOAFfoILcLeYeCfJy_d9Gm-EIxs/preview');
    expect(urlLeituraDoc(EDIT_COM_TITULO))
      .toBe('https://docs.google.com/document/d/1Anwu6DhXHNRP8IBXBBr4GQG845KhEGIM2FNUhyZXnM0/preview');
  });

  it('aceita o formato com conta (/u/0/d/…)', () => {
    expect(urlLeituraDoc('https://docs.google.com/document/u/0/d/abc_DEF-123/edit'))
      .toBe('https://docs.google.com/document/d/abc_DEF-123/preview');
  });

  it('link de fora passa como veio; vazio é null', () => {
    expect(urlLeituraDoc('https://exemplo.com/livro.pdf')).toBe('https://exemplo.com/livro.pdf');
    expect(urlLeituraDoc('')).toBeNull();
    expect(urlLeituraDoc(null)).toBeNull();
  });
});

describe('LeituraDocModal', () => {
  it('embute o /preview, e só ele — sem o link "Abrir em nova aba" (13/09/2026)', () => {
    render(<LeituraDocModal titulo="Livro das Revelações" docUrl={EDIT_COM_TITULO} lang="pt" onClose={() => {}} />);
    const frame = document.querySelector('iframe.leitura-doc-frame');
    expect(frame).toBeTruthy();
    expect(frame.getAttribute('src')).toBe('https://docs.google.com/document/d/1Anwu6DhXHNRP8IBXBBr4GQG845KhEGIM2FNUhyZXnM0/preview');
    expect(frame.getAttribute('title')).toBe('Livro das Revelações');
    expect(document.querySelector('.leitura-doc-rodape')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Abrir em nova aba/);
  });

  it('sem link não monta nada', () => {
    render(<LeituraDocModal titulo="Livro" docUrl="" lang="pt" onClose={() => {}} />);
    expect(document.querySelector('iframe.leitura-doc-frame')).toBeNull();
  });
});
