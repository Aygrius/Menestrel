/* ============================================================
   status-visivel.test.jsx — envenenado e desistiu à vista de todos
   ============================================================
   "O status envenenado, desistiu, deve aparecer pra todo mundo." (usuário,
   13/09/2026)

   Antes: os efeitos temporários (Envenenado, Caído, Voz de Comando…) só
   apareciam no card do MESTRE; o card do jogador não mostrava nenhum — nem os
   do próprio personagem. No tabuleiro, que todos veem, o token tinha selo
   para morto/desmaiado/desistiu, mas nada para envenenado.

   Agora:
     • StatusTempChips — os mesmos chips nas duas telas; no Mestre clicar
       remove, no jogador é só leitura;
     • o token ganha selo de VENENO (status temporário com dano por rodada),
       e os selos de estado ganham nome (aria-label), inclusive "Desistiu".
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let Chips, Tabuleiro;
beforeAll(() => {
  Chips = window.StatusTempChips;
  Tabuleiro = window.TabuleiroBatalha;
  expect(Chips).toBeTypeOf('function');
});
afterEach(cleanup);

const ENVENENADO = { id: 'envenenado', nome: 'Envenenado', rodadas_rest: 3, efeito: { tipo: 'dano_por_rodada', valor: 2 } };
const CAIDO = { id: 'caido', nome: 'Caído', rodadas_rest: 1, efeito: { tipo: 'sem_acoes' } };
const tb = { ateOFimDa: 'até o fim da batalha', rodadaSRestantes: 'rodada(s) restantes', cliqueParaRemover: 'clique para remover' };

describe('StatusTempChips', () => {
  it('mostra nome e rodadas de cada efeito', () => {
    render(<div className="menestrel-ui"><Chips p={{ status_temp: [ENVENENADO, CAIDO] }} tb={tb} somenteLeitura /></div>);
    const chips = document.querySelectorAll('.batalha-status-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toMatch(/Envenenado/);
    expect(chips[0].textContent).toMatch(/3/);
  });

  it('só leitura (jogador): clicar não remove nada', () => {
    let removidos = 0;
    render(<div className="menestrel-ui"><Chips p={{ status_temp: [ENVENENADO] }} tb={tb} somenteLeitura onRemover={() => { removidos += 1; }} /></div>);
    fireEvent.click(document.querySelector('.batalha-status-chip'));
    expect(removidos).toBe(0);
    expect(document.querySelector('.batalha-status-chip').classList.contains('somente-leitura')).toBe(true);
  });

  it('Mestre: clicar remove o efeito', () => {
    const removidos = [];
    render(<div className="menestrel-ui"><Chips p={{ status_temp: [ENVENENADO] }} tb={tb} onRemover={(id) => removidos.push(id)} /></div>);
    fireEvent.click(document.querySelector('.batalha-status-chip'));
    expect(removidos).toEqual(['envenenado']);
  });

  it('sem efeitos, não renderiza nada', () => {
    const { container } = render(<Chips p={{ status_temp: [] }} tb={tb} somenteLeitura />);
    expect(container.innerHTML).toBe('');
  });
});

describe('token do tabuleiro — selos que todos veem', () => {
  const token = (extra) => ({
    tipo: 'criatura', ref_id: 't', inst_id: 't', nome: 'Haalin', pos: { x: 10, y: 10 }, status: 'ativo',
    ef: 10, ef_max: 10, eh: 8, eh_max: 8, ar: 0, ar_max: 0, vb: 20, pa_rest: 1, pa_max: 1, ...extra,
  });
  const montar = (p) => render(React.createElement(Tabuleiro, {
    entradas: [{ p, i: 0 }], meta: {}, podeSelecionar: () => false, alcanceDe: () => null,
    onMover: () => false, salvando: false, isEn: false, tb: {}, abrirTip: null, fecharTip: null,
  }));

  it('envenenado ganha o selo de veneno', () => {
    montar(token({ status_temp: [ENVENENADO] }));
    const selo = document.querySelector('.batalha-token-selo-veneno');
    expect(selo).toBeTruthy();
    expect(selo.getAttribute('aria-label')).toBe('Envenenado');
  });

  it('sem veneno, sem selo', () => {
    montar(token({ status_temp: [CAIDO] }));
    expect(document.querySelector('.batalha-token-selo-veneno')).toBeNull();
  });

  /* "Numerar colunas e linhas no tabuleiro da batalha." (13/09/2026) */
  it('réguas numeradas: colunas em cima, linhas à esquerda, começando em 1', () => {
    montar(token({}));
    const cols = Array.from(document.querySelectorAll('.batalha-tabuleiro-regua--col .batalha-tabuleiro-regua-num')).map((n) => n.textContent);
    const lins = Array.from(document.querySelectorAll('.batalha-tabuleiro-regua--lin .batalha-tabuleiro-regua-num')).map((n) => n.textContent);
    const T = window.MotorTabuleiro;
    expect(cols[0]).toBe('1');
    expect(lins[0]).toBe('1');
    // o último número é múltiplo do passo, e nunca passa do tamanho do tabuleiro
    expect(Number(cols.at(-1))).toBeLessThanOrEqual(T.TAB_COLS);
    expect(Number(lins.at(-1))).toBeLessThanOrEqual(T.TAB_ROWS);
    expect(Number(cols.at(-1))).toBeGreaterThan(T.TAB_COLS - 10);
  });

  it('desistiu mostra a bandeira, com nome', () => {
    montar(token({ status: 'desistiu' }));
    const selo = document.querySelector('.batalha-token-selo-estado');
    expect(selo).toBeTruthy();
    expect(selo.getAttribute('aria-label')).toBe('Desistiu');
    expect(selo.querySelector('.ti-flag')).toBeTruthy();
  });
});
