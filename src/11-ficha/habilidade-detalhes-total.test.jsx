/* ============================================================
   habilidade-detalhes-total.test.jsx — a janela de usar uma habilidade
   ============================================================
   Desde 26/09/2026 é o MODELO ÚNICO de janela (ver
   magia-detalhes-tooltip.test.jsx): BestDetalheModal com o corpo do
   Treinamento (BestHabilidadeFicha), o total do personagem em
   Características, e o ícone Usar ao lado do X, que abre a escolha da
   dificuldade — os cinco botões de antes.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './ficha.jsx';

let Modal;
beforeAll(() => {
  Modal = window.HabilidadeDetalhesModal;
  expect(Modal, 'HabilidadeDetalhesModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const HAB = { key: 'furtividade', nome: 'Furtividade', ajuste: 'agilidade', grupo: 'Subterfúgio', custo: 2, descricao: 'Mover-se sem ser notado.' };
const montar = (total, props = {}) => render(
  <div className="menestrel-ui">
    <Modal habilidade={HAB} total={total} lang="pt" onClose={() => {}} onUsar={() => {}} abrirTip={() => {}} fecharTip={() => {}} {...props} />
  </div>
);

describe('o modelo único de janela', () => {
  it('abas de detalhe, o total em Características e o ícone Usar', () => {
    montar(5);
    expect(document.querySelector('.ms-footer')).toBeNull();
    const abas = [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
    expect(abas).toEqual(['Usar', 'Descrição', 'Características']);
    expect(document.querySelector('.best-secao--lista').textContent).toMatch(/Total\s*5/);
    // O card da dificuldade é a ação: sem ícone ao lado do X (26/09/2026).
    expect(document.querySelector('[data-acao="usar"]')).toBeNull();
    expect(document.querySelector('.det-uso').textContent).not.toMatch(/Dificuldade/);
  });

  it('total negativo com o sinal de menos de verdade', () => {
    montar(-3);
    expect(document.querySelector('.best-secao--lista').textContent).toMatch(/Total\s*−3/);
  });
});

describe('usar: a dificuldade', () => {
  it('cinco botões, nenhum marcado; 1º clique marca, 2º no mesmo card rola', () => {
    const onUsar = vi.fn();
    montar(4, { onUsar });
    const botoes = [...document.querySelectorAll('.det-dif-card')];
    expect(botoes.map((b) => b.textContent)).toEqual(['Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Absurdo']);
    expect(document.querySelector('.det-dif-card[aria-checked="true"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-dificuldade="dificil"]'));
    expect(onUsar).not.toHaveBeenCalled();
    expect(document.querySelector('[data-dificuldade="dificil"]').getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('.mn-tip').textContent).toBe('Clique aqui novamente para rolar');
    fireEvent.click(document.querySelector('[data-dificuldade="dificil"]'));
    expect(onUsar).toHaveBeenCalledWith({ nome: 'Furtividade', total: 4, dificuldade: 'dificil' });
  });
});
