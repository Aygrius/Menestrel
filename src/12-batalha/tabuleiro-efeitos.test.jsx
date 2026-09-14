/* ============================================================
   tabuleiro-efeitos.test.jsx — animação de dano e escuridão
   ============================================================
   "Adicione um efeito animação quando um personagem sofre dano, efeito
   vermelho na EF, efeito verde na EH, e efeito branco na armadura. Adicione
   um efeito para escurecer o tabuleiro dependendo da iluminação." (usuário,
   13/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let T, Tabuleiro, Token;
beforeAll(() => {
  T = window.MotorTabuleiro;
  Tabuleiro = window.TabuleiroBatalha;
  Token = window.TabuleiroToken;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const lutador = (extra) => ({
  tipo: 'pj', ref_id: 'y', inst_id: 'y', nome: 'Yuldrous', status: 'ativo', pos: { x: 10, y: 10 },
  ef: 20, ef_max: 20, eh: 10, eh_max: 10, res: 4, res_max: 4, karma: 0, karma_max: 0,
  ...extra,
});

describe('danoNasPools', () => {
  it('EF, EH e resistência que caem viram vermelho, verde e branco', () => {
    expect(T.danoNasPools(lutador(), lutador({ ef: 15 }))).toEqual({ ef: true, eh: false, armadura: false });
    expect(T.danoNasPools(lutador(), lutador({ eh: 0 }))).toEqual({ ef: false, eh: true, armadura: false });
    expect(T.danoNasPools(lutador(), lutador({ res: 3 }))).toEqual({ ef: false, eh: false, armadura: true });
    expect(T.danoNasPools(lutador(), lutador({ eh: 0, ef: 12 }))).toEqual({ ef: true, eh: true, armadura: false });
  });

  it('cura, primeiro render e empréstimo devolvido não piscam', () => {
    const nada = { ef: false, eh: false, armadura: false };
    expect(T.danoNasPools(lutador({ ef: 10 }), lutador({ ef: 20 }))).toEqual(nada);
    expect(T.danoNasPools(null, lutador())).toEqual(nada);
    // mod_eh_temp expirou: eh e eh_max descem juntos
    expect(T.danoNasPools(lutador({ eh: 15, eh_max: 15 }), lutador({ eh: 10, eh_max: 10 }))).toEqual(nada);
    // participante cru da montagem, sem pools
    expect(T.danoNasPools({ nome: 'x' }, lutador())).toEqual(nada);
  });
});

describe('o token anima quando leva dano', () => {
  const props = (p) => ({ p, meta: {}, size: 40, selecionado: false, atual: false, podeSel: false, onSelect: () => {} });

  it('liga o anel e o véu da cor certa, e desliga depois', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(React.createElement(Token, props(lutador())));
    expect(container.querySelector('.batalha-token-dano-anel')).toBeNull();

    rerender(React.createElement(Token, props(lutador({ eh: 0, ef: 14 }))));
    expect(container.querySelector('.batalha-token-dano-anel--eh')).not.toBeNull();
    expect(container.querySelector('.batalha-token-dano-anel--ef')).not.toBeNull();
    expect(container.querySelector('.batalha-token-dano-veu--ef')).not.toBeNull();
    expect(container.querySelector('.batalha-token-dano-anel--armadura')).toBeNull();
    // A barrinha da EF virou o anel do avatar (14/09/2026): é ele que acende.
    expect(container.querySelector('.batalha-token-ef.is-dano-ef')).not.toBeNull();

    act(() => { vi.advanceTimersByTime(T.FLASH_DANO_MS + 10); });
    expect(container.querySelector('.batalha-token-dano-anel')).toBeNull();
  });

  it('armadura que se desgasta pisca branco', () => {
    const { container, rerender } = render(React.createElement(Token, props(lutador())));
    rerender(React.createElement(Token, props(lutador({ res: 3 }))));
    expect(container.querySelector('.batalha-token-dano-anel--armadura')).not.toBeNull();
    // Sem barras desde 14/09/2026, a armadura pisca só no anel de dano.
    expect(container.querySelector('.batalha-token-barra')).toBeNull();
  });

  it('montar o token não anima', () => {
    const { container } = render(React.createElement(Token, props(lutador({ ef: 1 }))));
    expect(container.querySelector('.is-dano')).toBeNull();
  });
});

/* 14/09/2026: "Remova as barras debaixo do avatar, e não precisa mostrar o
   nome do combatente como tooltip. Mostre uma borda do EF ao redor do avatar,
   é sua EF. Mantenha os ícones internos." */
describe('token: anel da EF no lugar das barras', () => {
  const props = (p, extra) => ({ p, meta: {}, size: 40, selecionado: false, atual: false, podeSel: true, onSelect: () => {}, ...extra });

  it('não há mais barras embaixo do avatar; o nome continua', () => {
    const { container } = render(React.createElement(Token, props(lutador())));
    expect(container.querySelector('.batalha-token-barras, .batalha-token-barra')).toBeNull();
    expect(container.querySelector('.batalha-token-nome').textContent).toBe('Yuldrous');
  });

  it('o anel mostra a fração da EF, recolhendo com o dano', () => {
    const { container, rerender } = render(React.createElement(Token, props(lutador({ ef: 20, ef_max: 20 }))));
    const nivel = () => container.querySelector('.batalha-token-ef-nivel').getAttribute('stroke-dasharray');
    expect(nivel()).toBe('100 100');
    rerender(React.createElement(Token, props(lutador({ ef: 5, ef_max: 20 }))));
    expect(nivel()).toBe('25 100');
    rerender(React.createElement(Token, props(lutador({ ef: -8, ef_max: 20 }))));
    expect(nivel()).toBe('0 100');
    expect(container.querySelector('.batalha-token-ef').classList.contains('vazia')).toBe(true);
  });

  it('sem EF para medir (participante cru da montagem), não desenha anel', () => {
    const { container } = render(React.createElement(Token, props({ tipo: 'pj', ref_id: 1, inst_id: 'x', nome: 'Cru', pos: { x: 1, y: 1 } })));
    expect(container.querySelector('.batalha-token-ef')).toBeNull();
    expect(T.fracaoEfDoToken({ ef: 3 })).toBeNull();
  });

  it('passar o mouse não abre tooltip com o nome, nem usa title', () => {
    const abrirTip = vi.fn();
    const { container } = render(React.createElement(Token, props(lutador(), { abrirTip, fecharTip: () => {} })));
    const token = container.querySelector('.batalha-token');
    fireEvent.mouseEnter(token);
    expect(abrirTip).not.toHaveBeenCalled();
    expect(token.getAttribute('title')).toBeNull();
    expect(token.getAttribute('aria-label')).toBe('Yuldrous');
  });

  it('os ícones internos continuam: selo de estado e de veneno', () => {
    const envenenado = lutador({
      status: 'desmaiado',
      status_temp: [{ id: 'veneno:1', nome: 'Envenenado', rodadas_rest: 2, efeito: { tipo: 'dano_por_rodada', valor: 2 } }],
    });
    const { container } = render(React.createElement(Token, props(envenenado)));
    expect(container.querySelector('.batalha-token-selo-estado .ti-zzz')).not.toBeNull();
    expect(container.querySelector('.batalha-token-selo-veneno .ti-flask-2')).not.toBeNull();
  });
});

describe('escuridão do tabuleiro', () => {
  const montar = (visibilidade) => render(React.createElement(Tabuleiro, {
    entradas: [{ p: lutador(), i: 0 }], meta: {}, podeSelecionar: () => false, alcanceDe: () => null,
    onMover: () => false, salvando: false, isEn: false, tb: {}, visibilidade,
  }));

  it.each(['clara', 'parcial', 'total', 'magica'])('iluminação %s vira a camada do mesmo nome', (v) => {
    const { container } = montar(v);
    const camada = container.querySelector('.batalha-tabuleiro-escuridao');
    expect(camada.getAttribute('data-iluminacao')).toBe(v);
    expect(camada.className).toContain('batalha-tabuleiro-escuridao--' + v);
  });

  it('sem iluminação (ou valor desconhecido) fica clara', () => {
    expect(montar(undefined).container.querySelector('.batalha-tabuleiro-escuridao').getAttribute('data-iluminacao')).toBe('clara');
    cleanup();
    expect(montar('breu').container.querySelector('.batalha-tabuleiro-escuridao').getAttribute('data-iluminacao')).toBe('clara');
  });

  it('a camada fica abaixo dos tokens e não pega clique', () => {
    const { container } = montar('total');
    const camada = container.querySelector('.batalha-tabuleiro-escuridao');
    expect(camada.style.pointerEvents).toBe('none');
    expect(camada.style.zIndex).toBe('0');
  });
});
