/* ============================================================
   atividade-seletor.test.jsx — o círculo de atividade da ficha
   ============================================================
   "Adicione um botão na ficha para o jogador escolher entre as condições:
    Dormindo, Meditando, Orando, Estudando, Treinando." (usuário, 24/09/2026)

   Mestre e dono escolhem; quem só olha vê a atividade ligada e não mexe.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

let Seletor;
beforeAll(() => { Seletor = window.FichaAtividadeSeletor; expect(Seletor).toBeDefined(); });
afterEach(cleanup);

const botao = () => document.querySelector('.fp-atividade-wrap .fp-status-seletor');
const opcoes = () => Array.from(document.querySelectorAll('.fp-atividade-wrap .fp-status-opcao'));

describe('FichaAtividadeSeletor', () => {
  it('abre as cinco atividades e devolve a escolhida', () => {
    const escolhas = [];
    render(<Seletor atividade={null} podeEditar lang="pt" onEscolher={(t) => escolhas.push(t)} />);
    act(() => { botao().click(); });
    expect(opcoes().map((li) => li.textContent)).toEqual(['Dormindo', 'Meditando', 'Orando', 'Estudando', 'Treinando']);
    act(() => { opcoes()[0].click(); });
    expect(escolhas).toEqual(['dormindo']);
  });

  it('ligada, mostra o nome e oferece "Nenhuma" para parar', () => {
    const escolhas = [];
    render(<Seletor atividade={{ tipo: 'meditando' }} podeEditar lang="pt" onEscolher={(t) => escolhas.push(t)} />);
    expect(document.querySelector('.fp-atividade-nome').textContent).toBe('Meditando');
    expect(botao().classList.contains('is-ativo')).toBe(true);
    act(() => { botao().click(); });
    const nenhuma = opcoes().find((li) => li.textContent === 'Nenhuma');
    act(() => { nenhuma.click(); });
    expect(escolhas).toEqual([null]);
  });

  it('quem não pode editar vê a atividade e não abre a lista', () => {
    render(<Seletor atividade={{ tipo: 'orando' }} podeEditar={false} lang="pt" onEscolher={() => {}} />);
    expect(document.querySelector('.fp-atividade-nome').textContent).toBe('Orando');
    act(() => { botao().click(); });
    expect(opcoes()).toHaveLength(0);
  });

  it('quem não pode editar e não tem atividade não vê nada', () => {
    render(<Seletor atividade={null} podeEditar={false} lang="pt" onEscolher={() => {}} />);
    expect(botao()).toBeNull();
  });
});
