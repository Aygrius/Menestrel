/* ============================================================
   propostas-quadro.test.js — as propostas no desenho do sistema
   ============================================================
   Pedido do usuário (04/11/2026): "Melhore a tela de proposta esperando o
   mestre e proposta esperando o jogador, padronize com base em nossos
   sistema." A lista num .mn-quadro com dois grupos e o painel da proposta
   escolhida, como a aba Loja ao lado. Conferido no navegador (prévia com
   &propostas=1): as três situações — esperando você, esperando o jogador e
   contrapropondo.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fonte = readFileSync(resolve(__dirname, 'estoque-mestre.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('as propostas do Estoque', () => {
  it('lista e painel, no esqueleto do baú', () => {
    expect(fonte).toMatch(/<div className="bau-corpo bau-corpo--painel estoque-props">/);
    expect(fonte).toMatch(/<div className="mn-quadro estoque-props-quadro">/);
    expect(fonte).toMatch(/<aside className="bau-painel loja-painel"/);
  });

  it('dois grupos rotulados, com a contagem', () => {
    expect(fonte).toMatch(/grupoDePropostas\(en \? 'Waiting for you' : 'Esperando você', pendentes,/);
    expect(fonte).toMatch(/grupoDePropostas\(en \? 'Waiting for the player' : 'Esperando o jogador', aguardando,/);
    expect(fonte).toMatch(/<span className="mn-rotulo estoque-prop-conta">\{lista\.length\}<\/span>/);
  });

  it('a linha é escolhível (radio) e a escolhida acende', () => {
    expect(fonte).toMatch(/role="radio" aria-checked=\{on\}/);
    expect(fonte).toMatch(/'mn-quadro-linha estoque-prop-linha' \+ \(on \? ' on' : ''\)/);
  });

  it('o painel mostra o passe e, na vez do Mestre, as três respostas no pé', () => {
    expect(fonte).toMatch(/<div className="mn-passe estoque-prop-passe">/);
    expect(fonte).toMatch(/responder\(p, 'recusar'\)/);
    expect(fonte).toMatch(/responder\(p, 'aceitar'\)/);
    expect(fonte).toMatch(/responder\(p, 'contrapropor'\)/);
    // Recusar é o único em brasa.
    expect(css).toMatch(/\.estoque-prop-recusar \{ color: var\(--alerta\);/);
  });

  it('o cartão antigo saiu', () => {
    expect(fonte).not.toMatch(/cartaoProposta/);
    expect(css).not.toMatch(/\.estoque-props-col|\.estoque-prop-top/);
  });
});

/* "A lista suspensa de 'guardar em' em propostas está fora de padrão"
   (usuário, 04/11/2026): o dropdown do sistema, não o <select> nativo. */
describe('o Guardar em', () => {
  it('é o SelectPill, com o nativo só de reserva', () => {
    expect(fonte).toMatch(/\{SelectPill \? \(\s*<SelectPill value=\{destinoDe\(p\)\}/);
  });
});
