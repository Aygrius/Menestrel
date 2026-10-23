/* ============================================================
   tubos-medalhoes.test.jsx — o Resumo da ficha em tubos e medalhões
   ============================================================
   Redesenho aprovado pelo usuário em 23/10/2026 ("Perfeito, pode aplicar"):
   Energia em tubos (número no alto, só o valor; nome curto embaixo), Física
   abaixo de zero até −15 com o líquido escuro, e Condições em medalhões sem
   texto — nome e porcentagem no tooltip. Os dois mantêm o contrato das
   barras: o Mestre clica para editar; Pesado (semEdicao) não abre nada.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

let FichaTubos, FichaMedalhoes;
beforeAll(() => {
  FichaTubos = window.FichaTubos;
  FichaMedalhoes = window.FichaMedalhoes;
  expect(FichaTubos).toBeTypeOf('function');
  expect(FichaMedalhoes).toBeTypeOf('function');
});
afterEach(cleanup);

const EF = { key: 'ef', label: 'Energia Física', nomeCurto: 'Física', color: '#A3291A', val: 3, min: -15, max: 14, icon: 'ti-heart' };
const EH = { key: 'eh', label: 'Energia Heroica', nomeCurto: 'Heroica', color: '#4E9A3E', val: 44, max: 72, icon: 'ti-bolt' };

describe('tubos da Energia', () => {
  it('sem número acima, nome curto embaixo, altura do líquido proporcional', () => {
    render(<FichaTubos bars={[EF, EH]} en={false} />);
    const tubos = document.querySelectorAll('.fp-tubo');
    expect(tubos).toHaveLength(2);
    // 23/10/2026: "remova o número acima de cada tubo".
    expect(tubos[0].querySelector('.fp-tubo-num')).toBeNull();
    expect(tubos[0].querySelector('.fp-tubo-nome').textContent).toBe('Física');
    expect(tubos[1].querySelector('.fp-tubo-liq').style.height).toBe('61%');
  });

  it('Física abaixo de zero: líquido escuro que enche rumo ao −15', () => {
    render(<FichaTubos bars={[{ ...EF, val: -9 }]} en={false} />);
    const liq = document.querySelector('.fp-tubo-liq');
    expect(liq.classList.contains('is-neg')).toBe(true);
    expect(liq.style.height).toBe('60%');
  });

  it('em zero (desmaiado) o tubo fica vazio', () => {
    render(<FichaTubos bars={[{ ...EF, val: 0 }]} en={false} />);
    expect(document.querySelector('.fp-tubo-liq').style.height).toBe('0%');
  });

  it('o Mestre clica no tubo para editar; sem onEdit, só mostra', () => {
    const chamadas = [];
    const { unmount } = render(<FichaTubos bars={[EF]} scope="vit" en={false} onEdit={(b, s) => chamadas.push([b.key, s])} />);
    const tubo = document.querySelector('.fp-tubo');
    expect(tubo.getAttribute('role')).toBe('button');
    act(() => { tubo.click(); });
    expect(chamadas).toEqual([['ef', 'vit']]);
    unmount();
    render(<FichaTubos bars={[EF]} en={false} />);
    expect(document.querySelector('.fp-tubo').getAttribute('role')).toBeNull();
  });

  it('o tooltip diz o nome inteiro e o valor', () => {
    const dicas = [];
    render(<FichaTubos bars={[EF]} en={false} onHover={(e, t) => dicas.push(t)} onHoverEnd={() => {}} />);
    act(() => { document.querySelector('.fp-tubo').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(dicas[0]).toEqual({ title: 'Energia Física', desc: '3 de 14' });
  });
});

describe('medalhões das Condições', () => {
  const COND = [
    { key: 'animo', label: 'Sono', val: 6, max: 100, icon: 'ti-zzz' },
    { key: 'frio', label: 'Frio', val: 0, max: 100, icon: 'ti-snowflake' },
    { key: 'pesado', label: 'Pesado', val: 86, max: 100, icon: 'ti-stack-2', semEdicao: true },
  ];

  it('sem texto visível; o líquido vai até a porcentagem; zero recua', () => {
    render(<FichaMedalhoes bars={COND} en={false} />);
    const meds = document.querySelectorAll('.fp-medalhao');
    expect(meds).toHaveLength(3);
    expect(meds[0].textContent.trim()).toBe('');
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
