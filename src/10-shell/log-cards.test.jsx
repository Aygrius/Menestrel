/* ============================================================
   log-cards.test.jsx — o log da mesa em cards (27/09/2026)
   ============================================================
   "Cada log será um card, que irá aparecer no centro da tela. Assim que um
    novo log aparecer, o log anterior desaparece com fade-out. Ao clicar o
    ícone do sino para ver os logs antigos, abrir um modal com os logs em
    lista. Cada tipo de log terá uma cor: Batalha: vermelho. Informativo:
    Azul. Crie os demais." (usuário)
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import './shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';

let W;
beforeAll(() => { W = window; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('categoriaDoLog — uma cor por tipo', () => {
  it('batalha: tudo o que tem batalha_id, e ataque/técnica', () => {
    expect(W.categoriaDoLog('sistema', { batalha_id: 3 })).toBe('batalha');
    expect(W.categoriaDoLog('teste', { batalha_id: 3 })).toBe('batalha');
    expect(W.categoriaDoLog('ataque', {})).toBe('batalha');
    expect(W.categoriaDoLog('tecnica', null)).toBe('batalha');
  });
  it('os demais tipos', () => {
    expect(W.categoriaDoLog('sistema', {})).toBe('informativo');
    expect(W.categoriaDoLog('magia', {})).toBe('magia');
    expect(W.categoriaDoLog('item', {})).toBe('item');
    expect(W.categoriaDoLog('teste', {})).toBe('teste');
    expect(W.categoriaDoLog('aviso', {})).toBe('aviso');
    expect(W.categoriaDoLog('sistema', { destaque: true })).toBe('destaque');
  });
  it('batalha é vermelho e informativo é azul', () => {
    expect(W.LOG_CATEGORIAS.batalha.cor).toMatch(/^#[CD]/i);   // vermelho
    expect(W.LOG_CATEGORIAS.informativo.cor).toBe('#5B92CF'); // azul
    const cores = Object.values(W.LOG_CATEGORIAS).map((c) => c.cor);
    expect(new Set(cores).size).toBe(cores.length);             // uma cor para cada
  });
});

describe('o card e a lista', () => {
  const msg = (over) => W.linhaParaMensagem({ id: 1, created_at: '2026-09-27T10:00:00Z', tipo: 'sistema', texto: 'Rodada 2', meta: { batalha_id: 9 }, ...over }, 'pt');

  it('o card leva a cor e o rótulo da categoria', () => {
    const { container } = render(<div className="menestrel-ui cm-root"><W.LogCard msg={msg()} lang="pt" /></div>);
    const card = container.querySelector('.cm-card');
    expect(card.getAttribute('data-categoria')).toBe('batalha');
    expect(card.style.getPropertyValue('--log-cor')).toBe(W.LOG_CATEGORIAS.batalha.cor);
    expect(card.textContent).toMatch(/Batalha.*Rodada 2/);
  });

  it('a linha do histórico também: cor, rótulo, hora e texto', () => {
    const { container } = render(<div className="menestrel-ui cm-log-lista"><W.MensagemEvento msg={msg({ tipo: 'item', meta: {} })} lang="pt" /></div>);
    const linha = container.querySelector('.cm-msg');
    expect(linha.classList.contains('cm-msg--item')).toBe(true);
    expect(linha.querySelector('.cm-msg-cat').textContent).toBe('Item');
  });
});

describe('a CentralMensagens: card no centro e sino com o modal', () => {
  let handler, original;
  // Teste de integração: troca o Proxy que proíbe rede por um stub, e devolve.
  beforeAll(() => { original = globalThis.supabaseClient; });
  afterAll(() => { globalThis.supabaseClient = original; });
  const montar = () => {
    const rows = [{ id: 1, created_at: '2026-09-27T09:00:00Z', tipo: 'sistema', texto: 'O clima mudou.', meta: {} }];
    globalThis.supabaseClient = {
      rpc: vi.fn(async () => ({ data: rows, error: null })),
      channel: () => {
        const ch = { on: (_e, _f, cb) => { handler = cb; return ch; }, subscribe: () => ch };
        return ch;
      },
      removeChannel: () => {},
    };
    return render(<div id="root"><W.CentralMensagens lang="pt" historiaId={5} /></div>);
  };

  /* As 3 últimas empilhadas (09/11/2026, usuário: "mostre no máximo as 3
     últimas mensagens antes de sumir"): até 3 ficam juntas; a 4ª faz a mais
     antiga sair; cada uma ainda some sozinha. */
  it('até 3 cards juntos; o 4º faz o mais antigo sair; o sino abre a lista', async () => {
    vi.useFakeTimers();
    montar();
    await act(async () => { await Promise.resolve(); });
    expect(document.querySelector('.cm-card')).toBeNull();          // o histórico não vira card
    const evento = (id, texto) => act(() => handler({ new: { id, created_at: `2026-09-27T10:0${id}:00Z`, tipo: 'ataque', texto, meta: {} } }));
    evento(2, 'Golpe!');
    evento(3, 'Cura.');
    evento(4, 'Esquiva.');
    let cards = [...document.querySelectorAll('.cm-card')];
    expect(cards).toHaveLength(3);
    expect(cards.some((c) => c.classList.contains('is-saindo'))).toBe(false);   // os 3 à vista
    evento(5, 'Fuga.');
    cards = [...document.querySelectorAll('.cm-card')];
    expect(cards).toHaveLength(4);
    expect(cards[0].classList.contains('is-saindo')).toBe(true);    // o mais antigo em fade-out
    expect(cards[0].textContent).toMatch(/Golpe/);
    act(() => { vi.advanceTimersByTime(500); });
    expect([...document.querySelectorAll('.cm-card')].map((c) => c.textContent.match(/Cura|Esquiva|Fuga/)[0]))
      .toEqual(['Cura', 'Esquiva', 'Fuga']);                       // a mais nova embaixo
    act(() => { vi.advanceTimersByTime(7000); });
    expect(document.querySelector('.cm-card')).toBeNull();          // saem sozinhos

    fireEvent.click(document.querySelector('.cm-fab'));
    const lista = document.querySelector('.cm-log-lista');
    expect(lista).toBeTruthy();
    expect([...lista.querySelectorAll('.cm-msg-texto')].map((t) => t.textContent))
      .toEqual(['Fuga.', 'Esquiva.', 'Cura.', 'Golpe!', 'O clima mudou.']);
  });

  /* A cortina da batalha (10/11/2026): na tela do jogador, o evento da batalha
     com cortina espera a revelação; o pedido ao Mestre e o resto, não. */
  it('o evento da batalha espera a revelação e sai no compasso dos efeitos', async () => {
    vi.useFakeTimers();
    montar();
    await act(async () => { await Promise.resolve(); });
    window.__menestrelCortinas = new Set(['9']);
    const evento = (id, meta) => act(() => handler({ new: { id, created_at: '2026-09-27T10:00:00Z', tipo: 'ataque', texto: 'E' + id, meta } }));
    evento(2, { batalha_id: 9 });
    evento(3, { batalha_id: 9 });
    evento(4, { batalha_id: 9, motivo: 'aprovacao_mestre' });
    evento(5, { batalha_id: 7 });
    expect([...document.querySelectorAll('.cm-card')].map((c) => c.textContent.match(/E[0-9]/)[0])).toEqual(['E4', 'E5']);
    act(() => { window.dispatchEvent(new CustomEvent('menestrel:revelacao', { detail: { batalhaId: '9', intervalo: 1000 } })); });
    expect(document.querySelectorAll('.cm-card')).toHaveLength(3);
    act(() => { vi.advanceTimersByTime(1000); });
    expect([...document.querySelectorAll('.cm-card')].map((c) => c.textContent.match(/E[0-9]/)[0])).toContain('E3');
    window.__menestrelCortinas = new Set();
  });
});
