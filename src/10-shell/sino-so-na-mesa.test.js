/* ============================================================
   sino-so-na-mesa.test.js — o sino do Jogador e o círculo marrom
   ============================================================
   Pedido do usuário (26/10/2026): "o ícone de notificação vai ficar apenas na
   página 'mesa' para o jogador." A primeira volta só zerou a HISTÓRIA que o
   sino escuta — o botão continuava sendo montado, e como ele mora por portal
   na barra de ações da ficha, sobrava no topo dela uma barra redonda com um
   botão só: "onde ficava o trilho no topo fica um círculo marrom e o
   espaçamento não diminuiu" (usuário, no mesmo dia).

   Agora o componente inteiro não monta fora da mesa, a barra fica vazia e o
   `:empty` do CSS a tira da tela — com o espaço dela junto.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shell = readFileSync(resolve(__dirname, './shell.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

/* ── E NA FICHA DO JOGADOR, DENTRO DA MESA (28/10/2026) ───────────────────
   "Na página ficha, o botão de notificação não aparece no trilho." (usuário)

   O sino já sabia ir para o trilho da ficha desde 28/10 de manhã — mas o
   componente que o desenha não montava ali: para o Jogador, `telaDaMesa` é só
   a tela Aventuras.

   O medo de 26/10 continua respeitado. O que fazia o círculo marrom era o
   sino SOZINHO numa barra redonda; `fichaAtiva && mesaAtivaId` garante o
   contrário — a ficha montada, dentro de uma mesa, tem o trilho de verdade
   (Status, Atividades, Habilidades, Magias, Itens) para recebê-lo. */
/* ── NO MENU LATERAL, PARA OS DOIS (30/10/2026) ───────────────────────────
   "O botão de notificação, tanto para mestre como para jogador, vai sair do
   trilho e vai ficar no menu lateral esquerdo." (usuário)

   O círculo marrom de 26/10 era o sino SOZINHO numa barra redonda. No menu
   lateral ele é uma linha entre as outras, e o menu está em toda tela da
   mesa — então a trava por tela sai, e fica só a de haver mesa. */
describe('a central de mensagens do Jogador', () => {
  it('é montada sempre que há mesa, para Mestre e Jogador', () => {
    expect(shell).toMatch(/\{mesaAtivaId && \(\r?\n\s*<CentralMensagens/);
  });

  it('desenha só no menu lateral — nada de trilho da cena nem da ficha', () => {
    expect(shell).toMatch(/const alvoBarra = alvoLateral;/);
    expect(shell).not.toMatch(/useAlvoPortal\('cdj-sino'\)/);
    expect(shell).not.toMatch(/useAlvoPortal\('fp-acoes-ficha'\)/);
  });

  it('o lugar do sino no menu existe para os dois papéis', () => {
    expect(shell).toMatch(/\{mesaAtivaId && \(\r?\n\s*<>\r?\n\s*<div className="mc-nav-regua" role="separator" \/>\r?\n\s*<div id="mc-sino-lateral"/);
  });

  /* Com o menu recolhido, todo `.mc-navitem > span` some (é o nome do item).
     O contador não pode ser um deles. */
  it('o contador não é span, para sobreviver ao menu recolhido', () => {
    expect(shell).toMatch(/<b className="cm-nav-badge">/);
  });

  it('montada, escuta a mesa ativa sem condicional própria', () => {
    expect(shell).toMatch(/<CentralMensagens[\s\S]{0,200}?historiaId=\{mesaAtivaId\}/);
  });
});

describe('a barra de ações vazia não ocupa espaço', () => {
  it('o trilho do console some quando ninguém porta nada nele', () => {
    expect(css).toMatch(/\.mc-acoes-ficha:empty \{ display: none; \}/);
  });

  it('a fileira do herói some junto, sem deixar o respiro reservado', () => {
    expect(css).toMatch(/\.fp3-heroi:not\(:has\(\.mc-acoes-ficha > \*\)\) \{ display: none; \}/);
  });
});
