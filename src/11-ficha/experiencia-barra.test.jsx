/* ============================================================
   experiencia-barra.test.jsx — a experiência virou barra clicável
   ============================================================
   "Remova do card dos personagens o botão de dar experiência, ao clicar sobre a
    barra de experiência dentro da ficha o mestre será capaz de aumentar e
    diminuir a experiência como as outras barras." (usuário, 17/09/2026)

   A barra de Estágio já existia, só que muda. Ela é a única do conjunto que
   DESENHA uma coisa e EDITA outra: o preenchimento é o progresso dentro do
   estágio atual (0 → o que falta para o próximo), mas quem se concede é o XP
   TOTAL. Editar o val/max da barra prenderia o Mestre dentro do estágio — e
   conceder experiência é justamente o que faz o personagem sair dele. Daí o
   campo `edit` na barra, que o abrirEdicaoBarra funde no item do popover.

   A ficha inteira só monta com banco; o que dá para montar aqui são as duas
   peças (FichaVitBars e BarEditPopover), e o resto se afirma sobre o fonte —
   mesmo caminho de armadura-karma-ficha.test.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');

let FichaVitBars, BarEditPopover;
beforeAll(() => {
  FichaVitBars = window.FichaVitBars;
  BarEditPopover = window.BarEditPopover;
  expect(FichaVitBars, 'FichaVitBars precisa estar no window').toBeTypeOf('function');
  expect(BarEditPopover, 'BarEditPopover precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

/* Estágio 5 (46..60) com 52 de XP: 6 andados de uma faixa de 14. */
const BARRA_ESTAGIO = {
  key: 'estagio', label: 'Experiência', icon: 'ti-star',
  val: 6, max: 14,
  edit: { val: 52, min: 0, max: 2185 },
};

const linha = () => document.querySelector('.fp-bar-row');
const ANCORA = { left: 100, bottom: 40 };

describe('a barra de Estágio virou clicável', () => {
  it('com o Mestre, ela é um botão de verdade', () => {
    render(<FichaVitBars bars={[BARRA_ESTAGIO]} scope="estagio" en={false} onEdit={() => {}} />);
    expect(linha().classList.contains('is-editable')).toBe(true);
    expect(linha().getAttribute('role')).toBe('button');
  });

  it('sem onEdit (o Jogador), ela continua só mostrando', () => {
    render(<FichaVitBars bars={[BARRA_ESTAGIO]} scope="estagio" en={false} />);
    expect(linha().classList.contains('is-editable')).toBe(false);
    expect(linha().getAttribute('role')).toBeNull();
  });

  it('o clique entrega a barra e o escopo ao pai', () => {
    const chamadas = [];
    render(<FichaVitBars bars={[BARRA_ESTAGIO]} scope="estagio" en={false}
      onEdit={(item, scope) => chamadas.push([item.key, scope])} />);
    act(() => { linha().click(); });
    expect(chamadas).toEqual([['estagio', 'estagio']]);
  });
});

describe('o popover da experiência mexe no XP total', () => {
  const montarPop = (onChange) => render(
    <BarEditPopover item={{ ...BARRA_ESTAGIO, ...BARRA_ESTAGIO.edit }} scope="estagio"
      anchor={ANCORA} lang="pt" onChange={onChange} onClose={() => {}} />
  );
  const rotulo = () => document.querySelector('.fp-pop-stepper-label').textContent;
  const botoes = () => Array.from(document.querySelectorAll('.fp-step-btn'));

  /* "52 / 2185" empurraria o número que interessa para o canto do pill, e o
     teto é o fim da tabela de estágios — não diz nada sobre o personagem. */
  /* A sigla "XP" saiu do pill em 20/09/2026, a pedido do usuário: o seletor
     abre a partir da barra de experiência, então repetir o que se edita é
     redundância. O que o teste guarda continua sendo o mesmo — o pill mostra
     o XP TOTAL, e não o progresso dentro do estágio. */
  it('o pill mostra o XP total, e não val/max', () => {
    montarPop(() => {});
    expect(rotulo()).toBe('52');
  });

  it('o + concede um ponto e avisa o pai', () => {
    const chamadas = [];
    montarPop((...args) => chamadas.push(args));
    act(() => { botoes()[1].click(); });
    expect(rotulo()).toBe('53');
    expect(chamadas).toEqual([['estagio', 'estagio', 53]]);
  });

  it('e o − tira — o Mestre também diminui', () => {
    const chamadas = [];
    montarPop((...args) => chamadas.push(args));
    act(() => { botoes()[0].click(); });
    expect(rotulo()).toBe('51');
    expect(chamadas).toEqual([['estagio', 'estagio', 51]]);
  });

  /* A faixa do popover é 0..teto da tabela, e não o span do estágio: é ela que
     permite ao Mestre empurrar o personagem para o estágio seguinte. */
  it('a faixa vai do zero ao teto da tabela de estágios', () => {
    const chamadas = [];
    render(<BarEditPopover item={{ ...BARRA_ESTAGIO, val: 0, min: 0, max: 2185 }} scope="estagio"
      anchor={ANCORA} lang="pt" onChange={(...a) => chamadas.push(a)} onClose={() => {}} />);
    expect(botoes()[0].disabled).toBe(true);   // no zero não há o que tirar
    expect(botoes()[1].disabled).toBe(false);
  });
});

describe('o contrato dentro da ficha', () => {
  it('a barra de Estágio recebe onEdit quando quem olha é o Mestre', () => {
    const i = fonte.indexOf('const elEstagio =');
    const linha = fonte.slice(i, fonte.indexOf('\n', i));
    expect(linha).toMatch(/onEdit=\{podeEditarEstado \? abrirEdicaoBarra : undefined\}/);
  });

  it('e leva a faixa de edição: XP total, do zero ao teto da tabela', () => {
    const i = fonte.indexOf('const estagioBars = [{');
    const trecho = fonte.slice(i, fonte.indexOf('}];', i));
    expect(trecho).toMatch(/edit: \{ val: xpTotal, min: 0, max: xpMaximo \}/);
  });

  it('abrirEdicaoBarra funde `edit` no item — senão o popover editaria a barra', () => {
    const i = fonte.indexOf('const abrirEdicaoBarra =');
    const trecho = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(trecho).toMatch(/item\.edit \? \{ \.\.\.item, \.\.\.item\.edit \} : item/);
  });

  /* O XP é COLUNA da tabela, não mora em estado_atual como as outras barras —
     mandá-lo pelo caminho comum gravaria um `vitalidade.estagio` inútil. */
  it('aplicarEstado desvia o escopo estagio para o salvar da experiência', () => {
    const i = fonte.indexOf('const aplicarEstado = (scope, key, val) => {');
    const trecho = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(trecho).toMatch(/if \(scope === 'estagio'\) \{ salvarExperiencia\(val\); return; \}/);
  });

  it('e o salvar escreve personagens.experiencia', () => {
    const i = fonte.indexOf('const salvarExperiencia = async');
    const trecho = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(trecho).toMatch(/from\('personagens'\)\.update\(\{ experiencia: xp \}\)/);
    expect(trecho).toMatch(/podeEditarEstado/); // só o Mestre
  });
});
