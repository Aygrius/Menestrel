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
    expect(shell).toMatch(
      /\{\(telaDaMesa \|\| current\.id === 'personagens_j' \|\| current\.id === 'historias'\) && \(\r?\n\s*<CardDataJogoAtual/
    );
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

  it('a âncora do sino só existe quando há mesa', () => {
    expect(shell).toMatch(/\{historiaId && <div id="cdj-sino" className="cdj-sino-slot" \/>\}/);
  });
});

describe('o espaço reservado para o trilho', () => {
  it('some no desktop também, não só até 1280px', () => {
    expect(css).toMatch(/@media \(min-width: 1281px\) \{\r?\n\s*#root:not\(:has\(\.cdj-root\)\) \.menestrel-ui \.mc-main \{ margin-top: 20px; \}/);
  });

  it('na lista de personagens o respiro vem de dentro, e a margem zera', () => {
    expect(css).toMatch(/#root:not\(:has\(\.cdj-root\)\) \.menestrel-ui \.mc-main:has\(\.pjs\) \{ margin-top: 0; \}/);
  });
});
