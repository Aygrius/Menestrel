/* ============================================================
   convocacao-modal.test.jsx — a escolha da Convocação Animal (09/11/2026)
   ============================================================
   O Mestre escolhe os animais do bestiário dentro dos dois limites do
   texto: o estágio máximo de cada um e o total de estágios.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const ANIMAIS = [{ id: 1, nome: 'Cão', estagio: 1 }, { id: 2, nome: 'Lobo', estagio: 2 }];
let filtros;
beforeAll(() => {
  // A consulta encadeada do supabase-js, devolvendo os animais.
  const chain = {
    select: () => chain, order: () => chain,
    eq: (c, v) => { filtros.eq = [c, v]; return chain; },
    lte: (c, v) => { filtros.lte = [c, v]; return chain; },
    gt: () => chain,
    then: (fn) => Promise.resolve({ data: ANIMAIS }).then(fn),
  };
  globalThis.supabaseClient = { from: () => chain };
});
afterEach(cleanup);

const PEND = { escolha: 'Animal', total: 3, max: 2, magia_nome: 'Convocação Animal' };
const montar = async (props) => {
  filtros = {};
  const Modal = window.ConvocacaoModal;
  await act(async () => {
    render(<div className="menestrel-ui"><Modal pend={PEND} conjNome="Galadar" lang="pt"
      onConfirmar={() => {}} onDispensar={() => {}} {...props} /></div>);
  });
};

describe('ConvocacaoModal', () => {
  it('busca os animais até o estágio máximo e diz os limites', async () => {
    await montar();
    expect(filtros).toEqual({ eq: ['tipo', 'Animal'], lte: ['estagio', 2] });
    expect(screen.getByText(/até 3 estágios no total, cada um de estágio 2 no máximo/)).toBeTruthy();
    expect([...document.querySelectorAll('.saque-nome')].map((n) => n.textContent)).toEqual(['Cão', 'Lobo']);
  });
  it('a soma não passa do total, e confirma o que foi escolhido', async () => {
    const onConfirmar = vi.fn();
    await montar({ onConfirmar });
    const mais = (nome) => screen.getByLabelText('Um a mais: ' + nome);
    fireEvent.click(mais('Lobo'));          // 2 de 3
    fireEvent.click(mais('Cão'));           // 3 de 3
    expect(document.querySelector('.convocacao-soma b').textContent).toBe('3/3');
    expect(mais('Cão').disabled).toBe(true);   // não cabe mais nada
    fireEvent.click(screen.getByText('Convocar'));
    expect(onConfirmar).toHaveBeenCalledWith([{ id: 1, nome: 'Cão', qtd: 1 }, { id: 2, nome: 'Lobo', qtd: 1 }]);
  });
  it('sem ninguém escolhido não convoca; "Ninguém vem" dispensa', async () => {
    const onDispensar = vi.fn();
    await montar({ onDispensar });
    expect(screen.getByText('Convocar').closest('button').disabled).toBe(true);
    fireEvent.click(screen.getByText('Ninguém vem'));
    expect(onDispensar).toHaveBeenCalled();
  });
});
