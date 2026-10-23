/* ============================================================
   primeira-entrada.test.jsx — o primeiro login pergunta o papel
   ============================================================
   22/10/2026: o modal "Escolha seu plano" (um gratuito e um Premium "em
   breve") deu lugar a "Vou mestrar / Vou jogar". O que não pode quebrar:

   1. a escolha grava perfil_tipo E plano_escolhido_em — este é o sinal de
      onboarding feito; sem ele a tela voltaria a cada login;
   2. o UPDATE NÃO manda `plano`: o gatilho trg_plano_somente_admin preserva
      o plano em silêncio, mas mandar o campo sugere que o dono o controla;
   3. falha no banco mantém a pessoa na tela, com erro, e sem avançar.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import './auth.jsx';

let PrimeiraEntrada;
const stubOriginal = globalThis.supabaseClient;
beforeAll(() => { PrimeiraEntrada = window.PrimeiraEntrada; });
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

function fakeSupabase(erro = null) {
  const chamadas = [];
  globalThis.supabaseClient = {
    from: (tabela) => ({
      update: (campos) => ({
        eq: (col, val) => { chamadas.push({ tabela, campos, col, val }); return Promise.resolve({ error: erro }); },
      }),
    }),
  };
  return chamadas;
}

const montar = (props) => render(
  <PrimeiraEntrada lang="pt" userId="u-1" nome="Arnor" shader={false} onEscolhido={() => {}} {...props} />
);

describe('PrimeiraEntrada', () => {
  it('oferece os dois papéis', () => {
    montar();
    expect(screen.getByRole('button', { name: /Vou mestrar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Vou jogar/ })).toBeTruthy();
  });

  it('"Vou mestrar" grava master e fecha o onboarding, sem tocar no plano', async () => {
    const chamadas = fakeSupabase();
    let escolhido = null;
    montar({ onEscolhido: (p) => { escolhido = p; } });
    fireEvent.click(screen.getByRole('button', { name: /Vou mestrar/ }));
    await waitFor(() => expect(escolhido).toBe('master'));
    expect(chamadas).toHaveLength(1);
    const { tabela, campos, col, val } = chamadas[0];
    expect(tabela).toBe('profiles');
    expect([col, val]).toEqual(['id', 'u-1']);
    expect(campos.perfil_tipo).toBe('master');
    expect(typeof campos.plano_escolhido_em).toBe('string');
    expect('plano' in campos).toBe(false);
  });

  it('erro no banco: fica na tela e avisa', async () => {
    fakeSupabase({ message: 'rls' });
    let escolhido = null;
    montar({ onEscolhido: (p) => { escolhido = p; } });
    fireEvent.click(screen.getByRole('button', { name: /Vou jogar/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível salvar/));
    expect(escolhido).toBeNull();
    expect(screen.getByRole('button', { name: /Vou jogar/ }).disabled).toBe(false);
  });
});
