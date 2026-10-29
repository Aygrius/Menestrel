/* ============================================================
   tubos-medalhoes.test.jsx — o Resumo da ficha em pedras e medalhões
   ============================================================
   Redesenho aprovado pelo usuário em 23/10/2026 ("Perfeito, pode aplicar"):
   Energia e Condições saíram das barras. As Condições seguem em medalhões sem
   texto — nome e porcentagem no tooltip. A Energia era em TUBOS de alquimista
   e, em 27/10/2026, virou PEDRAS: rubi, esmeralda e safira pintadas no Figma,
   que acendem por dentro conforme a energia. Os dois mantêm o contrato das
   barras: o Mestre clica para editar; Pesado (semEdicao) não abre nada.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(resolve(aqui, '..', 'index.css'), 'utf8');
const FONTE = readFileSync(resolve(aqui, 'ficha.jsx'), 'utf8');

let FichaGemas, FichaMedalhoes;
beforeAll(() => {
  FichaGemas = window.FichaGemas;
  FichaMedalhoes = window.FichaMedalhoes;
  expect(FichaGemas).toBeTypeOf('function');
  expect(FichaMedalhoes).toBeTypeOf('function');
});
afterEach(cleanup);

const EF = { key: 'ef', label: 'Energia Física', nomeCurto: 'Física', color: '#A3291A', val: 3, min: -15, max: 14, icon: 'ti-heart' };
const EH = { key: 'eh', label: 'Energia Heroica', nomeCurto: 'Heroica', color: '#4E9A3E', val: 44, max: 72, icon: 'ti-bolt' };
const KA = { key: 'ka', label: 'Karma', nomeCurto: 'Karma', color: '#3558B0', val: 2, max: 9, icon: 'ti-flare' };

/* -- OS TUBOS VIRARAM PEDRAS (27/10/2026) ----------------------------------
   "Eu quero mudar as barras de energias, é possível transformá-las em pedras
   (gemas preciosas) animadas? Seria uma pedra rubi, uma pedra esmeralda e uma
   pedra safira." E, logo depois: "você pode fazer o desenho das gemas no
   Figma e usar a animação?"

   O contrato é o mesmo de quando eram tubos — e é por isso que este arquivo
   continua existindo em vez de ser refeito do zero: o Mestre clica para
   editar, o balão diz o nome inteiro e o valor, e a ficha do bicho usa a
   mesma peça. O que mudou é COMO a fração aparece. O tubo enchia por uma
   linha; a pedra ACENDE do meio para fora, e quem carrega a fração é o
   `scale` da máscara do coração. */
describe('pedras da Energia', () => {
  /* O nível, lido do SVG. As duas formas são montadas sempre (o CSS escolhe
     pela paleta), e as duas põem o mesmo topo: a maré no `y` do retângulo, o
     escoamento no primeiro ponto da onda. Compara-se a maré, que é um número
     só e não uma senoide. O topo vai de 99 (vazia) a 1 (cheia) — a altura da
     PEDRA dentro da caixa de 124, não a caixa. */
  const topoDoNivel = (i = 0) =>
    Number(document.querySelectorAll('.fp-gema-mare')[i].getAttribute('y'));
  const fracaoLida = (i = 0) => (99 - topoDoNivel(i)) / 98;

  /* As GOTAS, as ESTRELINHAS e o LUSTRO que atravessava a pedra saíram em
     27/10/2026: "remova as gotas, remova as estrelinhas […] remova também
     essa luz que passa de um lado para o outro como um flash." */
  it('nada de gotas, estrelinhas ou lustro atravessando', () => {
    render(<FichaGemas bars={[{ ...EF, val: 7 }]} en={false} />);
    expect(document.querySelector('.fp-gema-gotas')).toBeNull();
    expect(document.querySelector('.fp-gema-faiscas')).toBeNull();
    expect(document.querySelector('.fp-gema-varredura')).toBeNull();
    expect(CSS).not.toMatch(/fp-gema-gotas|fp-gema-faiscas|fp-gema-varredura/);
    expect(FONTE).not.toMatch(/fp-gema-gotas|fp-gema-faiscas|fp-gema-varredura/);
  });

  it('sem número, nome curto embaixo, fogo do tamanho da energia', () => {
    render(<FichaGemas bars={[EF, EH]} en={false} />);
    const gemas = document.querySelectorAll('.fp-gema');
    expect(gemas).toHaveLength(2);
    // 23/10/2026, e continua valendo: "remova o número acima de cada tubo".
    expect(gemas[0].textContent).not.toMatch(/\d/);
    expect(gemas[0].querySelector('.fp-gema-nome').textContent).toBe('Física');
    expect(fracaoLida(1)).toBeCloseTo(44 / 72, 3);
  });

  it('cada energia tem a sua pedra, e a pintura está no lugar', () => {
    render(<FichaGemas bars={[EF, EH, KA]} en={false} />);
    const artes = [...document.querySelectorAll('.fp-gema-morta image')].map((e) => e.getAttribute('href'));
    expect(artes).toEqual(['/energia/gema-rubi.webp', '/energia/gema-esmeralda.webp', '/energia/gema-safira.webp']);
    for (const a of artes) {
      expect(existsSync(resolve(aqui, '..', '..', 'public', a.slice(1))), 'falta a pintura ' + a).toBe(true);
    }
  });

  it('Física abaixo de zero: a pedra trinca e vira brasa rumo ao -15', () => {
    render(<FichaGemas bars={[{ ...EF, val: -9 }]} en={false} />);
    expect(document.querySelector('.fp-gema').classList.contains('is-neg')).toBe(true);
    expect(document.querySelector('.fp-gema-trinca')).toBeTruthy();
    expect(document.querySelector('.fp-gema-agonia')).toBeTruthy();
    expect(fracaoLida()).toBeCloseTo(0.6, 3);
  });

  it('em zero (desmaiado) a pedra apaga de vez', () => {
    render(<FichaGemas bars={[{ ...EF, val: 0 }]} en={false} />);
    expect(fracaoLida()).toBe(0);
    // Sem fogo não há gota escapando: o que não tem luz não escoa.
    expect(document.querySelector('.fp-gema-gotas')).toBeNull();
  });

  /* AS DUAS PALETAS, NO MESMO DESENHO (27/10/2026, pedido do usuário: "eu
     quero escoamento para a paleta couro e ouro e maré para a paleta ferro e
     brasa"). O componente monta as duas formas e quem apaga a que não vale é
     o CSS, pela `data-paleta` da raiz — assim trocar de paleta no menu troca
     o jeito de decair na hora, sem estado novo. */
  it('as duas formas são montadas, e a paleta escolhe no CSS', () => {
    render(<FichaGemas bars={[EF]} en={false} />);
    expect(document.querySelector('.fp-gema-escoa.fp-gema-so-couro')).toBeTruthy();
    expect(document.querySelector('.fp-gema-mare.fp-gema-so-ferro')).toBeTruthy();
    expect(CSS).toMatch(/:root\[data-paleta="ferro"\][^{]*\.fp-gema-so-couro \{ display: none; \}/);
    expect(CSS).toMatch(/:root:not\(\[data-paleta="ferro"\]\)[^{]*\.fp-gema-so-ferro \{ display: none; \}/);
  });

  /* A batida vale para as duas ("o pulso pode ir com qualquer uma sim"). */
  it('a pedra bate, e o ritmo é o valor', () => {
    render(<FichaGemas bars={[EF]} en={false} />);
    expect(document.querySelector('.fp-gema-viva').classList.contains('is-pulso')).toBe(true);
    expect(CSS).toMatch(/animation: gema-pulsa calc\(1\.1s \+ 1\.8s \* var\(--n, 0\)\)/);
  });

  /* O escoamento acelera conforme a energia CAI — é o que o torna honesto.
     Quem carregava isso eram as gotas; elas saíram em 27/10 a pedido do
     usuário, e a conta passou para a corrente que desce por dentro. */
  it('quanto menos resta, mais depressa escoa', () => {
    render(<FichaGemas bars={[{ ...EF, val: 2, max: 14, min: 0 }]} en={false} />);
    expect(document.querySelector('.fp-gema-svg').style.getPropertyValue('--n')).toBe('0.143');
    expect(CSS).toMatch(/animation: gema-corrente calc\(5\.4s - 3\.2s \* var\(--n, 0\)\)/);
    expect(document.querySelector('.fp-gema-gotas')).toBeNull();
  });

  /* O LAÇO FECHA INVISÍVEL (27/10/2026, pedido do usuário: "deixe o movimento
     fluir para que ao reiniciar não pareça que reiniciou"). A onda só não dá
     tranco se o deslocamento for um PERÍODO INTEIRO da senoide — eram 37px
     contra um período de 74, meio período, e a cada volta a crista caía onde
     estava o vale. O número vive em dois arquivos e PRECISA ser o mesmo; é
     por isso que este teste compara os dois. */
  it('a onda anda um período inteiro, e os dois arquivos concordam', () => {
    const periodo = Number(/const GEMA_ONDA_PERIODO = (\d+);/.exec(FONTE)[1]);
    // `[^}]*` não serve: há um `}` do `from` no meio do bloco.
    const anda = Number(/@keyframes gema-escoa-onda \{[\s\S]*?to\s+\{ transform: translateX\((\d+)px\)/.exec(CSS)[1]);
    expect(anda).toBe(periodo);
  });

  /* E o halo deixou de ter laço próprio: dois laços de durações primas entre
     si batem fora de passo o tempo todo, e era parte do mesmo incômodo. */
  it('só a batida pulsa; o halo é constante', () => {
    expect(CSS).not.toMatch(/gema-respira/);
    const i = CSS.indexOf('.fp-gema-viva {');
    expect(CSS.slice(i, CSS.indexOf('}', i))).not.toMatch(/animation/);
  });

  /* A pedra apagada continua INTEIRA: é a mesma pintura, sem cor e sem luz.
     Quem some é o fogo, não o talhe — senão o cartão mudaria de desenho a
     cada golpe levado. */
  it('apagada, a pedra ainda está lá', () => {
    render(<FichaGemas bars={[{ ...EF, val: 0, min: 0 }]} en={false} />);
    expect(document.querySelector('.fp-gema-morta image')).toBeTruthy();
    expect(CSS).toMatch(/\.fp-gema-svg\.is-pintada \.fp-gema-morta \{\r?\n\s*filter: saturate/);
  });

  it('o Mestre clica na pedra para editar; sem onEdit, só mostra', () => {
    const chamadas = [];
    const { unmount } = render(<FichaGemas bars={[EF]} scope="vit" en={false} onEdit={(b, s) => chamadas.push([b.key, s])} />);
    const gema = document.querySelector('.fp-gema');
    expect(gema.getAttribute('role')).toBe('button');
    act(() => { gema.click(); });
    expect(chamadas).toEqual([['ef', 'vit']]);
    unmount();
    render(<FichaGemas bars={[EF]} en={false} />);
    expect(document.querySelector('.fp-gema').getAttribute('role')).toBeNull();
  });

  it('o tooltip diz o nome inteiro e o valor', () => {
    const dicas = [];
    render(<FichaGemas bars={[EF]} en={false} onHover={(e, t) => dicas.push(t)} onHoverEnd={() => {}} />);
    act(() => { document.querySelector('.fp-gema').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(dicas[0]).toEqual({ title: 'Energia Física', desc: '3 de 14' });
  });

  /* Pedra é pedra: quem pediu menos movimento vê a pedra parada, e não perde
     informação nenhuma — o tamanho do fogo já conta tudo. */
  it('com movimento reduzido, tudo para', () => {
    const i = CSS.indexOf('@media (prefers-reduced-motion: reduce)', CSS.indexOf('.fp-gema-trinca'));
    const bloco = CSS.slice(i, CSS.indexOf('\n}', i));
    for (const classe of ['fp-gema-viva', 'fp-gema-trinca',
      'fp-gema-escoa', 'fp-gema-corrente', 'fp-gema-linha-dagua']) {
      expect(bloco, classe + ' continua animando').toMatch(new RegExp(classe));
    }
    expect(bloco).toMatch(/animation: none/);
  });
});

describe('medalhões das Condições', () => {
  const COND = [
    { key: 'animo', label: 'Sono', val: 6, max: 100, icon: 'ti-zzz' },
    { key: 'frio', label: 'Frio', val: 0, max: 100, icon: 'ti-snowflake' },
    { key: 'pesado', label: 'Pesado', val: 86, max: 100, icon: 'ti-stack-2', semEdicao: true },
  ];

  /* O NOME POR EXTENSO sob o medalhão (26/10/2026, pedido do usuário: "no card
     de condições, abaixo do ícone não abrevie, onde está 'DOE 0' vira
     'Doença'"). Antes a legenda era a sigla com o valor ("SON · 25"); o valor
     já está no líquido do anel e no tooltip, e a sigla cobrava uma tradução
     mental para poupar três letras. */
  it('a legenda é o nome; o líquido vai até a porcentagem; zero recua', () => {
    render(<FichaMedalhoes bars={COND} en={false} />);
    const meds = document.querySelectorAll('.fp-medalhao');
    expect(meds).toHaveLength(3);
    expect(meds[0].querySelector('.fp-med-rot').textContent).toBe('Sono');
    expect(meds[0].textContent).not.toMatch(/SON|·|\b6\b/);   // nem sigla nem número
    expect(meds[0].querySelector('.fp-medalhao-canal').style.getPropertyValue('--p')).toBe('6');
    expect(meds[1].classList.contains('is-zero')).toBe(true);
    expect(meds[1].querySelector('.fp-medalhao-canal')).toBeNull();
  });

  it('o tooltip diz o nome e a porcentagem', () => {
    const dicas = [];
    render(<FichaMedalhoes bars={COND} en={false} onHover={(e, t) => dicas.push(t)} onHoverEnd={() => {}} />);
    act(() => { document.querySelector('.fp-medalhao').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(dicas[0]).toEqual({ title: 'Sono', desc: '6%' });
  });

  it('o Mestre edita a condição; Pesado (derivado da carga) não abre', () => {
    const chamadas = [];
    render(<FichaMedalhoes bars={COND} scope="cond" en={false} onEdit={(b) => chamadas.push(b.key)} />);
    const meds = document.querySelectorAll('.fp-medalhao');
    act(() => { meds[0].click(); meds[2].click(); });
    expect(chamadas).toEqual(['animo']);
    expect(meds[2].getAttribute('role')).toBeNull();
  });
});
