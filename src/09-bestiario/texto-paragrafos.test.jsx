/* ============================================================
   texto-paragrafos.test.jsx — a descrição respeita as quebras de linha
   ============================================================
   Pedido do usuário (11/09/2026): "a descrição das magias, itens, etc,
   devem respeitar a formatação do texto (parágrafos)."

   Antes, os 5 painéis do bestiário faziam `<p>{row.descricao}</p>`. HTML
   colapsa \n em espaço, então um texto de 5 parágrafos virava um bloco
   corrido.

   A regra de quebra saiu dos DADOS, não da convenção Markdown. Levantamento
   do banco em 11/09/2026: 36 magias, 6 criaturas e 1 item têm \n na
   descrição; ZERO registros, em qualquer tabela, usam linha em branco. Quem
   escreveu separa parágrafo com \n simples. Se tratássemos \n como <br> e
   exigíssemos linha em branco para parágrafo, os 43 registros continuariam
   sendo um bloco só — o pedido não teria sido atendido em nenhum deles.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './bestiario.jsx';

let paragrafosDe, TextoDoBanco;
beforeAll(() => {
  paragrafosDe = window.paragrafosDe;
  TextoDoBanco = window.TextoDoBanco;
  expect(paragrafosDe).toBeTypeOf('function');
  expect(TextoDoBanco).toBeTypeOf('function');
});
afterEach(cleanup);

describe('paragrafosDe', () => {
  it('texto de uma linha continua um parágrafo só', () => {
    expect(paragrafosDe('Uma magia simples.')).toEqual(['Uma magia simples.']);
  });

  it('cada quebra abre um parágrafo — é a convenção dos dados', () => {
    expect(paragrafosDe('Primeiro.\nSegundo.\nTerceiro.'))
      .toEqual(['Primeiro.', 'Segundo.', 'Terceiro.']);
  });

  it('linha em branco não cria parágrafo vazio', () => {
    expect(paragrafosDe('Um.\n\n\nDois.')).toEqual(['Um.', 'Dois.']);
  });

  it('CRLF conta igual a LF — o texto pode ter vindo de Windows', () => {
    expect(paragrafosDe('Um.\r\nDois.')).toEqual(['Um.', 'Dois.']);
    expect(paragrafosDe('Um.\rDois.')).toEqual(['Um.', 'Dois.']);
  });

  it('espaço nas pontas de cada parágrafo sai', () => {
    expect(paragrafosDe('  Um.  \n   Dois.   ')).toEqual(['Um.', 'Dois.']);
  });

  it('vazio, só espaço, null e undefined devolvem lista vazia', () => {
    for (const v of ['', '   ', '\n\n', null, undefined]) {
      expect(paragrafosDe(v), JSON.stringify(v)).toEqual([]);
    }
  });

  it('número não quebra a função', () => {
    expect(paragrafosDe(42)).toEqual(['42']);
  });
});

describe('TextoDoBanco', () => {
  const montar = (props) => render(<div className="menestrel-ui"><TextoDoBanco {...props} /></div>);

  it('rende um <p> por parágrafo, não um bloco só', () => {
    montar({ texto: 'Primeiro.\nSegundo.\nTerceiro.', className: 'best-desc' });
    const ps = document.querySelectorAll('p.best-desc');
    expect(ps.length).toBe(3);
    expect(Array.from(ps).map((p) => p.textContent))
      .toEqual(['Primeiro.', 'Segundo.', 'Terceiro.']);
  });

  it('sem texto não renderiza <p> nenhum — nada de parágrafo vazio', () => {
    montar({ texto: '', className: 'best-desc' });
    expect(document.querySelectorAll('p').length).toBe(0);
    cleanup();
    montar({ texto: null, className: 'best-desc' });
    expect(document.querySelectorAll('p').length).toBe(0);
  });

  it('o prefixo entra só no primeiro parágrafo', () => {
    montar({ texto: 'Um.\nDois.', className: 'best-efeito', prefixo: 'Efeito: ' });
    const ps = Array.from(document.querySelectorAll('p.best-efeito'));
    expect(ps[0].textContent).toBe('Efeito: Um.');
    expect(ps[1].textContent, 'o segundo não repete o rótulo').toBe('Dois.');
  });

  // Um caso com a forma do que está no banco: a descrição mais quebrada que
  // existe hoje (Cárcere de Almas) tem 4 quebras, logo 5 parágrafos.
  it('a descrição mais quebrada do banco vira 5 parágrafos', () => {
    const comoNoBanco = ['Linha um.', 'Linha dois.', 'Linha três.', 'Linha quatro.', 'Linha cinco.'].join('\n');
    montar({ texto: comoNoBanco, className: 'best-desc' });
    expect(document.querySelectorAll('p.best-desc').length).toBe(5);
  });
});
