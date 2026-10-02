/* ============================================================
   lore-form-campos.test.jsx — o formulário de Reino e Conhecido (26/09/2026)
   ============================================================
   "Em reinos, remova o input 'imagem', 'ícone'."
   "No modal de editar reino, adicione um campo para resumo."
   "No modal conhecidos, adicione um campo para vincular o personagem a um
    reino."
   "No modal de editar conhecidos, remover input de imagem, e o input de
    rumores deve ser inline sozinho." (usuário)

   O banco ganhou as colunas no mesmo dia (reinos.resumo, npcs.reino e os
   campos que o formulário já tinha e se perdiam: idade, família, relação,
   status, rumores) — scripts/sql/lore-reino-resumo-npc-campos-2026-09-26.sql.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/select-pill.jsx';
import '../10-shell/shell.jsx';
import './diario.jsx';

afterEach(cleanup);

const REINOS = [{ id: 'verrogar', nome: 'Verrogar', tipo: 'reino' }, { id: 'abadom', nome: 'Abadom', tipo: 'reino' }];
const CIDADES = [{ id: 'brann', nome: 'Brann', tipo: 'cidade' }];

const montar = (tipo, entrada = {}, onChange = () => {}) => render(
  <div className="menestrel-ui">
    <window.LoreEntradaForm tipo={tipo} entrada={{ nome: 'X', descricao: '', atributos: {}, ...entrada, id: 'x' }}
      onChange={onChange} reinosDaHistoria={REINOS} cidadesDaHistoria={CIDADES} t={window.COPY.pt} lang="pt" />
  </div>
);
const rotulos = () => [...document.querySelectorAll('.diario-field-label')].map((l) => l.textContent.trim());
const campoDe = (rotulo) => [...document.querySelectorAll('.diario-field-label')]
  .find((l) => l.textContent.trim() === rotulo).parentElement;

describe('Reino', () => {
  it('tem Resumo, e não tem Imagem nem Ícone', () => {
    montar('reino');
    expect(rotulos()).toContain('Resumo');
    expect(rotulos().some((r) => /Imagem|Ícone/.test(r))).toBe(false);
  });

  it('o Resumo grava em atributos.resumo', () => {
    const onChange = vi.fn();
    montar('reino', {}, onChange);
    const resumo = [...document.querySelectorAll('.diario-field-label')].find((l) => l.textContent.trim() === 'Resumo').nextElementSibling;
    fireEvent.change(resumo, { target: { value: 'Um reino de montanhas.' } });
    expect(onChange.mock.calls.at(-1)[0].atributos.resumo).toBe('Um reino de montanhas.');
  });
});

describe('Conhecido', () => {
  it('não tem Imagem; tem Reino, com os reinos da mesa', () => {
    montar('npc');
    expect(rotulos().some((r) => /Imagem/.test(r))).toBe(false);
    expect(rotulos()).toContain('Reino');
    fireEvent.click(campoDe('Reino').querySelector('.select-pill-btn'));
    const opcoes = [...document.querySelectorAll('.select-pill-drop li')].map((li) => li.textContent.trim());
    expect(opcoes).toEqual(['—', 'Verrogar', 'Abadom']);
  });

  it('escolher o reino grava o slug em atributos.reino', () => {
    const onChange = vi.fn();
    montar('npc', {}, onChange);
    fireEvent.click(campoDe('Reino').querySelector('.select-pill-btn'));
    fireEvent.click([...document.querySelectorAll('.select-pill-drop li')].find((li) => li.textContent.trim() === 'Abadom'));
    expect(onChange.mock.calls.at(-1)[0].atributos.reino).toBe('abadom');
  });

  it('Rumores ocupa a linha sozinho', () => {
    montar('npc');
    expect(campoDe('Rumores').classList.contains('diario-form-col-span')).toBe(true);
  });
});

/* 26/09/2026: "no modal de editar/nova cidade, remover input de url de
   imagem. O campo capital é um dropdown sim ou não. O input 'reino' fica
   inline com nome." */
describe('Cidade', () => {
  it('sem Imagem', () => {
    montar('cidade');
    expect(rotulos().some((r) => /Imagem/.test(r))).toBe(false);
  });

  it('Nome e Reino na mesma linha, e o Reino não se repete embaixo', () => {
    montar('cidade');
    const linha = document.querySelector('.diario-form-linha-nome--cidade');
    expect([...linha.querySelectorAll('.diario-field-label')].map((l) => l.textContent.trim())).toEqual(['Nome', 'Reino']);
    expect(rotulos().filter((r) => r === 'Reino')).toHaveLength(1);
  });

  // 28/09/2026: "Remova do card de criação de cidades, o campo 'capital' pois
  // ele é informado na criação do reino."
  it('a cidade não tem mais o campo Capital', () => {
    montar('cidade', { atributos: { capital: false } });
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(rotulos()).not.toContain('Capital');
  });

  it('os campos novos: Governante, Religião, Economia, Defesas e Rumores', () => {
    montar('cidade');
    expect(rotulos()).toEqual(expect.arrayContaining(['Governante', 'Religião', 'Economia', 'Defesas', 'Rumores', 'População']));
  });
});

/* 26/09/2026: "remova os inputs relação, status, localização e família" e
   "Nome, Raça e Idade ficam inline, sendo Raça e Idade input menores". */
describe('Conhecido: o formulário enxuto', () => {
  it('Relação, Status, Localização e Família saíram', () => {
    montar('npc');
    for (const r of ['Relação', 'Status', 'Localização', 'Família']) expect(rotulos(), r).not.toContain(r);
  });

  it('Nome, Raça e Idade dividem a mesma linha, nessa ordem', () => {
    montar('npc');
    const linha = document.querySelector('.diario-form-linha-nome');
    expect([...linha.querySelectorAll('.diario-field-label')].map((l) => l.textContent.trim()))
      .toEqual(['Nome', 'Raça', 'Idade']);
    // E não se repetem na grade de baixo.
    expect(rotulos().filter((r) => r === 'Raça')).toHaveLength(1);
    expect(rotulos().filter((r) => r === 'Idade')).toHaveLength(1);
  });

  // O reino ganhou a Capital na linha do Nome em 26/09/2026 — ver lugar-tipo-unico.test.jsx.
  it('o reino tem Nome e Capital na mesma linha', () => {
    montar('reino');
    expect(document.querySelector('.diario-form-linha-nome').textContent).toContain('Capital');
  });
});
