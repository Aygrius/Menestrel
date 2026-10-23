/* ============================================================
   estudar-magia.test.jsx — a janela de estudar um livro/pergaminho
   ============================================================
   Reforma de 22/10/2026: o livro abre a lista das magias que ensina; o
   jogador escolhe uma e confirma no rodapé (.ms-footer, padrão dos modais)
   o PRÓXIMO nível. Linha bloqueada mostra o porquê. Pontos gastos/total à
   vista. Pergaminho = a mesma janela com uma linha, já escolhida.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let Modal;
beforeAll(() => { Modal = window.EstudarMagiaModal; expect(Modal).toBeTypeOf('function'); });
afterEach(cleanup);

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica', classe: 'Feitiço',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', nivel_1: 'a', nivel_3: 'b' };
const DB = [BOLA, LUZ];
// Mago Int 2 Aura 1, estágio 1 → 11 pontos. Já sabe Luz 1 (gasto 1).
const PJ = { profissao: 'Mago', experiencia: 0, intelecto_base: 2, aura_base: 1, magias: { luz: 1 } };
const OP = { noInventario: true, podeAprender: true, aVenda: false };

const abrir = (extra) => render(
  <Modal titulo="Livro do Mago" magias={[BOLA, LUZ]} pj={PJ} magiasDb={DB} opcoes={OP}
    lang="pt" onAprender={async () => ({ ok: true })} onClose={() => {}} {...extra} />,
);
const linhas = () => [...document.querySelectorAll('.estudar-linha')];
const confirmar = () => document.querySelector('.ms-footer .btn-primary');

describe('EstudarMagiaModal', () => {
  /* Teclado (22/10/2026): um só ponto de Tab no quadro, e as setas escolhem. */
  it('Tab entra numa linha só e as setas andam escolhendo', () => {
    abrir();
    expect(linhas().map((l) => l.tabIndex)).toEqual([0, -1]);
    fireEvent.keyDown(linhas()[0], { key: 'ArrowDown' });
    expect(linhas()[1].getAttribute('aria-checked')).toBe('true');
    expect(linhas().map((l) => l.tabIndex)).toEqual([-1, 0]);
    fireEvent.keyDown(linhas()[1], { key: 'ArrowDown' });   // volta ao começo
    expect(linhas()[0].getAttribute('aria-checked')).toBe('true');
  });

  /* Saldo, não gasto (22/10/2026): o passe diz quanto SOBRA — 1 gasto de 11
     são 10 livres — e, com uma escolha, quanto sobra depois dela. */
  it('mostra o saldo de pontos e o saldo depois da escolha', () => {
    abrir();
    expect(document.querySelector('.estudar-pontos').textContent).toMatch(/^10\s*de\s*11$/);
    fireEvent.click(linhas()[0]);   // Bola de Fogo — custa 2
    expect(document.querySelector('.estudar-pontos').textContent).toMatch(/10\s*→\s*8\s*de\s*11/);
  });

  it('uma linha por magia com nível atual → próximo e custo do passo', () => {
    abrir();
    expect(linhas().map((l) => l.querySelector('.estudar-nome').textContent)).toEqual(['Bola de Fogo', 'Luz']);
    const bola = linhas()[0];
    expect(bola.querySelector('.estudar-nivel').textContent).toMatch(/—\s*→\s*1/);
    expect(bola.querySelector('.estudar-custo').textContent).toMatch(/2/);
    // Tipo e classe juntos (22/10/2026).
    expect(bola.querySelector('.estudar-tipo').textContent).toBe('Básica · Feitiço');
  });

  it('sem escolha, o confirmar fica desativado', () => {
    abrir();
    expect(confirmar().disabled).toBe(true);
  });

  it('linha bloqueada mostra o motivo e não deixa confirmar', () => {
    abrir();
    fireEvent.click(linhas()[1]); // Luz: nível 3 passa do estágio 1
    expect(document.querySelector('.estudar-motivo').textContent).toMatch(/estágio/);
    expect(confirmar().disabled).toBe(true);
  });

  it('escolher e confirmar chama onAprender com a key e fecha no ok', async () => {
    const onAprender = vi.fn(async () => ({ ok: true }));
    const onClose = vi.fn();
    abrir({ onAprender, onClose });
    fireEvent.click(linhas()[0]);
    expect(confirmar().disabled).toBe(false);
    expect(confirmar().textContent).toMatch(/Bola de Fogo 1/);
    fireEvent.click(confirmar());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onAprender).toHaveBeenCalledWith({ tipo: 'magia', key: 'bola_de_fogo' });
  });

  it('recusa da RPC aparece e a janela fica aberta', async () => {
    const onClose = vi.fn();
    abrir({ onAprender: async () => ({ ok: false, motivo: 'pontos_insuficientes' }), onClose });
    fireEvent.click(linhas()[0]);
    fireEvent.click(confirmar());
    await waitFor(() => expect(document.querySelector('.estudar-motivo').textContent).toMatch(/Pontos de magia/));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pergaminho (uma magia) já vem escolhido', () => {
    abrir({ magias: [BOLA], titulo: 'Pergaminho Bola de Fogo' });
    expect(confirmar().disabled).toBe(false);
  });

  it('item à venda: tudo bloqueado com o motivo', () => {
    abrir({ magias: [BOLA], opcoes: { ...OP, aVenda: true } });
    expect(document.querySelector('.estudar-motivo').textContent).toMatch(/À venda/);
    expect(confirmar().disabled).toBe(true);
  });
});
