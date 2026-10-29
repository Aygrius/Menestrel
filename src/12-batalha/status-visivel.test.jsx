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
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const aqui = dirname(fileURLToPath(import.meta.url));

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
  // Botão redondo desde 14/09/2026: nome e rodadas no aria-label/tooltip, as
  // rodadas também na borda azul — sem texto nem badge dentro.
  it('diz nome e rodadas de cada efeito', () => {
    render(<div className="menestrel-ui"><Chips p={{ status_temp: [ENVENENADO, CAIDO] }} tb={tb} somenteLeitura /></div>);
    const chips = document.querySelectorAll('.batalha-status-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].getAttribute('aria-label')).toMatch(/Envenenado · 3/);
    expect(chips[0].textContent.trim()).toBe('');
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

  /* AS RÉGUAS NUMERADAS SAÍRAM (27/10/2026, pedido do usuário: "no campo de
     batalha, remova os números que identificam linhas e colunas"). Elas
     viveram de 13/09 a 27/10.

     A trava vira o oposto, e vale por dois motivos: o desenho não volta por
     descuido, e — o que importa mais — as duas engenhocas que existiam SÓ
     para elas não voltam junto. `rolagemXY` escutava o onScroll para as
     faixas acompanharem o arraste; `sobra` media a centralização com um
     ResizeObserver para os números não descolarem do grid. Sem números, o
     tabuleiro não escuta rolagem nem observa redimensionamento. */
  it('não há mais números de linha e coluna, nem o que os alimentava', () => {
    montar(token({}));
    expect(document.querySelector('.batalha-tabuleiro-regua-num')).toBeNull();
    expect(document.querySelector('.batalha-tabuleiro-regua')).toBeNull();
    expect(document.querySelector('.batalha-tabuleiro-regua-canto')).toBeNull();
    const fonte = readFileSync(resolve(aqui, 'tabuleiro.jsx'), 'utf8');
    expect(fonte, 'o estado da rolagem era só das réguas').not.toMatch(/setRolagemXY/);
    expect(fonte, 'o ResizeObserver da sobra era só das réguas').not.toMatch(/const \[sobra, setSobra\]/);
    expect(fonte).not.toMatch(/function ReguaTabuleiro/);
  });

  it('desistiu mostra a bandeira, com nome', () => {
    montar(token({ status: 'desistiu' }));
    const selo = document.querySelector('.batalha-token-selo-estado');
    expect(selo).toBeTruthy();
    expect(selo.getAttribute('aria-label')).toBe('Desistiu');
    expect(selo.querySelector('.ti-flag')).toBeTruthy();
  });
});
