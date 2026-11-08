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

const cruine = () => window.ENTIDADES.find((e) => e.slug === 'cruine');

describe('o catálogo', () => {
  it('as sete entidades, todas com os tópicos preenchidos', () => {
    const slugs = window.ENTIDADES.map((e) => e.slug).sort();
    expect(slugs).toEqual(['cruine', 'heldrom', 'maira', 'mocna', 'palier', 'plandis', 'ricutatis']);
    for (const e of window.ENTIDADES) {
      expect(window.ENTIDADE_CLASSES[e.classe], e.slug).toBeTruthy();
      expect(e.prefacio.texto.length, e.slug).toBeGreaterThan(200);
      for (const k of ['relacoes', 'locais', 'feriados', 'itens']) expect(e[k].length, e.slug + '.' + k).toBeGreaterThan(0);
    }
  });

  it('Cruine tem os sete tópicos pedidos', () => {
    const c = cruine();
    expect(c.nome).toBe('Cruine');
    expect(c.prefacio.texto.length).toBeGreaterThan(200);
    expect(c.prefacio.fonte).toMatch(/Livro de Maudi/);
    expect(c.descricao.split('\n').length).toBeGreaterThan(3);
    for (const k of ['relacoes', 'locais', 'feriados', 'itens']) expect(c[k].length, k).toBeGreaterThan(0);
  });
});

describe('o feriado entra no calendário', () => {
  /* A lista EXATA do dia: o nome antigo, que juntava as duas festas ("Dia de
     Cruine e Retorno da Escuridão"), não pode voltar. */
  it('a Festa do Ciclo Natural da Vida cai no último dia do ano, junto do Retorno à Escuridão', () => {
    expect(window.feriadosDoDia(1, 13)).toEqual(['Retorno à Escuridão', 'Festa do Ciclo Natural da Vida']);
  });

  /* Lote de 08/11/2026: Maira, Palier, Plandis, Ricutatis, Mocna, Heldrom. */
  it('o Renascimento de Maira cai no 3 do mês da Rosa, como diz o livro (era 3/8)', () => {
    expect(window.feriadosDoDia(3, 10)).toContain('Festival de Renascimento de Maira');
    expect(window.feriadosDoDia(3, 8)).toEqual([]);
  });
  it('a Festa da Iluminação, de Palier e de Plandis, aparece uma vez no calendário', () => {
    expect(window.feriadosDoDia(9, 8)).toEqual(['Festa da Iluminação']);
  });
  it('Maira Nil e a Prisão Dourada voltam a ser duas festas', () => {
    expect(window.feriadosDoDia(20, 9).sort()).toEqual(['Adoração a Maira Nil', 'Prisão Dourada']);
  });
  it('a Noite dos Perversos cai em toda passagem de mês, nunca na noite de Cruine', () => {
    for (let m = 1; m <= 12; m++) expect(window.feriadosDoDia(30, m), 'mês ' + m).toContain('Noite dos Perversos');
    expect(window.feriadosDoDia(1, 13)).not.toContain('Noite dos Perversos');
  });
  it('as entidades novas trazem os seus feriados', () => {
    expect(window.feriadosDoDia(2, 8)).toContain('Festa do Ódio');          // Mocna
    expect(window.feriadosDoDia(29, 12)).toContain('Grande Queda');         // Heldrom
    expect(window.feriadosDoDia(10, 9)).toContain('Renascimento');          // Heldrom
    expect(window.feriadosDoDia(6, 9)).toContain('Dia da Magia');           // Palier
    expect(window.feriadosDoDia(19, 7)).toContain('Representação de Plandis');
  });
});

describe('a página', () => {
  const montar = () => render(<div className="menestrel-ui"><window.EntidadesView lang="pt" /></div>);

  it('mostra o cartão e abre a ficha com uma aba por tópico', () => {
    const { container, getByText } = montar();
    const cartao = container.querySelector('.diario-cartao');
    expect(cartao.textContent).toMatch(/Cruine/);
    expect(cartao.textContent).toMatch(/Deus/);
    fireEvent.click(cartao);
    const abas = [...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim());
    expect(abas).toEqual(['Prefácio', 'Descrição', 'Relações', 'Locais', 'Feriados', 'Itens']);
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
    expect(shell).toMatch(/current\.id === 'entidades' \? \([\s\S]{0,300}<EntidadesView lang=\{lang\} trilhoPaginas=\{trilhoPaginas\} \/>/);
  });
});
