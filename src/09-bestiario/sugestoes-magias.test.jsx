/* ============================================================
   sugestoes-magias.test.jsx — o documento de sugestões na página de Magias
   ============================================================
   "Documento de sugestões na página junto com conferência." (usuário,
   12/09/2026)

   O painel lê docs/sugestoes-magias.md direto do arquivo. Estes testes
   montam o DOCUMENTO DE VERDADE — não um texto de exemplo —, então editar o
   arquivo com uma forma que o leitor não entende derruba a suíte em vez de
   aparecer quebrado na tela.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import documento from '../../docs/sugestoes-magias.md?raw';
import docTecnicas from '../../docs/sugestoes-tecnicas.md?raw';
import docItens from '../../docs/sugestoes-itens.md?raw';
import docEstudo from '../../docs/estudo-magias.md?raw';
import './sugestoes-magias.jsx';

let Painel, Md;
beforeAll(() => {
  Painel = window.MagiasSugestoesPainel;
  Md = window.MarkdownSimples;
  expect(Painel).toBeTypeOf('function');
});
afterEach(cleanup);

const montarDoc = () => render(<div className="menestrel-ui"><Md texto={documento} /></div>).container;

describe('o painel', () => {
  it('começa fechado e abre no clique', () => {
    const { container } = render(<div className="menestrel-ui"><Painel lang="pt" /></div>);
    expect(container.querySelector('.sug-md')).toBeNull();
    fireEvent.click(container.querySelector('.best-aud-head'));
    expect(container.querySelector('.sug-md')).toBeTruthy();
  });

  it('carrega o documento de verdade', () => {
    const { container } = render(<div className="menestrel-ui"><Painel lang="pt" /></div>);
    fireEvent.click(container.querySelector('.best-aud-head'));
    expect(container.textContent).toMatch(/Magias novas aplicadas/);
    expect(container.textContent).toMatch(/Cadência Veloz/);
    expect(container.textContent).toMatch(/Quem saiu perdendo com as fusões/);
  });
});

describe('o documento renderiza sem sobra de markdown', () => {
  it('nenhum ** nem ## cru na tela', () => {
    const c = montarDoc();
    expect(c.textContent).not.toMatch(/\*\*/);
    expect(c.textContent).not.toMatch(/(^|\s)##\s/);
  });

  it('as tabelas viram <table>, com cabeçalho', () => {
    const c = montarDoc();
    const tabelas = c.querySelectorAll('table.sug-tabela');
    expect(tabelas.length).toBeGreaterThan(10);
    expect(c.textContent).not.toMatch(/\|\s*---/);
  });

  it('o perfil de cada profissão está no topo', () => {
    const c = montarDoc();
    expect(c.querySelector('table.sug-tabela').textContent).toMatch(/Rastreador.*controle animal/);
  });

  it('títulos, citações e bloco de código', () => {
    const c = montarDoc();
    expect(c.querySelector('.sug-h2').textContent).toMatch(/perfil/i);
    expect(c.querySelector('blockquote.sug-citacao')).toBeTruthy();
    expect(c.querySelector('pre.sug-pre').textContent).toMatch(/238 magias/);
  });
});

describe('MarkdownSimples — as formas que o documento usa', () => {
  const html = (md) => render(<Md texto={md} />).container;

  it('inline: negrito, itálico e código', () => {
    const c = html('Texto **forte**, *leve* e `codigo`.');
    expect(c.querySelector('strong').textContent).toBe('forte');
    expect(c.querySelector('em').textContent).toBe('leve');
    expect(c.querySelector('code').textContent).toBe('codigo');
  });

  it('lista numerada com continuação na linha seguinte', () => {
    const c = html('1. primeiro item\n   que continua\n2. segundo');
    const itens = c.querySelectorAll('ol li');
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toMatch(/primeiro item que continua/);
  });

  it('linha em branco entre itens não quebra a lista em duas', () => {
    const c = html('1. um\n\n   | a | b |\n   |---|---|\n   | 1 | 2 |\n\n2. dois');
    expect(c.querySelectorAll('ol')).toHaveLength(1);
    expect(c.querySelectorAll('ol li')).toHaveLength(2);
    expect(c.querySelector('ol li table')).toBeTruthy();
  });

  it('não injeta HTML: tag no texto aparece como texto', () => {
    const c = html('Um <script>alert(1)</script> no meio.');
    expect(c.querySelector('script')).toBeNull();
    expect(c.textContent).toMatch(/<script>/);
  });
});


describe('técnicas e itens — os outros dois documentos', () => {
  /* "Faça sugestões de técnicas e itens para uso em batalha." (usuário) */
  it.each([
    ['TecnicasSugestoesPainel', /Sugestões de técnicas/, /Emboscada/],
    ['ItensSugestoesPainel', /Sugestões de itens para batalha/, /Poção Menor de Vigor/],
    // "Análise para diminuir as magias pouco interessantes e fundir as parecidas."
    ['EstudoMagiasPainel', /Estudo: enxugar e melhorar as magias/, /Dificuldade de habilidade — 22 magias viram 6/],
  ])('%s abre o documento certo', (nome, titulo, conteudo) => {
    const P = window[nome];
    const { container } = render(<div className="menestrel-ui"><P lang="pt" /></div>);
    expect(container.textContent).toMatch(titulo);
    fireEvent.click(container.querySelector('.best-aud-head'));
    expect(container.textContent).toMatch(conteudo);
  });

  it.each([['técnicas', docTecnicas], ['itens', docItens], ['estudo', docEstudo]])('o documento de %s renderiza sem markdown cru', (_, doc) => {
    const c = render(<div className="menestrel-ui"><Md texto={doc} /></div>).container;
    expect(c.textContent).not.toMatch(/\*\*/);
    expect(c.textContent).not.toMatch(/\|\s*---/);
    expect(c.querySelectorAll('table.sug-tabela').length).toBeGreaterThanOrEqual(3);
  });
});
