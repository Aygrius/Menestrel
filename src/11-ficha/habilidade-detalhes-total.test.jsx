/* ============================================================
   habilidade-detalhes-total.test.jsx — a janela da habilidade
   ============================================================
   "Ao abrir a habilidade, não precisa mostrar o atributo, e melhore o número
   do total." e depois "use o ícone dentro de um pequeno card, igual em itens.
   E a dificuldade pode ser botões selecionáveis ao invés de dropdown."
   (usuário, 12/09/2026)

   O total é um det-sec-chip, como os atributos da janela de item; o chip de
   Ajuste (o atributo) saiu; a dificuldade são cinco botões.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

let Modal;
beforeAll(() => {
  Modal = window.HabilidadeDetalhesModal;
  expect(Modal, 'HabilidadeDetalhesModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const HAB = { key: 'furtividade', nome: 'Furtividade', ajuste: 'agilidade', grupo: 'Subterfúgio', restricao: 'Sem armadura pesada', descricao: 'Mover-se sem ser notado.' };
const montar = (total, props = {}) => render(
  <div className="menestrel-ui">
    <Modal habilidade={HAB} total={total} lang="pt" onClose={() => {}} abrirTip={() => {}} fecharTip={() => {}} {...props} />
  </div>
).container.ownerDocument.body;

describe('o total num card pequeno, igual aos atributos do item', () => {
  /* "use o ícone ti-number-5-small para mostrar o nível das habilidades,
     magias, etc." (usuário, 14/09/2026) */
  it('o número É o ícone ti-number-N-small, dentro da caixa', () => {
    const b = montar(5);
    const chip = b.querySelector('.det-sec-chip.det-hab-total');
    const caixa = chip.querySelector('.det-sec-ic-box.det-hab-total-num');
    expect(caixa.querySelector('i').className).toBe('ti ti-number-5-small');
    expect(caixa.textContent).toBe('');
    expect(caixa.getAttribute('aria-label')).toBe('Total: 5');
    expect(chip.querySelector('.det-sec-val')).toBeNull();
    expect(chip.querySelector('.det-sec-ic--neg')).toBeNull();
  });

  it('zero também é ícone', () => {
    expect(montar(0).querySelector('.det-hab-total i').className).toBe('ti ti-number-0-small');
  });

  it('negativo (fora da família do Tabler): sinal de menos de verdade e a caixa vermelha', () => {
    const caixa = montar(-3).querySelector('.det-hab-total .det-sec-ic-box');
    expect(caixa.querySelector('i')).toBeNull();
    expect(caixa.textContent).toBe('−3');
    expect(caixa.classList.contains('det-sec-ic--neg')).toBe(true);
  });

  it('"Total" sai no tooltip', () => {
    const abrirTip = vi.fn();
    const b = montar(5, { abrirTip });
    fireEvent.mouseEnter(b.querySelector('.det-hab-total'));
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { desc: 'Total' });
  });

  it('a bolinha do título saiu', () => {
    expect(montar(5).querySelector('.det-title-badge')).toBeNull();
  });
});

describe('o atributo não aparece', () => {
  it('atributo, grupo e restrição viram ícones depois do total, sem texto na tela', () => {
    const b = montar(5);
    const chips = [...b.querySelectorAll('.det-sec-chip')];
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
      null, 'Atributo: Agilidade', 'Grupo: Subterfúgio', 'Restrição: Sem armadura pesada',
    ]);
    expect(b.textContent).not.toMatch(/Agilidade|Subterfúgio/);
  });

  it('o atributo aparece no tooltip', () => {
    const abrirTip = vi.fn();
    const b = montar(5, { abrirTip });
    fireEvent.mouseEnter(b.querySelector('.det-sec-chip[aria-label^="Atributo"]'));
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { title: 'Atributo', desc: 'Agilidade' });
  });

  it('a Restrição é só o ícone, e o texto sai no tooltip', () => {
    const abrirTip = vi.fn();
    const b = montar(5, { abrirTip });
    const restricao = b.querySelector('.det-sec-chip[aria-label^="Restrição"]');
    expect(restricao.textContent).toBe('');
    fireEvent.mouseEnter(restricao);
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { title: 'Restrição', desc: 'Sem armadura pesada' });
  });
});

describe('a dificuldade em botões', () => {
  it('cinco botões, sem dropdown, começando em Médio', () => {
    const b = montar(5);
    const botoes = [...b.querySelectorAll('.det-dif-card')];
    expect(botoes.map((x) => x.textContent)).toEqual(['Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Absurdo']);
    expect(b.querySelector('.select-pill-btn')).toBeNull();
    expect(b.querySelector('[data-dificuldade="medio"]').getAttribute('aria-checked')).toBe('true');
  });

  it('clicar seleciona, e Usar leva a escolhida', () => {
    const onUsar = vi.fn();
    const b = montar(5, { onUsar });
    fireEvent.click(b.querySelector('[data-dificuldade="dificil"]'));
    expect(b.querySelector('[data-dificuldade="dificil"]').getAttribute('aria-checked')).toBe('true');
    expect(b.querySelector('[data-dificuldade="medio"]').getAttribute('aria-checked')).toBe('false');
    fireEvent.click([...b.querySelectorAll('button')].find((x) => x.textContent === 'Usar'));
    expect(onUsar).toHaveBeenCalledWith({ nome: 'Furtividade', total: 5, dificuldade: 'dificil' });
  });
});
