/* ============================================================
   ritual-de-sangue.test.jsx — o conhecimento roubado por dez dias
   ============================================================
   "A magia 'Ritual de Sangue' permite que o evocador adquira temporariamente
   uma habilidade, técnica ou magia do alvo. Ao usar a magia, vai aparecer um
   modal para o mestre selecionar qual habilidade, magia ou técnica e o
   estágio que o evocador vai usar temporariamente." (usuário, 07/11/2026)
   ============================================================ */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './game-data.jsx';
import './ritual-de-sangue.jsx';

afterEach(() => cleanup());

const DIA = (dia) => ({ dia, mes: 3, ano: 1499 });

describe('as regras do roubo', () => {
  it('é a magia ritual_de_sangue', () => {
    expect(window.ehRitualDeSangue({ key: 'ritual_de_sangue' })).toBe(true);
    expect(window.ehRitualDeSangue('ritual_de_sangue')).toBe(true);
    expect(window.ehRitualDeSangue({ key: 'bola_de_fogo' })).toBe(false);
  });

  it('o estágio vai até o nível evocado: magia nos ímpares, o resto de 1 em 1', () => {
    expect(window.niveisDoRitualDeSangue('magia', 5)).toEqual([1, 3, 5]);
    expect(window.niveisDoRitualDeSangue('habilidade', 3)).toEqual([1, 2, 3]);
    expect(window.niveisDoRitualDeSangue('tecnica', 1)).toEqual([1]);
  });

  it('vale dez dias e evocar de novo substitui o anterior', () => {
    const e1 = window.comConhecimentoRoubado({ vitalidade: { ef: 5 } },
      { tipo: 'habilidade', key: 'furtividade', nome: 'Furtividade', nivel: 3, alvo: 'Lobisomem' }, DIA(1));
    expect(e1.vitalidade).toEqual({ ef: 5 });
    expect(e1.conhecimento_roubado).toMatchObject({ tipo: 'habilidade', key: 'furtividade', nivel: 3, alvo: 'Lobisomem' });
    expect(window.conhecimentoRoubadoVigente(e1, DIA(10))).toBeTruthy();
    expect(window.conhecimentoRoubadoVigente(e1, DIA(11))).toBeNull();
    const e2 = window.comConhecimentoRoubado(e1, { tipo: 'magia', key: 'medo', nome: 'Medo', nivel: 1 }, DIA(5));
    expect(e2.conhecimento_roubado.key).toBe('medo');
  });

  it('sem data de jogo, vale (o lado seguro)', () => {
    const e = window.comConhecimentoRoubado({}, { tipo: 'tecnica', key: 'x', nivel: 2 }, null);
    expect(window.conhecimentoRoubadoVigente(e, null)).toMatchObject({ key: 'x', nivel: 2 });
  });

  it('o pj em uso soma o roubado — magia em passos — e não muda o original', () => {
    const pj = { id: 1, magias: { bola_de_fogo: 1 }, habilidades: {}, tecnicas: {},
      estado_atual: window.comConhecimentoRoubado({}, { tipo: 'magia', key: 'medo', nivel: 5 }, null) };
    const uso = window.pjComConhecimentoRoubado(pj, null);
    expect(uso.magias).toEqual({ bola_de_fogo: 1, medo: 3 });
    expect(window.nivelMagiaEfetivo(uso.magias.medo)).toBe(5);
    expect(pj.magias).toEqual({ bola_de_fogo: 1 });
    expect(window.ehConhecimentoRoubado(uso, 'magia', 'medo')).toBe(true);
  });

  it('o que o PJ já sabe mais alto fica com o dele', () => {
    const pj = { habilidades: { furtividade: 4 },
      estado_atual: window.comConhecimentoRoubado({}, { tipo: 'habilidade', key: 'furtividade', nivel: 2 }, null) };
    const uso = window.pjComConhecimentoRoubado(pj, null);
    expect(uso.habilidades.furtividade).toBe(4);
    expect(window.ehConhecimentoRoubado(uso, 'habilidade', 'furtividade')).toBe(false);
  });
});

describe('quem usa e quem não usa o roubado', () => {
  const ficha = readFileSync(resolve(__dirname, '../11-ficha/ficha.jsx'), 'utf8');
  it('a compra (subir nível, pontos) segue lendo o pj, não o pj em uso', () => {
    expect(ficha).toMatch(/const niveis = \(tipo === 'magia' \? pj\.magias : tipo === 'tecnica' \? pj\.tecnicas : pj\.habilidades\)/);
    expect(ficha).toMatch(/filaFn\(pj\.magias \|\| \{\}, pj\.treinos, 'magia'\)/);
  });
  it('a evocação do jogador vira pedido para o Mestre, com o evocador como alvo', () => {
    expect(ficha).toMatch(/motivo: ritualSangue \? \(isMestre \? 'ritual_de_sangue' : 'aprovacao_mestre'\)/);
    expect(ficha).toMatch(/const _alvoRitual = ritualSangue \? \{ id: pj\.id, nome: nomePj \} : alvo;/);
  });
});

describe('a janela do Mestre', () => {
  it('escolhe tipo, conhecimento e estágio, e devolve o roubo', async () => {
    const tabelas = {
      habilidades: [{ key: 'furtividade', nome: 'Furtividade' }],
      magias: [{ key: 'medo', nome: 'Medo' }, { key: 'sono', nome: 'Sono' }],
      tecnicas: [{ key: 'golpe', nome: 'Golpe' }],
    };
    window.supabaseClient = {
      from: (t) => ({ select: () => ({ order: () => Promise.resolve({ data: tabelas[t], error: null }) }) }),
    };
    globalThis.supabaseClient = window.supabaseClient;
    await import('../10-shell/shell.jsx');
    await import('../10-shell/ritual-de-sangue-modal.jsx');
    const onConfirmar = vi.fn(() => Promise.resolve());
    const { getByText, getByRole } = render(
      <window.RitualDeSangueModal lang="pt" conjurador="Eco" nivelEvocado={3} onConfirmar={onConfirmar} onClose={() => {}} />);
    fireEvent.click(getByRole('radio', { name: /Magia/ }));
    await waitFor(() => getByText('Medo'));
    fireEvent.click(getByText('Medo'));
    // Magia sobe de 2 em 2: 1 → 3, e 3 é o teto do nível evocado.
    fireEvent.click(document.querySelector('.rs-nivel button[aria-label="+"]'));
    expect(document.querySelector('.rs-nivel .fp-pop-stepper-label').textContent).toBe('3');
    fireEvent.click(getByText('Dar o conhecimento'));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalled());
    expect(onConfirmar.mock.calls[0][0]).toMatchObject({ tipo: 'magia', key: 'medo', nome: 'Medo', nivel: 3 });
  });
});
