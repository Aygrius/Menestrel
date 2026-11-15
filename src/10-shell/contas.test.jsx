/* ============================================================
   contas.test.jsx — a janela "Contas", do Imperador (15/11/2026)
   ============================================================
   "Teremos 4 tipos de conta em nosso sistema. A minha, que será denominada
   com a nomenclatura Imperador [...] Plebeu [...] Conselheiro [...] Nobre"
   e "O sistema de pagamento ficará suspenso até criarmos um" (usuário).

   Quem promove é o Imperador, por aqui. O Nobre ganha uma validade (30 dias
   ao virar Nobre); vencida, a conta vale Plebeu — e o placar conta pela
   conta que VALE. A conta do Imperador não tem controle nenhum.
   ============================================================ */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const shellFonte = readFileSync(resolve(aqui, 'shell.jsx'), 'utf8');
const mainFonte = readFileSync(resolve(aqui, '../main.tsx'), 'utf8');

let CONTAS = [];
let chamadas = [];
let resposta = null;

beforeAll(async () => {
  globalThis.supabaseClient = {
    from: () => { const b = { select: () => b, eq: () => b, order: () => b, then: (ok) => Promise.resolve({ data: [], error: null }).then(ok) }; return b; },
    rpc: async (nome, args) => {
      chamadas.push({ nome, args });
      if (nome === 'admin_listar_contas') return { data: CONTAS, error: null };
      if (nome === 'admin_definir_conta') return resposta || { data: { ok: true }, error: null };
      return { data: null, error: null };
    },
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  };
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('./shell.jsx');
  await import('./contas.jsx');
});

beforeEach(() => {
  chamadas = [];
  resposta = null;
  const ontem = new Date(Date.now() - 86400000).toISOString();
  CONTAS = [
    { id: 'imp', email: 'imp@x', nome: 'O Imperador', tipo_conta: 'imperador', conta_valida_ate: null, conta_efetiva: 'imperador', personagens: 0, historias: 2 },
    { id: 'p1', email: 'ana@x', nome: 'Ana', tipo_conta: 'plebeu', conta_valida_ate: null, conta_efetiva: 'plebeu', personagens: 1, historias: 0 },
    { id: 'n1', email: 'bia@x', nome: 'Bia', tipo_conta: 'nobre', conta_valida_ate: ontem, conta_efetiva: 'plebeu', personagens: 3, historias: 1 },
  ];
});
afterEach(cleanup);

const abrir = async () => {
  render(<div className="menestrel-ui"><window.ContasModal lang="pt" onClose={() => {}} /></div>);
  await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy());
};
const linhaDe = (nome) => screen.getByText(nome).closest('.contas-linha');

describe('a janela Contas', () => {
  it('lista as contas; a do Imperador não tem controle', async () => {
    await abrir();
    expect(within(linhaDe('O Imperador')).queryByRole('radiogroup')).toBeNull();
    expect(within(linhaDe('O Imperador')).getByText('Imperador')).toBeTruthy();
    expect(within(linhaDe('Ana')).getByRole('radio', { name: 'Plebeu' }).getAttribute('aria-checked')).toBe('true');
  });

  it('o placar conta pela conta que vale: o Nobre vencido conta Plebeu', async () => {
    await abrir();
    const celula = (rotulo) => [...document.querySelectorAll('.contas-placar .mn-celula')]
      .find((c) => c.querySelector('.mn-rotulo').textContent === rotulo).querySelector('.mn-celula-valor').textContent;
    expect(celula('Plebeu')).toBe('2');
    expect(celula('Nobre')).toBe('0');
    expect(celula('Nobres vencidos')).toBe('1');
    expect(within(linhaDe('Bia')).getByText(/Venceu em/)).toBeTruthy();
  });

  it('virar Nobre grava com 30 dias de validade, até o fim do dia', async () => {
    await abrir();
    fireEvent.click(within(linhaDe('Ana')).getByRole('radio', { name: 'Nobre' }));
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'admin_definir_conta')).toBe(true));
    const { args } = chamadas.find((c) => c.nome === 'admin_definir_conta');
    expect(args).toMatchObject({ p_user_id: 'p1', p_tipo: 'nobre' });
    const dt = new Date(args.p_valida_ate);
    const esperado = new Date(); esperado.setDate(esperado.getDate() + 30);
    expect(dt.toDateString()).toBe(esperado.toDateString());
    expect(dt.getHours()).toBe(23);
  });

  it('Conselheiro grava sem validade', async () => {
    await abrir();
    fireEvent.click(within(linhaDe('Ana')).getByRole('radio', { name: 'Conselheiro' }));
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'admin_definir_conta')).toBe(true));
    expect(chamadas.find((c) => c.nome === 'admin_definir_conta').args).toMatchObject({ p_tipo: 'conselheiro', p_valida_ate: null });
  });

  it('a recusa do banco aparece na própria linha', async () => {
    resposta = { data: { ok: false, motivo: 'validade_obrigatoria' }, error: null };
    await abrir();
    fireEvent.click(within(linhaDe('Ana')).getByRole('radio', { name: 'Nobre' }));
    await waitFor(() => expect(within(linhaDe('Ana')).getByRole('alert').textContent).toMatch(/validade no futuro/));
  });

  it('a busca acha por nome e por e-mail', async () => {
    await abrir();
    fireEvent.change(screen.getByLabelText('Buscar contas'), { target: { value: 'bia@' } });
    expect(screen.queryByText('Ana')).toBeNull();
    expect(screen.getByText('Bia')).toBeTruthy();
  });
});

describe('onde a janela mora', () => {
  it('carrega depois do shell, que tem o ModalShell', () => {
    expect(mainFonte.indexOf("import './10-shell/contas.jsx'")).toBeGreaterThan(mainFonte.indexOf("import './10-shell/shell.jsx'"));
  });
  it('abre pelas Configurações, só para o Imperador', () => {
    expect(shellFonte).toMatch(/onContas=\{ehAdmin && typeof ContasModal !== 'undefined' \? \(\) => setContasAberto\(true\) : null\}/);
    expect(shellFonte).toMatch(/\{contasAberto && ehAdmin && typeof ContasModal !== 'undefined' && \(/);
  });
});
