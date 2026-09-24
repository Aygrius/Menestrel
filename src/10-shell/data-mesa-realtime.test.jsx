/* ============================================================
   data-mesa-realtime.test.jsx — a data da mesa é a mesma para todos
   ============================================================
   "Persistência da data da mesa para todos os jogadores." (usuário,
   15/09/2026)

   A data já morava no banco (historias.data_jogo_atual), mas o card só a lia
   UMA VEZ, quando a mesa era resolvida: o Mestre avançava o dia e o jogador
   continuava vendo o dia velho até recarregar a página. `historias` já está na
   publicação de realtime (a mesma de mesa_log e batalhas), então o card passa
   a ouvir o UPDATE da linha da mesa.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let Card;
beforeAll(() => {
  Card = window.CardDataJogoAtual;
  expect(Card, 'CardDataJogoAtual precisa estar no window').toBeTypeOf('function');
});
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const DIA_11 = { dia: 11, mes: 11, ano: 1500, local: 'Farzelo' };
const DIA_12 = { dia: 12, mes: 11, ano: 1500, local: 'Farzelo' };

// Dublê mínimo: a leitura da mesa e o canal de realtime, cujo handler o teste
// dispara como o servidor dispararia.
function montar({ podeEditar = false } = {}) {
  const canais = [];
  let handler = null;
  globalThis.supabaseClient = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data_jogo_atual: DIA_11 }, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    channel: (nome) => {
      const ch = { nome, on: (evento, filtro, fn) => { handler = fn; ch.filtro = filtro; return ch; }, subscribe: () => ch };
      canais.push(ch);
      return ch;
    },
    removeChannel: (ch) => { canais.splice(canais.indexOf(ch), 1); },
  };
  const r = render(<Card lang="pt" historiaId={13} podeEditar={podeEditar} profile={podeEditar ? 'master' : 'player'} />);
  return { ...r, canais, disparar: (nova) => act(() => { handler({ new: { data_jogo_atual: nova } }); }) };
}

const dataNaTela = () => document.querySelector('.cdj-data')?.textContent || '';

describe('a data da mesa chega sem recarregar', () => {
  it('assina o UPDATE da linha desta história', async () => {
    const { canais } = montar();
    await waitFor(() => expect(dataNaTela()).toMatch(/11/));
    expect(canais).toHaveLength(1);
    expect(canais[0].filtro).toMatchObject({ event: 'UPDATE', table: 'historias', filter: 'id=eq.13' });
  });

  it('o jogador vê o dia novo quando o Mestre avança', async () => {
    const { disparar } = montar();
    await waitFor(() => expect(dataNaTela()).toMatch(/11/));
    disparar(DIA_12);
    await waitFor(() => expect(dataNaTela()).toMatch(/12/));
  });

  it('sai de cena junto com o card — nada de canal órfão', async () => {
    const { canais, unmount } = montar();
    await waitFor(() => expect(canais).toHaveLength(1));
    unmount();
    expect(canais).toHaveLength(0);
  });
});
