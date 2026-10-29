/* ============================================================
   menu-lateral-clicavel.test.js — o botão inteiro recebe o clique
   ============================================================
   Pedido do usuário (27/10/2026, duas vezes): "quando eu passo o mouse sob os
   ícones do menu lateral à esquerda, ele expande, depois quando eu passo o
   mouse sob o texto, eu só consigo clicar no menu quando o mouse está sob o
   ícone e não sob o texto" · "precisa ser possível clicar em todo o campo do
   botão quando ele expande, inclusive na seta para baixo".

   O menu recolhido mede 72px e, aberto, cresce para 232 POR CIMA da página —
   a margem negativa mantém os 72 no fluxo para o conteúdo não andar. Essa
   tira invadida é o lugar onde o clique se perde, e ela teve DUAS camadas por
   cima, cada uma explicando metade do sintoma:

     1. os cards de Amigos, em `left: 80px`, z-index 71 e `pointer-events:
        auto` — cobriam de 80 a 132 (corrigido deslizando a coluna);
     2. `.mc-main:has(.pjs)`, que sobe para z-index 60 — o MESMO da barra. Em
        empate de z-index quem ganha é a ordem no DOM, e o conteúdo vem
        depois: ele ficava por cima da tira INTEIRA, inclusive da seta. Como
        não tem fundo ali, o menu continuava visível e o clique ia parar nele.

   Medido no navegador, sobre um item aberto: antes, o ícone chegava ao item e
   o texto e a seta chegavam ao `.mc-main`; depois, uma varredura de ponta a
   ponta do botão não acha nenhum intruso.

   O que este arquivo guarda é a REGRA que faz isso valer: o menu passa por
   cima do conteúdo por desenho, então tem de estar acima de qualquer camada
   dele — e não empatado com uma.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
/* Sem os comentários: este arquivo EXPLICA as regras que mede, e a explicação
   cita os seletores. Procurar no texto cru acha a frase e lê o bloco errado —
   foi o que aconteceu na primeira versão deste teste. */
const regras = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* O z-index declarado para um seletor, no bloco em que ele aparece. Sem
   regex montada em texto: procura o seletor, pega o bloco `{…}` logo depois e
   lê o z-index dali. `ultimo` serve para o seletor que o arquivo declara mais
   de uma vez — vale o que vence na cascata, o de baixo. */
const zDe = (seletor, { ultimo = true } = {}) => {
  const achados = [];
  let i = regras.indexOf(seletor);
  while (i !== -1) {
    const abre = regras.indexOf('{', i);
    const fecha = regras.indexOf('}', abre);
    if (abre !== -1 && fecha !== -1 && regras.slice(i, abre).indexOf('}') === -1) {
      const m = regras.slice(abre, fecha).match(/z-index:\s*(\d+)/);
      if (m) achados.push(Number(m[1]));
    }
    i = regras.indexOf(seletor, i + seletor.length);
  }
  if (!achados.length) return null;
  return ultimo ? achados[achados.length - 1] : Math.max(...achados);
};

describe('o menu lateral fica acima do conteúdo', () => {
  it('a barra tem z-index maior que o do conteúdo que mais sobe', () => {
    // A barra pelo MENOR dos seus (os dois blocos de menu lateral têm de
    // vencer); o conteúdo pelo MAIOR, que é quem disputa.
    const barra = zDe('.mc-sidebar { flex: 0 0 72px');
    const conteudo = zDe('.mc-main:has(.pjs)', { ultimo: false });
    expect(barra, 'não achei o z-index da barra').toBeTypeOf('number');
    expect(conteudo, 'não achei o z-index do .mc-main:has(.pjs)').toBeTypeOf('number');
    /* Maior, e não "maior ou igual": em empate decide a ordem no DOM, e o
       conteúdo vem depois da barra. Empate aqui é o bug. */
    expect(barra).toBeGreaterThan(conteudo);
  });

  /* Os véus fixos (Central de Mensagens, atalhos, rolagem, amigos) ficam
     ACIMA da barra de propósito — mas são atravessáveis a clique na raiz, e
     por isso não roubam nada. Se um deles perder o `pointer-events: none`,
     volta a cobrir o menu. */
  it('e os véus que ficam acima dela são atravessáveis a clique', () => {
    for (const raiz of ['cm-root', 'rl-root', 'at-root', 'amg-root']) {
      const re = new RegExp('\\.menestrel-ui\\.' + raiz + ' \\{[^}]*\\}');
      const bloco = css.match(re);
      expect(bloco, raiz).toBeTruthy();
      expect(bloco[0], raiz + ' sem pointer-events: none').toMatch(/pointer-events:\s*none/);
    }
  });

  /* A coluna de amigos é a única que mora na faixa invadida: ela desliza os
     mesmos 160px que o menu cresce. */
  it('a coluna de amigos sai da faixa que o menu invade', () => {
    expect(css).toContain('{ --amg-esq: 240px; }');
    // 240 > 232, que é onde a barra aberta termina (72 + 160).
    expect(css).toContain('flex-basis: 232px; margin-right: -160px;');
  });
});
