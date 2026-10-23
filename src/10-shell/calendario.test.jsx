/* ============================================================
   calendario.test.jsx — CampoData e FantasyDatePicker (22/10/2026)
   ============================================================
   "Os seletores de data, fictício ou não, podem ser melhores, uma versão
    melhorada da versão de seletor de data do navegador" (usuário).

   O que se guarda aqui é o contrato que o navegador dava de graça e que um
   calendário próprio pode perder: digitar a data, escolher no quadro, andar
   pelo teclado, Esc fechar só o calendário. E o que o navegador não dava: o
   dia da semana e os feriados do mundo.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

afterEach(cleanup);

const { CampoData, FantasyDatePicker } = window;
const montar = (el) => render(<div className="menestrel-ui">{el}</div>);

describe('CampoData — data real', () => {
  it('mostra o valor ISO como dd/mm/aaaa', () => {
    montar(<CampoData value="2026-10-23" onChange={() => {}} aria-label="Data" />);
    expect(screen.getByLabelText('Data').value).toBe('23/10/2026');
  });

  it('digitar põe as barras e grava em ISO', () => {
    let v = null;
    montar(<CampoData value="" onChange={(x) => { v = x; }} aria-label="Data" />);
    const inp = screen.getByLabelText('Data');
    fireEvent.change(inp, { target: { value: '05032027' } });
    expect(inp.value).toBe('05/03/2027');
    fireEvent.blur(inp);
    expect(v).toBe('2027-03-05');
  });

  it('data impossível não grava e acusa', () => {
    let v = 'nada';
    montar(<CampoData value="" onChange={(x) => { v = x; }} aria-label="Data" />);
    const inp = screen.getByLabelText('Data');
    fireEvent.change(inp, { target: { value: '31/02/2026' } });
    fireEvent.blur(inp);
    expect(v).toBe('nada');
    expect(inp.getAttribute('aria-invalid')).toBe('true');
  });

  it('o quadro abre no mês do valor e escolher um dia grava', () => {
    let v = null;
    montar(<CampoData value="2026-10-23" onChange={(x) => { v = x; }} aria-label="Data" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    expect(document.querySelector('.cal-titulo').textContent).toContain('Outubro');
    expect(document.querySelector('.cal-dia.is-escolhido').textContent).toBe('23');
    // 1/10/2026 é quinta: 4 casas vazias antes (dom, seg, ter, qua).
    expect(document.querySelectorAll('.cal-vazio')).toHaveLength(4);
    fireEvent.click(document.querySelector('[data-dia="9"]'));
    expect(v).toBe('2026-10-09');
    expect(document.querySelector('.cal-pop')).toBeNull();
  });

  it('PageDown anda de mês sem mudar o valor; Esc fecha', () => {
    let v = null;
    montar(<CampoData value="2026-10-23" onChange={(x) => { v = x; }} aria-label="Data" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    fireEvent.keyDown(document.querySelector('.cal-grade'), { key: 'PageDown' });
    expect(document.querySelector('.cal-titulo').textContent).toContain('Novembro');
    expect(v).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.cal-pop')).toBeNull();
  });

  it('seta para a direita no último dia vira o mês', () => {
    montar(<CampoData value="2026-10-31" onChange={() => {}} aria-label="Data" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    fireEvent.keyDown(document.querySelector('.cal-grade'), { key: 'ArrowRight' });
    expect(document.querySelector('.cal-titulo').textContent).toContain('Novembro');
  });
});

describe('FantasyDatePicker — data do mundo', () => {
  it('o campo diz a data por extenso e o dia da semana', () => {
    montar(<FantasyDatePicker value={{ dia: 2, mes: 1, ano: 1180 }} onChange={() => {}} />);
    const campo = document.querySelector('.fdp-campo');
    expect(campo.textContent).toContain('2 de Mês do Conflito, ano 1180');
    expect(campo.textContent).toContain(window.calcDiaSemanaFantasy(1180, 1, 2));
  });

  it('o quadro tem a semana do mundo e marca os feriados', () => {
    montar(<FantasyDatePicker value={{ dia: 1, mes: 1, ano: 1180 }} onChange={() => {}} />);
    fireEvent.click(document.querySelector('.fdp-campo'));
    const cols = [...document.querySelectorAll('.cal-semana span')].map((s) => s.textContent);
    expect(cols).toEqual(window.FANTASY_WEEKDAYS.map((s) => s.slice(0, 3)));
    expect(document.querySelectorAll('.cal-dia')).toHaveLength(30);
    // 2 do Mês do Conflito: Festival da Benção Militar.
    expect(document.querySelector('[data-dia="2"]').className).toContain('tem-marca');
  });

  it('escolher um dia em outro mês grava dia, mês e ano', () => {
    let v = null;
    montar(<FantasyDatePicker value={{ dia: 1, mes: 1, ano: 1180 }} onChange={(x) => { v = x; }} />);
    fireEvent.click(document.querySelector('.fdp-campo'));
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    fireEvent.click(document.querySelector('[data-dia="15"]'));
    expect(v).toEqual({ dia: 15, mes: 2, ano: 1180 });
  });

  it('o Dia de Cruine é um mês de um dia, e depois dele vem o ano seguinte', () => {
    let v = null;
    montar(<FantasyDatePicker value={{ dia: 30, mes: 12, ano: 1180 }} onChange={(x) => { v = x; }} />);
    fireEvent.click(document.querySelector('.fdp-campo'));
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(document.querySelectorAll('.cal-dia')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    fireEvent.click(document.querySelector('[data-dia="1"]'));
    expect(v).toEqual({ dia: 1, mes: 1, ano: 1181 });
  });

  it('travado não abre', () => {
    montar(<FantasyDatePicker value={{ dia: 1, mes: 1, ano: 0 }} onChange={() => {}} disabled />);
    fireEvent.click(document.querySelector('.fdp-campo'));
    expect(document.querySelector('.cal-pop')).toBeNull();
  });
});
