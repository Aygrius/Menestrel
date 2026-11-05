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
   peças (FichaVitBars e BarraAjusteModal), e o resto se afirma sobre o fonte —
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
// A janela do sistema (ModalShell) mora no shell (04/11/2026).
import '../10-shell/shell.jsx';
import './ficha.jsx';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');

let FichaVitBars, BarraAjusteModal;
beforeAll(() => {
  FichaVitBars = window.FichaVitBars;
  BarraAjusteModal = window.BarraAjusteModal;
  expect(FichaVitBars, 'FichaVitBars precisa estar no window').toBeTypeOf('function');
  expect(BarraAjusteModal, 'BarraAjusteModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

/* Estágio 5 (46..60) com 52 de XP: 6 andados de uma faixa de 14. */
const BARRA_ESTAGIO = {
  key: 'estagio', label: 'Experiência', icon: 'ti-star',
  val: 6, max: 14,
  edit: { val: 52, min: 0, max: 2185 },
};

const linha = () => document.querySelector('.fp-bar-row');

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

/* "Remova o nome das barras da ficha (ef, eh, etc), adicione um tooltip para
   informar o que é a barra." (usuário, 27/09/2026) */
describe('as barras da ficha não levam nome — ele vai para o tooltip', () => {
  it('com semNome, não há rótulo visível e o pill se chama pelo nome', () => {
    render(<FichaVitBars bars={[BARRA_ESTAGIO]} scope="estagio" semNome en={false} onHover={() => {}} />);
    expect(document.querySelector('.fp-bar-name-label')).toBeNull();
    expect(document.querySelector('.fp-bar-pill').getAttribute('aria-label')).toBe('Experiência');
  });

  it('o tooltip diz o nome e, na Experiência, o XP total', () => {
    const dicas = [];
    render(<FichaVitBars bars={[BARRA_ESTAGIO]} scope="estagio" semNome en={false}
      onHover={(e, tip) => dicas.push(tip)} />);
    act(() => { document.querySelector('.fp-bar-pill').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(dicas[0]).toEqual({ title: 'Experiência', desc: '52 XP' });
  });

  /* A Vitalidade virou tubos com nome embaixo (23/10/2026, ver
     tubos-medalhoes.test.jsx); a Experiência segue barra sem nome. */
  it('Experiência passa semNome', () => {
    for (const el of ['const elEstagio =']) {
      const i = fonte.indexOf(el);
      expect(fonte.slice(i, fonte.indexOf('\n', i))).toMatch(/ semNome /);
    }
  });
});

/* A JANELA DO SISTEMA NO LUGAR DO POPOVER (04/11/2026, usuário: "Ao invés de
   aparecer uma pílula despadronizada, eu quero um modal padronizado do
   sistema"). O que se guarda continua: na experiência, o XP TOTAL, do zero ao
   teto da tabela. O que muda: grava uma vez, no Aplicar do rodapé. */
describe('a janela da experiência mexe no XP total', () => {
  const montar = (onChange, extra = {}) => render(
    <BarraAjusteModal item={{ ...BARRA_ESTAGIO, ...BARRA_ESTAGIO.edit, ...extra }} scope="estagio"
      lang="pt" onChange={onChange} onClose={() => {}} />
  );
  const celula = (rotulo) => [...document.querySelectorAll('.barra-ajuste-passe .mn-celula')]
    .find((c) => c.querySelector('.mn-rotulo').textContent === rotulo).querySelector('.mn-celula-valor');
  const botoes = () => Array.from(document.querySelectorAll('.barra-ajuste-stepper .fp-step-btn'));
  const aplicar = () => [...document.querySelectorAll('.ms-footer button')].find((b) => b.textContent === 'Aplicar');

  it('é a janela do sistema, com o nome da barra no título', () => {
    montar(() => {});
    expect(document.querySelector('.barra-ajuste-modal')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Experiência/);
  });

  it('o passe mostra o XP TOTAL e o estágio — não o progresso nem o teto da tabela', () => {
    montar(() => {});
    expect(celula('Atual').textContent).toBe('52');
    expect(celula('Estágio').textContent).toBe('5');
    expect(document.body.textContent).not.toMatch(/2185/);
  });

  it('o + concede um ponto, mas só o Aplicar avisa o pai', () => {
    const chamadas = [];
    montar((...args) => chamadas.push(args));
    expect(aplicar().disabled).toBe(true);           // nada mudou ainda
    act(() => { botoes()[1].click(); });
    expect(celula('Novo').textContent).toMatch(/^53\+1$/);
    expect(chamadas).toEqual([]);
    act(() => { aplicar().click(); });
    expect(chamadas).toEqual([['estagio', 'estagio', 53]]);
  });

  it('e o − tira — o Mestre também diminui', () => {
    const chamadas = [];
    montar((...args) => chamadas.push(args));
    act(() => { botoes()[0].click(); });
    act(() => { aplicar().click(); });
    expect(chamadas).toEqual([['estagio', 'estagio', 51]]);
  });

  /* O SELETOR PADRÃO, INTACTO (04/11/2026, usuário: "o número no centro do
     seletor de quantidade está diferente, nós temos um seletor de quantidade
     padrão do sistema"). Ele chegou a ter um campo digitável no meio, com
     caixa própria; saiu. */
  it('é o seletor do sistema, com o número simples no meio', () => {
    montar(() => {});
    expect(document.querySelector('.barra-ajuste-stepper input')).toBeNull();
    expect(document.querySelector('.barra-ajuste-stepper .fp-pop-stepper-label').textContent).toBe('52');
  });

  /* A faixa é 0..teto da tabela, e não o span do estágio: é ela que permite
     ao Mestre empurrar o personagem para o estágio seguinte. */
  it('a faixa vai do zero ao teto da tabela de estágios', () => {
    montar(() => {}, { val: 0 });
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
