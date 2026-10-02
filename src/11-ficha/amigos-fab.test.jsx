/* ============================================================
   amigos-fab.test.jsx — pacto de amizade e cards dos amigos
   ============================================================
   "vamos adicionar botões com o avatar dos outros personagens de jogadores à
   esquerda, mas só vai aparecer dos personagens que fizeram um pacto de
   amizade, para isso, adicione um botão com ícone heart-handshake para selar
   o pacto de amizade." (usuário, 28/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/helpers.jsx';
import './amigos-fab.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let AmigosFab;
beforeAll(() => {
  AmigosFab = window.AmigosFab;
  expect(AmigosFab).toBeTypeOf('function');
});
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const LISTA = [
  { id: 2, nome: 'Ana', sobrenome: null, foto_url: 'https://x/ana.png', estado: 'selado' },
  { id: 3, nome: 'Bruno', sobrenome: 'Ferro', foto_url: null, estado: 'recebido' },
  { id: 4, nome: 'Cora', sobrenome: null, foto_url: null, estado: 'nenhum' },
  { id: 5, nome: 'Dario', sobrenome: null, foto_url: null, estado: 'enviado' },
];

function montar(chamadas = []) {
  globalThis.supabaseClient = fakeSupabase({
    __rpc: {
      listar_amizades: () => LISTA,
      propor_pacto: (args) => { chamadas.push(['propor_pacto', args]); return { ok: true, estado: 'selado' }; },
      desfazer_pacto: (args) => { chamadas.push(['desfazer_pacto', args]); return { ok: true, estado: 'nenhum' }; },
    },
  });
  return render(<AmigosFab lang="pt" pjId={1} />).container;
}

describe('AmigosFab', () => {
  it('só quem selou o pacto vira card, com o id para o arraste', async () => {
    const c = montar();
    await waitFor(() => expect(c.querySelector('.amg-fab')).toBeTruthy());
    const cards = [...c.querySelectorAll('[data-amigo-pj-id]')];
    expect(cards.map((el) => el.getAttribute('data-amigo-pj-id'))).toEqual(['2']);
    expect(cards[0].querySelector('img').getAttribute('src')).toBe('https://x/ana.png');
    expect(c.querySelector('.amg-fab .ti-heart-handshake')).toBeTruthy();
    // Um pedido de pacto esperando resposta.
    expect(c.querySelector('.amg-badge').textContent).toBe('1');
  });

  it('o painel lista todos e cada estado tem sua ação', async () => {
    const chamadas = [];
    const c = montar(chamadas);
    await waitFor(() => expect(c.querySelector('.amg-fab')).toBeTruthy());
    fireEvent.click(c.querySelector('.amg-fab'));
    await screen.findByText('Bruno Ferro');
    expect(screen.getByText('Romper')).toBeTruthy();
    // Selar pacto é só o ícone do menu (28/09/2026).
    expect(screen.getByRole('button', { name: 'Selar pacto' }).querySelector('.ti-heart-handshake')).toBeTruthy();
    expect(screen.queryByText('Selar pacto')).toBeNull();
    expect(screen.queryByText('Pactos de amizade')).toBeNull();
    // Proposta enviada: o ícone cinza, sem o texto "Cancelar".
    expect(screen.getByRole('button', { name: 'Cancelar proposta de pacto' }).classList.contains('amg-acao--pendente')).toBe(true);
    expect(screen.queryByText('Cancelar')).toBeNull();
    fireEvent.click(screen.getByText('Aceitar'));
    await waitFor(() => expect(chamadas).toContainEqual(['propor_pacto', { p_pj_id: 1, p_outro_id: 3 }]));
  });

  it('sem ninguém na história, nada aparece', async () => {
    globalThis.supabaseClient = fakeSupabase({ __rpc: { listar_amizades: [] } });
    const { container } = render(<AmigosFab lang="pt" pjId={1} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.amg-root')).toBeNull();
  });

  it('a ficha monta o AmigosFab para o dono do personagem', () => {
    const src = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');
    expect(src).toMatch(/podeEditarFoto && pjAtivoId && typeof AmigosFab !== 'undefined'/);
  });
});
