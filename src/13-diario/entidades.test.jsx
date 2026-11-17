/* ============================================================
   entidades.test.jsx — deuses, titãs e príncipes na Ambientação
   ============================================================
   Usuário (08/11/2026): "Em ambientação, junto com Reinos, Cidades, etc, crie
   um novo menu chamado Entidades [...] Nome, Prefácio, Descrição, Relações,
   Locais, Feriados (além de inserir aqui, adicionar também no calendário),
   Itens." Cruine é o exemplo para aprovação.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/entidades.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/bestiario.jsx';
import './diario.jsx';
import './entidades.jsx';

beforeAll(() => {
  window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
});
afterEach(cleanup);

/* O TEXTO MORA NO BANCO desde 15/11/2026 (catalogo_mundo; "O texto original
   não precisa ser guardado", usuário). Estes testes usam um exemplo pequeno e
   conferem o comportamento — o conteúdo de cada deus é do banco, não daqui. */
const CRUINE = {
  slug: 'cruine', nome: 'Cruine', classe: 'deus', titulo: 'Tempo',
  prefacio: { texto: 'O velho atravessou a ponte.\nE o rio parou.', fonte: 'Extratos do Livro de Maudi — Biblioteca de Saravossa.' },
  descricao: 'O senhor do tempo.\nGuarda o fim de cada ano.',
  relacoes: [{ nome: 'Plandis', texto: 'Irmão.' }],
  locais: [{ nome: 'Torre do Ciclo', onde: 'Ludgrim', texto: 'Onde o ano termina.' }],
  feriados: [{ dia: 1, mes: 13, nome: 'Festa do Ciclo Natural da Vida', texto: 'O último dia.' }],
  itens: [{ nome: 'Ampulheta', texto: 'Nunca esvazia.' }],
};
const MAIRA = { slug: 'maira', nome: 'Maira', classe: 'deusa', feriados: [
  { dia: 3, mes: 10, nome: 'Festival de Renascimento de Maira' },
  { datas: [{ dia: 30, mes: 4 }, { dia: 1, mes: 5 }], quando: 'Na virada da Semente', nome: 'Festa da Fartura' },
  { quando: 'no fim do inverno', nome: 'Sem data no calendário' },
] };
const PALIER = { slug: 'palier', nome: 'Palier', classe: 'deus', feriados: [{ dia: 9, mes: 8, nome: 'Festa da Iluminação' }] };
const PLANDIS = { slug: 'plandis', nome: 'Plandis', classe: 'deus', feriados: [{ dia: 9, mes: 8, nome: 'Festa da Iluminação' }] };
const TODAS = [CRUINE, MAIRA, PALIER, PLANDIS];

describe('o feriado entra no calendário', () => {
  beforeAll(() => window.refazerFeriadosDoCalendario(window.feriadosDasEntidades(TODAS)));

  it('o feriado da entidade cai no dia dele, junto das estações', () => {
    expect(window.feriadosDoDia(1, 13)).toEqual(['Festa do Ciclo Natural da Vida']);
    expect(window.feriadosDoDia(3, 10)).toContain('Festival de Renascimento de Maira');
    expect(window.feriadosDoDia(5, 2)).toEqual(['Solstício de Verão']);
  });
  it('festa de várias datas cai em todas; sem data que o calendário entenda, fica só na ficha', () => {
    expect(window.feriadosDoDia(30, 4)).toContain('Festa da Fartura');
    expect(window.feriadosDoDia(1, 5)).toContain('Festa da Fartura');
    expect(window.feriadosDasEntidades(TODAS).some((f) => f.nome === 'Sem data no calendário')).toBe(false);
  });
  it('mesmo nome e mesmo dia, de duas entidades, aparece uma vez', () => {
    expect(window.feriadosDoDia(9, 8)).toEqual(['Festa da Iluminação']);
  });
  it('o catálogo novo refaz a lista no lugar', () => {
    window.refazerFeriadosDoCalendario(window.feriadosDasEntidades([PALIER]));
    expect(window.feriadosDoDia(1, 13)).toEqual([]);
    expect(window.feriadosDoDia(9, 8)).toEqual(['Festa da Iluminação']);
    window.refazerFeriadosDoCalendario(window.feriadosDasEntidades(TODAS));
  });
});

describe('a página', () => {
  const montar = () => render(<div className="menestrel-ui"><window.EntidadesView lang="pt" entidades={TODAS} /></div>);

  it('mostra o cartão e abre a ficha com uma aba por tópico', () => {
    const { container, getByText } = montar();
    const cartao = [...container.querySelectorAll('.diario-cartao')].find((c) => /Cruine/.test(c.textContent));
    expect(cartao).toBeTruthy();
    expect(cartao.textContent).toMatch(/Deus/);
    fireEvent.click(cartao);
    const abas = [...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim());
    // Prefácio · História · Política (15/11/2026); Locais, Itens e Feriados moram na História.
    // Relíquias com aba própria (17/11/2026): saíram da História.
    expect(abas).toEqual(['Prefácio', 'História', 'Relíquias', 'Política']);
    const historia = [...document.querySelectorAll('.ent-sub')].map((h) => h.textContent);
    expect(historia).toEqual(['Locais', 'Feriados']);
    expect(getByText('Extratos do Livro de Maudi — Biblioteca de Saravossa.')).toBeTruthy();
  });

  it('a busca filtra pelo nome', () => {
    const { container } = montar();
    fireEvent.change(container.querySelector('input'), { target: { value: 'zzz' } });
    expect(container.querySelector('.diario-cartao')).toBeNull();
  });
});

describe('o menu', () => {
  it('o shell roteia a seção para a página', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const shell = readFileSync(resolve(__dirname, '../10-shell/shell.jsx'), 'utf8');
    // conhece (17/11/2026): o Jogador só abre a entidade que o personagem conhece.
    expect(shell).toMatch(/current\.id === 'entidades' \? \([\s\S]{0,300}<EntidadesView lang=\{lang\} trilhoPaginas=\{trilhoPaginas\} conhece=\{conheceNoMundo\('entidade'\)\} \/>/);
  });
});

/* RELIGIÃO (17/11/2026): a aba depois da Política, só quando há texto. */
describe('a religião', () => {
  it('com texto, ganha a aba e o texto', () => {
    const { container } = render(<div className="menestrel-ui"><window.EntidadesView lang="pt" entidades={[{ ...CRUINE, religiao: 'Os fiéis guardam a ampulheta.' }]} /></div>);
    fireEvent.click(container.querySelector('.diario-cartao'));
    const abas = [...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim());
    expect(abas).toEqual(['Prefácio', 'História', 'Relíquias', 'Política', 'Religião']);
    fireEvent.click([...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === 'Religião'));
    expect(document.body.textContent).toMatch(/Os fiéis guardam a ampulheta\./);
  });
  it('o editor tem o campo', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const fonte = readFileSync(resolve(__dirname, 'catalogo-mundo.jsx'), 'utf8');
    expect(fonte).toContain("{ chave: 'religiao', pt: 'Religião', en: 'Religion', tipo: 'area', linhas: 8 }");
  });
});
