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
  /* 13/11/2026: os oito deuses que faltavam do deuses.pdf (Crizagom, Ganis,
     Lena, Liris, Parom, Quiris, Selimom e Sevides) — o livro inteiro. */
  /* 13/11/2026, mais tarde: os sete príncipes que faltavam do principes.pdf
     (Diatrimis, Ekisis, Fulvina, Morrigalti, Seinoniz, Udoviom e Vouxiz). */
  it('as vinte e oito entidades, todas com os tópicos preenchidos', () => {
    const slugs = window.ENTIDADES.map((e) => e.slug).sort();
    expect(slugs).toEqual(['anasmadis', 'antredom', 'blator', 'branaxis', 'cambu', 'crezir', 'crizagom', 'cruine', 'diatrimis', 'ekisis', 'fulvina', 'ganis', 'heldrom', 'lena', 'liris', 'maira', 'mocna', 'morrigalti', 'palier', 'parom', 'plandis', 'quiris', 'ricutatis', 'seinoniz', 'selimom', 'sevides', 'udoviom', 'vouxiz']);
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
    expect(window.feriadosDoDia(1, 13).sort()).toEqual(['Festa do Ciclo Natural da Vida', 'Retorno à Escuridão']);
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
  /* Os feriados dos oito deuses saíram da lista fixa (13/11/2026): cada um
     aparece UMA vez, vindo da entidade, com o nome do livro. */
  it('os feriados dos deuses novos aparecem uma vez, com o nome do livro', () => {
    const casos = [
      [1, 2, 'Dia do Mar'], [11, 2, 'Festa da Carne'], [9, 3, 'Vitória da Justiça'],
      [15, 3, 'Festa da Prosperidade'], [20, 3, 'Dia do Amor e da Paz'], [7, 4, 'Festa da Fertilidade'],
      [13, 4, 'Festival da Purificação de Parom'], [20, 6, 'Jornada de Paz'], [24, 6, 'Festa dos Artífices'],
      [30, 6, 'Festa da Colheita'], [1, 7, 'Noite dos Prazeres'], [4, 9, 'Memorial dos Ancestrais'],
      [1, 10, 'Festa do Plantio'], [12, 10, 'Festa dos Amantes'], [26, 11, 'Dia da Sobra'],
      [16, 12, 'Festa dos Povos'], [29, 12, 'Noite dos Justos'],
    ];
    for (const [d, m, nome] of casos) {
      expect(window.feriadosDoDia(d, m).filter((n) => n === nome), nome).toHaveLength(1);
    }
    expect(window.feriadosDoDia(13, 4)).not.toContain('Festa da Purificação de Parom');
  });
  it('os feriados dos príncipes novos entram no calendário uma vez', () => {
    const casos = [
      [20, 9, 'Prisão Dourada'], [1, 13, 'Retorno à Escuridão'], [1, 7, 'Dia dos Espelhos'],
      [22, 1, 'Festival da Destruição e da Guerra'], [10, 3, 'Noite das Máscaras'],
      [21, 5, 'Noite dos Esquecidos'], [15, 11, 'Dia da Contaminação'],
      [3, 2, 'Ritos das Brumas'], [8, 5, 'Noite da Cobiça'],
    ];
    for (const [d, m, nome] of casos) {
      expect(window.feriadosDoDia(d, m).filter((n) => n === nome), nome).toHaveLength(1);
    }
  });
  it('as entidades novas trazem os seus feriados', () => {
    expect(window.feriadosDoDia(2, 8)).toContain('Festa do Ódio');          // Mocna
    expect(window.feriadosDoDia(29, 12)).toContain('Grande Queda');         // Heldrom
    expect(window.feriadosDoDia(10, 9)).toContain('Renascimento');          // Heldrom
    expect(window.feriadosDoDia(6, 9)).toContain('Dia da Magia');           // Palier
    expect(window.feriadosDoDia(19, 7)).toContain('Representação de Plandis');
  });

  /* Lote de 08/11/2026 (2): Blator, Cambu, Crezir, Anasmadis, Antredom, Branaxis.
     Os feriados dos três deuses estavam fixos no calendário; agora vêm só da
     entidade, sem aparecer em dobro. */
  it('os feriados dos deuses do segundo lote aparecem uma vez, com o nome do livro', () => {
    expect(window.feriadosDoDia(2, 1)).toEqual(['Festival da Bênção Militar']);
    expect(window.feriadosDoDia(27, 10)).toEqual(['Festival da Vitória']);
    expect(window.feriadosDoDia(12, 1)).toEqual(['Amor da Deusa']);
    // A Noite dos Esquecidos, de Seinoniz, cai de propósito no mesmo dia
    // (13/11/2026): o livro a põe contra o pedido de prosperidade a Cambu.
    expect(window.feriadosDoDia(21, 5).sort()).toEqual(['Dia da Multiplicação', 'Noite dos Esquecidos']);
    expect(window.feriadosDoDia(1, 5)).toEqual(['Festa da Fartura']);
    expect(window.feriadosDoDia(30, 4).filter((n) => n === 'Festa da Fartura')).toHaveLength(1);
    expect(window.feriadosDoDia(30, 4)).toContain('Banquete dos Famintos');
  });
  it('os príncipes do segundo lote trazem os seus feriados', () => {
    expect(window.feriadosDoDia(11, 10)).toContain('Dia dos Tolos');        // Anasmadis
    expect(window.feriadosDoDia(30, 6)).toContain('Banquete dos Famintos'); // Antredom
    expect(window.feriadosDoDia(21, 3)).toContain('Noite do Pesadelo');     // Branaxis
  });
});

describe('a página', () => {
  const montar = () => render(<div className="menestrel-ui"><window.EntidadesView lang="pt" /></div>);

  it('mostra o cartão e abre a ficha com uma aba por tópico', () => {
    const { container, getByText } = montar();
    // Os cartões vêm em ordem alfabética: Cruine não é mais o primeiro.
    const cartao = [...container.querySelectorAll('.diario-cartao')].find((c) => /Cruine/.test(c.textContent));
    expect(cartao).toBeTruthy();
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
