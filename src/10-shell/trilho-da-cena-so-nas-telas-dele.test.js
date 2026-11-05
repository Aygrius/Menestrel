/* ============================================================
   trilho-da-cena-so-nas-telas-dele.test.js — o card invisível no topo
   ============================================================
   Pedidos do usuário em 26 e 27/10/2026, o mesmo defeito visto de três
   ângulos:

     "Para o mestre, o trilho [...] só ficará visível quando estiver em
      'cena'." · "Para o jogador, [...] só na mesa."
     "Acima da ficha ainda há um círculo marrom, parece que há um card
      invisível na tela no topo."
     "A ficha do personagem ainda está sendo cortada por algum elemento
      invisível no topo da tela, onde ficava o trilho com a data, local."

   Zerar a `historiaId` não bastava: o CardDataJogoAtual seguia montando —
   `.cdj-root` é fixed no alto — e o trilho vazio punha um chão translúcido
   (e uma âncora de portal para o sino) por cima do começo da ficha. Agora o
   componente só monta nas três telas em que ele tem o que dizer, e o espaço
   de 70px reservado para ele some junto, em qualquer largura.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shell = readFileSync(resolve(__dirname, './shell.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('o trilho da cena', () => {
  it('só monta na mesa, na lista de personagens do Jogador e em Histórias', () => {
    // 02/11/2026: e na ficha, mas SÓ dentro do trilho de baixo (soNoRodape).
    // 04/11/2026: e em Batalha e Loja do Mestre (rodapeDaMesa), também só no
    // trilho de baixo — as três páginas da Mesa dividem o mesmo rodapé.
    expect(shell).toMatch(
      /\{\(telaDaMesa \|\| rodapeDaMesa \|\| current\.id === 'personagens_j' \|\| current\.id === 'historias' \|\| fichaNaTela\) && \(\r?\n\s*<CardDataJogoAtual/
    );
  });

  it('na ficha a faixa só existe no trilho de baixo, nunca fixa no alto', () => {
    expect(shell).toMatch(/if \(soNoRodape && !alvoRodape\) return null;/);
    expect(shell).toMatch(/useAlvoPortal : window\.useAlvoPortal \|\| \(\(\) => null\)\)\('pg-rodape-slot'\)/);
  });

  it('não é mais ligado pela ficha do Jogador', () => {
    // `onNovoPersonagem` acendia o trilho na tela 'ficha' — era de lá que
    // vinha o card invisível.
    expect(shell).not.toMatch(/current\.id === 'personagens_j' \|\| current\.id === 'ficha'/);
  });

  it('o botão escondido não conta como motivo para existir', () => {
    expect(shell).toMatch(/const temBotaoPj = profile === 'player' && !!onNovoPersonagem && !esconderBotaoPersonagem;/);
    expect(shell).toMatch(/if \(!historiaId && !temBotaoPj\) return null;/);
  });

  // O sino saiu do trilho em 30/10/2026 (foi para o menu lateral).
  it('o trilho não tem mais âncora do sino', () => {
    expect(shell).not.toMatch(/id="cdj-sino"/);
  });
});

describe('o espaço reservado para o trilho', () => {
  it('some no desktop também, não só até 1280px', () => {
    // 30/10/2026: o respiro é padding, não margem — a caixa de rolagem vai
    // até a borda da janela e o conteúdo não some numa linha a 20px do topo.
    expect(css).toMatch(/@media \(min-width: 1281px\) \{\r?\n\s*#root:not\(:has\(\.cdj-root:not\(\.cdj-root--rodape\)\)\) \.menestrel-ui \.mc-main \{ margin-top: 0; padding-top: 20px; \}/);
  });

  it('na lista de personagens o respiro vem de dentro, e a margem zera', () => {
    expect(css).toMatch(/#root:not\(:has\(\.cdj-root:not\(\.cdj-root--rodape\)\)\) \.menestrel-ui \.mc-main:has\(\.pjs\) \{ margin-top: 0; padding-top: 0; \}/);
  });

  /* O build de produção junta `.mc-main` e `.mc-main:has(.pjs)` dos 81px num
     `:is(...)`, que empata com as regras de "sem trilho". No empate vence a
     ordem — então a regra sem trilho tem de vir DEPOIS dos 81px (30/10/2026:
     no dev estava certo e o site publicado tinha o vão). */
  it('a regra sem trilho vem depois dos 81px, para vencer também no build', () => {
    const i81 = css.indexOf('#root .menestrel-ui .mc-main:has(.pjs) { margin-top: 81px; }');
    expect(i81, 'a regra dos 81px').toBeGreaterThan(-1);
    const depois = css.slice(i81, css.indexOf('}', css.indexOf('#root:not(:has(.cdj-root:not(.cdj-root--rodape))) .menestrel-ui .mc-main:has(.pjs)', i81)) + 1);
    expect(depois).toMatch(/#root:not\(:has\(\.cdj-root:not\(\.cdj-root--rodape\)\)\) \.menestrel-ui \.mc-main \{ margin-top: 0; padding-top: 20px; \}/);
  });

  it('nenhuma largura volta a usar margem de 20px sem o trilho', () => {
    expect(css).not.toMatch(/#root:not\(:has\(\.cdj-root:not\(\.cdj-root--rodape\)\)\) \.menestrel-ui \.mc-main \{ margin-top: 20px; \}/);
  });
});
