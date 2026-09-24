/* ============================================================
   ferido.test.jsx — o status "Ferido" do menu de estado do Mestre
   ============================================================
   "Adicione um novo status no combate 'Ferido', onde será possível adicionar
    colunas de penalidade por x rodadas." (usuário, 15/09/2026)

   Mesmo caminho de Envenenado/Sangrando/Caído (statusAplicadoPeloMestre): o
   Mestre escolhe no menu, digita quantas colunas e por quantas rodadas. O
   efeito é `mod_coluna` negativo — o mesmo número que a Falha Crítica ("Ações
   −7") já tira de TODAS as ações: arma, magia, habilidade e técnica.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, T, tb, fonte;
beforeAll(() => {
  M = window.MotorBatalha; T = window.MotorTabuleiro;
  tb = window.COPY.pt.batalha;
  fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
});
afterEach(cleanup);

const GUERREIRO = { inst_id: 'g1', tipo: 'pj', nome: 'Aldren', status: 'ativo', ef: 20, ef_max: 20 };

describe('Ferido — colunas de penalidade por rodadas', () => {
  it('é mod_coluna negativo, com as rodadas pedidas e id próprio', () => {
    const st = M.statusAplicadoPeloMestre('ferido', 3, 4, tb);
    expect(st.id).toMatch(/^ferido:/);
    expect(st.nome).toBe('Ferido');
    expect(st.rodadas_rest).toBe(4);
    expect(st.efeito).toEqual({ tipo: 'mod_coluna', valor: -3 });
  });

  it('soma com outras penalidades de coluna e some quando as rodadas acabam', () => {
    const p = { ...GUERREIRO, status_temp: [
      M.statusAplicadoPeloMestre('ferido', 2, 1, tb),
      M.statusAplicadoPeloMestre('ferido', 3, 2, tb),
    ] };
    expect(M.somaEfeitosStatus(p, 'mod_coluna')).toBe(-5);
    const depois = { ...p, status_temp: M.decrementarStatusTemp(p.status_temp) };
    expect(M.somaEfeitosStatus(depois, 'mod_coluna')).toBe(-3);
  });

  it('não é dano: não morde na virada', () => {
    const p = { ...GUERREIRO, status_temp: [M.statusAplicadoPeloMestre('ferido', 5, 2, tb)] };
    expect(M.processarDanoPorRodada(p).total).toBe(0);
  });

  it('o chip do efeito usa o ícone de Ferido e diz nome e rodadas', () => {
    const p = { ...GUERREIRO, status_temp: [M.statusAplicadoPeloMestre('ferido', 2, 3, tb)] };
    render(<div className="menestrel-ui"><window.StatusTempChips p={p} tb={tb} somenteLeitura /></div>);
    const chip = document.querySelector('.batalha-efeito-botao');
    expect(chip.querySelector('.ti-bandage')).toBeTruthy();
    expect(chip.getAttribute('aria-label')).toMatch(/Ferido/);
    expect(chip.getAttribute('aria-label')).toMatch(/3/);
  });

  it('o token ganha o selo Ferido', () => {
    const p = { ...GUERREIRO, status_temp: [M.statusAplicadoPeloMestre('ferido', 2, 3, tb)] };
    expect(T.selosDoToken(p).map((s) => s.nome)).toEqual(['Ferido']);
  });

  it('o menu de estado oferece Ferido, e o modal pede Colunas e Rodadas', () => {
    expect(fonte).toContain("['ferido', 'ferido', tb.ferido, 'ferido']");
    const ini = fonte.indexOf('{venenoOpen && (() => {');
    const trecho = fonte.slice(ini, fonte.indexOf('</ModalShell>', ini));
    expect(trecho).toContain('tb.feridoColunas');
    expect(trecho).toContain('tb.feridoNota');
    expect(tb.feridoColunas).toBe('Colunas de penalidade');
  });
});
