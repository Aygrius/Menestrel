/* ============================================================
   calendario-navegacao.test.js — meses e ano no calendário do jogo
   ============================================================
   Pedido do usuário (04/11/2026): "melhore com impeccable o calendário
   quando abre, principalmente a navegação dos meses e ano." E, no mesmo
   pedido: "o menu dos ícones do tempo do rodapé está abrindo para baixo,
   portanto não consigo clicar neles." Conferido na prévia: virar o ano pelo
   mês, a grade dos meses no espaço dos dias, Hoje, e as listas do rodapé
   subindo.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shell = readFileSync(resolve(__dirname, 'shell.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('a navegação do calendário', () => {
  it('as setas do mês viram o ano — só para o Mestre', () => {
    expect(shell).toMatch(/if \(m < 1\) \{ if \(!podeEditar \|\| a <= 0\) return; m = totalMeses; a -= 1; \}/);
    expect(shell).toMatch(/if \(m > totalMeses\) \{ if \(!podeEditar\) return; m = 1; a \+= 1; \}/);
  });

  it('o mês é o título, e clicar nele abre a grade dos treze', () => {
    expect(shell).toMatch(/className=\{'cal-nav-titulo' \+ \(escolhendoMes \? ' is-aberto' : ''\)\}/);
    expect(shell).toMatch(/<div className="cal-meses-grade" role="listbox"/);
    // O Dia de Cruine (um dia só) ocupa a fileira inteira.
    expect(shell).toMatch(/\(m\.dias === 1 \? ' is-dia-avulso' : ''\)/);
    expect(css).toMatch(/\.cal-meses-casa\.is-dia-avulso \{ grid-column: 1 \/ -1; \}/);
  });

  it('a grade abre no espaço dos dias: a medida da janela é travada', () => {
    expect(shell).toMatch(/setMedidaTravada\(\{ width: Math\.ceil\(r\.width\), height: Math\.ceil\(r\.height\) \}\)/);
    expect(shell).toMatch(/<div className="cal-modal" ref=\{modalRef\} style=\{medidaTravada \|\| undefined\}>/);
  });

  it('o ano tem linha própria, editável pelo Mestre e lido pelo Jogador', () => {
    expect(shell).toMatch(/<input className="cal-nav-ano-num" type="text" inputMode="numeric" value=\{anoTxt\}/);
    expect(shell).toMatch(/<span className="cal-nav-ano-num is-leitura">\{anoFoco\}<\/span>/);
  });

  it('Hoje aparece fora do mês da data atual e volta a ele', () => {
    expect(shell).toMatch(/\{hoje && \(hoje\.mes !== mesFoco \|\| hoje\.ano !== anoFoco\) && \(/);
    expect(shell).toMatch(/irParaMes\(hoje\.mes, hoje\.ano\)/);
  });

  it('o trilho antigo de quatro setas saiu', () => {
    expect(shell).not.toMatch(/cal-trilho-btn|ti-chevrons-left/);
    expect(css).not.toMatch(/\.cal-trilho-btn|\.cal-trilho-rotulo/);
  });
});

describe('as listas da faixa da data no rodapé', () => {
  it('abrem para cima, e a do lugar se ancora pela direita', () => {
    expect(css).toMatch(/\.cdj-root--rodape \.cdj-tempo-lista,\s*\n\.menestrel-ui\.cdj-root\.cdj-root--rodape \.cdj-hora-lista,\s*\n\.menestrel-ui\.cdj-root\.cdj-root--rodape \.cdj-local-lista \{\s*top: auto; bottom: calc\(100% \+ 6px\);/);
    expect(css).toMatch(/\.cdj-root--rodape \.cdj-local-lista \{ left: auto; right: 0; \}/);
  });
});
