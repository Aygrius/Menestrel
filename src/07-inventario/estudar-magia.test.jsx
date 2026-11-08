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

  /* Saldo, não gasto (22/10/2026): o passe diz quanto SOBRA — 1 gasto de 10
     (Mago 8 + Int 2; a Aura não soma desde 06/11/2026)
     são 9 livres — e, com uma escolha, quanto sobra depois dela. */
  it('mostra o saldo de pontos e o saldo depois da escolha', () => {
    abrir();
    // "Magias 9/10" (07/11/2026): rótulo é a aba; o número, uma peça só.
    expect(document.querySelector('.estudar-celula-pontos .mn-rotulo').textContent).toBe('Magias');
    expect(document.querySelector('.estudar-pontos').textContent).toMatch(/^9\/10$/);
    fireEvent.click(linhas()[0]);   // Bola de Fogo — custa 2
    expect(document.querySelector('.estudar-pontos').textContent).toMatch(/9\s*→\s*7\/10/);
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
    // O motivo mora na linha; o rodapé é só o Aprender (07/11/2026).
    expect(linhas()[1].querySelector('.estudar-bloqueio').textContent).toMatch(/estágio/);
    expect(document.querySelector('.ms-footer').textContent).not.toMatch(/estágio|Fechar/);
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

  /* Sem escolha, nada de "Escolha no quadro" (07/11/2026): o passe é só o saldo. */
  it('sem escolha, o passe mostra só o saldo', () => {
    abrir();
    // O saldo mora no card ao lado da regra; sem escolha, o passe nem aparece.
    expect(document.querySelector('.estudar-passe')).toBeNull();
    expect(document.querySelector('.estudar-topo .estudar-saldo .estudar-pontos')).toBeTruthy();
    expect(document.querySelector('.estudar-topo .estudar-como')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Escolha no quadro/);
  });

  /* Como e quanto tempo (07/11/2026): a frase da aba e a célula da escolha. */
  it('explica o aprendizado: magia nova leva 24 h na atividade da classe', () => {
    abrir();
    // O texto é o do usuário (07/11/2026), com as horas de HORAS_TREINO.
    expect(document.querySelector('.estudar-como').textContent).toMatch(/^Aprender uma magia nova requer 24 horas de teoria e prática./);
    expect(document.querySelector('.estudar-como').textContent).toMatch(/feitiço novo, é necessário estudar. Se for um milagre, oração./);
    fireEvent.click(linhas()[0]);   // Bola de Fogo, Feitiço, ainda não sabida
    expect(document.querySelector('.estudar-aprendizado').textContent).toBe('24 h em Estudar');
  });

  /* Uma aba por tipo (07/11/2026), cada uma com o seu quadro e o seu saldo. */
  it('magias, técnicas e habilidades em abas, cada uma com o seu saldo', () => {
    const ESQ = { key: 'esquiva', nome: 'Esquiva', custo: 1 };
    const MED = { key: 'medicina', nome: 'Medicina', custo: 1, grupo: 'Conhecimento', nivel_inicial: 0 };
    abrir({ tecnicas: [ESQ], tecnicasDb: [ESQ], habilidades: [MED], habilidadesDb: [MED] });
    const abas = [...document.querySelectorAll('.estudar-abas [role="tab"]')];
    expect(abas.map((a) => a.dataset.aba)).toEqual(['magia', 'tecnica', 'habilidade']);
    expect(linhas()).toHaveLength(2);
    fireEvent.click(abas[2]);
    expect(linhas().map((l) => l.querySelector('.estudar-nome').textContent)).toEqual(['Medicina']);
    expect(document.querySelector('.estudar-celula-pontos .mn-rotulo').textContent).toBe('Habilidades');
    expect(document.querySelector('.estudar-como').textContent).toMatch(/Habilidade nova leva 12 horas em Treinar/);
    fireEvent.click(abas[1]);
    expect(document.querySelector('.estudar-como').textContent).toMatch(/Técnica nova leva 36 horas em Treinar/);
  });

  it('item à venda: tudo bloqueado com o motivo', () => {
    abrir({ magias: [BOLA], opcoes: { ...OP, aVenda: true } });
    expect(linhas()[0].querySelector('.estudar-bloqueio').textContent).toMatch(/À venda/);
    expect(confirmar().disabled).toBe(true);
  });
});
