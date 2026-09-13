/* ============================================================
   tabuleiro-posicionar.test.jsx — posicionar pela lista, não pela bancada
   ============================================================
   "Os avatar na barra inferior, antes da batalha iniciar e na hora de escolher
   onde vão ficar, está ruim. Remova o texto 'Ainda fora do tabuleiro (2)'. E
   adicione um ícone ao lado do nome do combatente no topo, para selecionar e
   escolher onde o combatente vai se posicionar." (usuário, 12/09/2026)

   Travado aqui:
     • o rótulo "Ainda fora do tabuleiro (N)" não existe mais;
     • `semBancada` esconde a faixa de avatares inteira (é o que a montagem usa);
     • a seleção pode vir de fora (`movendoControlado` + `onMovendoChange`):
       com alguém armado pela lista, o clique na grade o posiciona e a
       seleção é limpa.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let Tabuleiro;
beforeAll(() => {
  Tabuleiro = window.TabuleiroBatalha;
  expect(Tabuleiro).toBeDefined();
});
afterEach(cleanup);

const pj = (nome, extra) => ({
  tipo: 'pj', ref_id: nome, inst_id: nome, nome,
  pos: { x: 10, y: 10 }, status: 'ativo',
  ef: 10, ef_max: 10, eh: 8, eh_max: 8, ar: 0, ar_max: 0,
  vb: 20, pa_rest: 3, pa_max: 3,
  ...extra,
});

// Um já no tabuleiro, um ainda fora — é o caso da montagem.
const ENTRADAS = [
  { p: pj('Yuldrous'), i: 0 },
  { p: pj('Lobisomem', { tipo: 'criatura', pos: null }), i: 1 },
];

const montar = (props) => render(
  React.createElement(Tabuleiro, {
    entradas: ENTRADAS,
    meta: {},
    podeSelecionar: () => true,
    alcanceDe: () => null,
    onMover: () => false,
    salvando: false,
    isEn: false,
    tb: {},
    abrirTip: null,
    fecharTip: null,
    ...props,
  })
).container;

// A grade clicável é o primeiro filho do contêiner de rolagem.
const grade = (c) => c.querySelector('.batalha-tabuleiro-scroll > div');

describe('a bancada de avatares', () => {
  it('não tem mais o rótulo "Ainda fora do tabuleiro"', () => {
    const c = montar({});
    expect(c.querySelector('.batalha-tabuleiro-bancada')).toBeTruthy();
    expect(c.textContent).not.toMatch(/Ainda fora do tabuleiro/);
  });

  it('semBancada esconde a faixa inteira', () => {
    const c = montar({ semBancada: true });
    expect(c.querySelector('.batalha-tabuleiro-bancada')).toBeNull();
  });
});

describe('seleção controlada de fora', () => {
  it('com alguém armado pela lista, clicar na grade o posiciona e limpa a seleção', () => {
    const onMover = vi.fn(() => true);
    const onMovendoChange = vi.fn();
    const c = montar({ semBancada: true, movendoControlado: 1, onMovendoChange, onMover });
    expect(grade(c).style.cursor).toBe('crosshair');
    fireEvent.click(grade(c), { clientX: 200, clientY: 200 });
    expect(onMover).toHaveBeenCalledTimes(1);
    const [p, indice, destino] = onMover.mock.calls[0];
    expect(p.nome).toBe('Lobisomem');
    expect(indice).toBe(1);
    expect(Number.isFinite(destino.x) && Number.isFinite(destino.y)).toBe(true);
    expect(onMovendoChange).toHaveBeenCalledWith(null);
  });

  it('sem ninguém armado, o clique na grade não move ninguém', () => {
    const onMover = vi.fn(() => true);
    const c = montar({ semBancada: true, movendoControlado: null, onMovendoChange: () => {}, onMover });
    expect(grade(c).style.cursor).toBe('default');
    fireEvent.click(grade(c), { clientX: 200, clientY: 200 });
    expect(onMover).not.toHaveBeenCalled();
  });

  it('posicionamento recusado mantém a seleção armada', () => {
    const onMovendoChange = vi.fn();
    const c = montar({ semBancada: true, movendoControlado: 1, onMovendoChange, onMover: () => false });
    fireEvent.click(grade(c), { clientX: 200, clientY: 200 });
    expect(onMovendoChange).not.toHaveBeenCalled();
  });
});

describe('a montagem usa o ícone da lista', () => {
  const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');

  it('cada linha do topo tem o botão de posicionar, e o tabuleiro recebe a seleção', () => {
    expect(fonte).toMatch(/className=\{'batalha-part-posicionar'/);
    expect(fonte).toMatch(/movendoControlado=\{posicionando\}\s+onMovendoChange=\{setPosicionando\}\s+semBancada/);
  });

  it('o botão Iniciar não tem mais ícone', () => {
    const inicio = fonte.indexOf('onClick={iniciar}>');
    expect(inicio).toBeGreaterThan(-1);
    expect(fonte.slice(inicio, inicio + 120)).not.toMatch(/ti-swords/);
  });
});
