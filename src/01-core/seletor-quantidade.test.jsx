/* ============================================================
   seletor-quantidade.test.jsx — um desenho só para "quantos?"
   ============================================================
   "O seletor de quantidade padrão do nosso sistema é o que está sendo usado na
    hora de clicar em uma barra de ef, eh, etc. Por isso, onde houver seletor de
    quantidade, use esse design. Seja para selecionar quantidade de itens,
    status, loja." (usuário, 17/09/2026)

   Havia CINCO desenhos para a mesma pergunta:

     1. .fp-pop-stepper, do BarEditPopover (11-ficha) — o eleito;
     2. .qty-stepper-pill (12-batalha), copiado tal e qual em 13-diario —
        quase igual, com borda e 8px mais baixo;
     3. um pill de estilo inline no modal de quantidade do inventário;
     4. a loja, que nem stepper era: dois botões com uma BARRA arrastável no
        meio, como controle de volume;
     5. o modal de status, um <input type="number"> nu.

   Agora é um componente só, em 01-core — a fase que carrega antes de todas as
   outras, para que ninguém precise copiá-lo de novo. Este arquivo trava o
   comportamento dele E o fato de as cinco telas o consumirem: a segunda parte
   é o que impede a sexta cópia de nascer.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fonte = (p) => readFileSync(resolve(raiz, p), 'utf8');

/* As asserções de "não existe mais" olham o CÓDIGO, não a prosa: os
   comentários que explicam a mudança citam os nomes antigos de propósito, e
   uma busca crua acusava o próprio registro histórico. */
const semComentarios = (p) => fonte(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

let QuantidadeStepper;
beforeAll(() => {
  QuantidadeStepper = window.QuantidadeStepper;
  expect(QuantidadeStepper, 'o seletor precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const montar = (props) => {
  const vistos = [];
  render(<QuantidadeStepper value={3} onChange={(v) => vistos.push(v)} {...props} />);
  return vistos;
};
const botoes = () => Array.from(document.querySelectorAll('.fp-step-btn'));
const centro = () => document.querySelector('.fp-pop-stepper-label').textContent;
const clicar = (i) => act(() => { botoes()[i].click(); });

describe('o desenho', () => {
  /* É o do BarEditPopover: pill com − à esquerda, valor no meio, + à direita.
     Nada de input digitável, que era o desenho do modal de status. */
  it('é o pill do BarEditPopover, com os dois botões e o valor no meio', () => {
    montar();
    expect(document.querySelector('.fp-pop-stepper')).toBeTruthy();
    expect(botoes()).toHaveLength(2);
    expect(botoes()[0].getAttribute('aria-label')).toBe('-');
    expect(botoes()[1].getAttribute('aria-label')).toBe('+');
    expect(centro()).toBe('3');
    expect(document.querySelector('input')).toBeNull();
  });

  /* O centro é livre porque cada tela diz o teto à sua maneira: a ficha
     "12 / 18", o inventário "3 de 5", a loja "3 de ∞", o status só o número. */
  it('o texto do meio pode vir de fora', () => {
    montar({ centro: '3 / 18' });
    expect(centro()).toBe('3 / 18');
  });
});

describe('o comportamento', () => {
  it('o + soma e o − subtrai', () => {
    const vistos = montar();
    clicar(1);
    clicar(0);
    expect(vistos).toEqual([4, 2]);
  });

  it('respeita o piso e o teto', () => {
    expect(montar({ value: 1, min: 1 })[0]).toBeUndefined();
    expect(botoes()[0].disabled).toBe(true);
    cleanup();
    expect(montar({ value: 5, max: 5 })[0]).toBeUndefined();
    expect(botoes()[1].disabled).toBe(true);
  });

  it('sem teto, o + nunca trava', () => {
    montar({ value: 9999 });
    expect(botoes()[1].disabled).toBe(false);
  });

  it('o passo pode ser maior que 1', () => {
    const vistos = montar({ step: 5 });
    clicar(1);
    expect(vistos).toEqual([8]);
  });

  it('desabilitado não mexe em nada', () => {
    const vistos = montar({ disabled: true });
    clicar(1);
    expect(vistos).toEqual([]);
    expect(botoes().every((b) => b.disabled)).toBe(true);
  });

  /* Um clique que rouba o foco fechava popovers que se fecham no blur — foi
     por isso que o BarEditPopover nasceu com o preventDefault. */
  it('o mousedown não rouba o foco de quem abriu o stepper', () => {
    montar();
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    botoes()[1].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

/* A parte que impede a sexta cópia: as cinco telas consomem o componente, e
   nenhuma volta a desenhar o pill por conta própria. */
describe('as cinco telas usam o mesmo componente', () => {
  it.each([
    ['11-ficha/ficha.jsx',            'a ficha (barra de EF/EH/Karma e o modal de status)'],
    ['07-inventario/inventario.jsx',  'o modal de quantidade do inventário'],
    ['07-inventario/loja.jsx',        'a loja'],
    ['12-batalha/batalha.jsx',        'a batalha'],
    ['13-diario/diario.jsx',          'o diário'],
  ])('%s — %s', (arquivo) => {
    expect(fonte(arquivo)).toContain('<QuantidadeStepper');
  });

  it('e nenhuma redesenha o pill por conta própria', () => {
    for (const arquivo of ['07-inventario/inventario.jsx', '07-inventario/loja.jsx',
      '12-batalha/batalha.jsx', '13-diario/diario.jsx']) {
      expect(semComentarios(arquivo), arquivo + ' voltou a desenhar o pill')
        .not.toContain('qty-stepper-pill');
    }
  });

  /* Havia um SEXTO, que só aparece na montagem da batalha ao marcar uma
     criatura — o mais escondido de todos, e por isso o que mais facilmente
     sobreviveria a uma padronização. */
  it('nem a linha de criatura da montagem, que era o sexto', () => {
    const batalha = semComentarios('12-batalha/batalha.jsx');
    expect(batalha).not.toContain('part-qty-btn');
    expect(batalha).not.toContain('part-qty-val');
  });

  /* A loja perdeu a barra arrastável — ela era o desenho mais distante de
     todos, e o teto que ela mostrava agora vem escrito ao lado do número. */
  it('a loja não tem mais a barra de quantidade', () => {
    const loja = semComentarios('07-inventario/loja.jsx');
    expect(loja).not.toContain('loja-qtd-bar');
    expect(loja).not.toContain('role="slider"');
  });

  /* O modal de status trocou os dois <input type="number"> pelo stepper. */
  it('o modal de status não tem mais campo digitável', () => {
    const ficha = semComentarios('11-ficha/ficha.jsx');
    const i = ficha.indexOf('function StatusPrazoModal');
    const corpo = ficha.slice(i, ficha.indexOf('\nfunction ', i + 10));
    expect(corpo).not.toMatch(/type="number"/);
    expect(corpo).toContain('<QuantidadeStepper');
  });
});

/* Rodada de acabamento (17/09/2026), tudo sobre o texto dentro e em volta do
   seletor — o desenho já era um só, faltava a voz ser uma só. */
describe('o texto do seletor', () => {
  const css = fonte('index.css');

  /* "O '1 de 5' deve ser mesma fonte e cor do 1." Era um tom apagado e 1px
     menor, como se o teto fosse nota de rodapé — mas é a segunda metade da
     mesma informação, e a frase se lê de uma vez. */
  it('o teto tem a mesma fonte e cor do número', () => {
    const i = css.indexOf('#root .menestrel-ui .qtd-de-max {');
    expect(i, 'não achei a regra do teto').toBeGreaterThan(-1);
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/color:\s*inherit/);
    expect(regra).toMatch(/font-size:\s*inherit/);
  });

  /* Estoque ilimitado não tem teto para dizer, e "de ∞" era só um símbolo
     ocupando lugar. */
  it('a loja omite o teto quando o estoque é infinito', () => {
    const loja = semComentarios('07-inventario/loja.jsx');
    const i = loja.indexOf('centro={');
    const trecho = loja.slice(i, i + 200);
    expect(trecho).toContain('stockNull ? qtd :');
    expect(trecho).not.toContain('∞');
  });

  /* Dois modais que perguntam "quantos" não podem falar com vozes diferentes:
     a frase usa .loja-ficha-desc e os rótulos .loja-qtd-lbl, os mesmos da
     loja. */
  it('o modal de status veste o texto da loja', () => {
    const ficha = semComentarios('11-ficha/ficha.jsx');
    const i = ficha.indexOf('function StatusPrazoModal');
    const corpo = ficha.slice(i, ficha.indexOf('\nfunction ', i + 10));
    expect(corpo).toContain('className="loja-ficha-desc"');
    expect(corpo.match(/loja-qtd-lbl/g) || [], 'Dias e o valor do efeito').toHaveLength(2);
  });

  it('e o modal de quantidade do inventário também', () => {
    const inv = semComentarios('07-inventario/inventario.jsx');
    expect(inv).toContain('className="loja-ficha-desc"');
  });

  /* "Remova os botões de filtro abaixo do seletor." Eram uma segunda maneira
     de responder a mesma pergunta, logo abaixo da primeira. */
  it('não há mais chips de atalho abaixo do seletor', () => {
    const inv = semComentarios('07-inventario/inventario.jsx');
    expect(inv).not.toContain('delta-stepper-chips');
    expect(inv).not.toContain('delta-chip');
    expect(inv).not.toContain('RAW_PRESETS');
  });

  /* "Remova 'Sem prazo — até o Mestre remover'": o prazo é sempre em dias.
     statusComVencimento segue entendendo null como eterno — é assim que um
     status já guardado sem vencimento continua valendo. */
  it('o modal de status não oferece mais "sem prazo"', () => {
    const ficha = semComentarios('11-ficha/ficha.jsx');
    expect(ficha).not.toContain('fp-status-checkbox');
    expect(ficha).not.toContain('semPrazo');
  });
});
