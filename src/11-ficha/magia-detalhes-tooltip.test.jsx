/* ============================================================
   magia-detalhes-tooltip.test.jsx — os atributos da magia viram tooltip
   ============================================================
   "No caso das magias, o texto vira tooltip igual nos itens." (usuário,
   12/09/2026)

   Evocação, Alcance, Duração e Alvo eram ícone + texto ao lado. Agora são só o
   ícone, e o texto sai no tooltip com o nome do campo de título — o mesmo trato
   dos efeitos na janela de item (det-sec-chip--efeito).
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
  Modal = window.MagiaDetalhesModal;
  expect(Modal, 'MagiaDetalhesModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const MAGIA = {
  key: 'bola_de_fogo', nome: 'Bola de Fogo', evocacao: 'Instantânea', alcance: '20 metros',
  duracao: 'Instantânea', descricao: 'Uma bola de fogo.', nivel_1: 'Causa 12 de dano elemental de fogo.',
};

const montar = (abrirTip = vi.fn()) => render(
  <div className="menestrel-ui">
    <Modal magia={MAGIA} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 1, nome: 'Eco' }}
      colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={abrirTip} fecharTip={() => {}} />
  </div>
).container.ownerDocument.body;

describe('atributos da magia', () => {
  it('só o ícone: nenhum texto ao lado', () => {
    const b = montar();
    const chips = [...b.querySelectorAll('.det-sec-a .det-sec-chip')];
    expect(chips).toHaveLength(3);
    chips.forEach((c) => {
      expect(c.classList.contains('det-sec-chip--efeito')).toBe(true);
      expect(c.querySelector('.det-sec-val')).toBeNull();
      expect(c.textContent).toBe('');
    });
  });

  it('mostra só os níveis que o personagem já aprendeu', () => {
    const magia = { ...MAGIA, nivel_3: 'Causa 18 de dano elemental de fogo.', nivel_5: 'Causa 24 de dano elemental de fogo.' };
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={magia} passos={2} nivelMagiaEfetivoFn={() => 3} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    const niveis = [...b.querySelectorAll('.mag-nivel-card')].map((c) => c.textContent);
    expect(niveis).toHaveLength(2);
    expect(niveis.join(' ')).not.toMatch(/24/);
    expect(b.querySelector('.mag-nivel-card--locked')).toBeNull();
  });

  it('a descrição preserva os parágrafos do banco', () => {
    const magia = { ...MAGIA, descricao: 'Um ritual antigo.\nItens necessários: Vela (3).\r\n\nSó à noite.' };
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={magia} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    expect([...b.querySelectorAll('.det-desc p')].map((p) => p.textContent))
      .toEqual(['Um ritual antigo.', 'Itens necessários: Vela (3).', 'Só à noite.']);
  });

  it('usa a mesma janela de detalhes de item e habilidade', () => {
    expect(montar().querySelector('.ms-modal.modal-detalhes')).toBeTruthy();
  });

  it('o texto sai no tooltip, com o nome do campo de título', () => {
    const abrirTip = vi.fn();
    const b = montar(abrirTip);
    const alcance = b.querySelector('.det-sec-chip[aria-label^="Alcance"]');
    expect(alcance.getAttribute('aria-label')).toBe('Alcance: 20 metros');
    fireEvent.mouseEnter(alcance);
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { title: 'Alcance', desc: '20 metros' });
  });
});
