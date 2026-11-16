/* ============================================================
   forum.test.jsx — o Fórum (15/11/2026)
   ============================================================
   "Teremos salas temáticas, onde o perfil poderá criar tópicos para
   discussão. Os tópicos podem ter resposta de outros membros pagantes. Os
   membros de conta gratuita só podem visualizar e curtir o tópico e as
   respostas, não poderá responder ou criar tópicos." (usuário)

   Salas: só o Imperador cria. Tópicos e respostas: quem paga. O autor edita
   o seu; apagar é do autor ou do Imperador. Plebeu lê e curte.
   ============================================================ */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const shellFonte = readFileSync(resolve(aqui, '../10-shell/shell.jsx'), 'utf8');
const mainFonte = readFileSync(resolve(aqui, '../main.tsx'), 'utf8');

let papel = { escreve: false, imperador: false };
let escritas = [];
let rpcs = [];
const agora = () => new Date().toISOString();
const SALAS = [
  { id: 1, pai_id: null, nome: 'Regras', descricao: 'Dúvidas de regra', ordem: 0, fechada: false, topicos: 3, salas: 1, ultima_atividade: agora(),
    ultimo_topico_id: 10, ultimo_topico_titulo: 'Como funciona a cascata?', ultimo_topico_autor: 'Bia', ultimo_topico_em: agora() },
  { id: 2, pai_id: 1, nome: 'Magias', descricao: null, ordem: 0, fechada: false, topicos: 0, salas: 0, ultima_atividade: null,
    ultimo_topico_id: null, ultimo_topico_titulo: null, ultimo_topico_autor: null, ultimo_topico_em: null },
];
const TOPICOS = [
  { id: 10, titulo: 'Como funciona a cascata?', autor_id: 'outro', autor_nome: 'Bia', autor_avatar: null, autor_conta: 'nobre',
    criado_em: agora(), ultima_atividade: agora(), respostas: 1, curtidas: 2, eu_curti: false, visualizacoes: 7,
    ultima_resposta_trecho: 'A EF por último.', ultima_resposta_autor: 'Eu', ultima_resposta_em: agora(), fechado: false, novas: true },
  { id: 11, titulo: 'Já lido', autor_id: 'outro', autor_nome: 'Bia', autor_avatar: null, autor_conta: 'nobre',
    criado_em: agora(), ultima_atividade: agora(), respostas: 0, curtidas: 0, eu_curti: false, visualizacoes: 1,
    ultima_resposta_trecho: null, ultima_resposta_autor: null, ultima_resposta_em: null, fechado: false, novas: false },
  { id: 12, titulo: 'Encerrado', autor_id: 'outro', autor_nome: 'Bia', autor_avatar: null, autor_conta: 'nobre',
    criado_em: agora(), ultima_atividade: agora(), respostas: 0, curtidas: 0, eu_curti: false, visualizacoes: 0,
    ultima_resposta_trecho: null, ultima_resposta_autor: null, ultima_resposta_em: null, fechado: true, novas: true },
];
const TOPICO = { id: 10, sala_id: 1, titulo: 'Como funciona a cascata?', corpo: 'EH, depois AR.\n\nE a EF?', autor_id: 'outro',
  autor_nome: 'Bia', autor_avatar: null, autor_conta: 'nobre', criado_em: new Date().toISOString(), editado_em: null, curtidas: 2, eu_curti: false,
  respostas: [{ id: 100, corpo: 'A EF por último.', autor_id: 'eu', autor_nome: 'Eu', autor_avatar: null, autor_conta: 'conselheiro',
    criado_em: new Date().toISOString(), editado_em: null, curtidas: 0, eu_curti: false }] };

beforeAll(async () => {
  const tabela = (nome) => {
    const b = {
      _op: null,
      insert: (linha) => { escritas.push({ tabela: nome, op: 'insert', linha }); b._op = 'insert'; return b; },
      update: (linha) => { escritas.push({ tabela: nome, op: 'update', linha }); return b; },
      delete: () => { escritas.push({ tabela: nome, op: 'delete' }); return b; },
      select: () => b, eq: () => b, order: () => b,
      single: async () => ({ data: { id: 11 }, error: null }),
      then: (ok, f) => Promise.resolve({ data: [], error: null }).then(ok, f),
    };
    return b;
  };
  globalThis.supabaseClient = {
    from: tabela,
    rpc: async (nome, args) => {
      rpcs.push({ nome, args });
      if (nome === 'pode_escrever_forum') return { data: papel.escreve, error: null };
      if (nome === 'eh_admin') return { data: papel.imperador, error: null };
      if (nome === 'forum_salas_resumo') return { data: SALAS, error: null };
      if (nome === 'forum_topicos_da_sala') return { data: TOPICOS, error: null };
      if (nome === 'forum_topico') return { data: TOPICO, error: null };
      return { data: null, error: null };
    },
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: { user: { id: 'eu' } } }) },
  };
  window.UI = { Input: 'input' };
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../10-shell/shell.jsx');
  await import('../09-bestiario/bestiario.jsx');
  await import('../10-shell/contas.jsx');
  await import('./forum.jsx');
});

beforeEach(() => { escritas = []; rpcs = []; papel = { escreve: false, imperador: false }; });
afterEach(cleanup);

const abrir = async () => {
  render(<div className="menestrel-ui"><window.ForumView lang="pt" /></div>);
  await waitFor(() => expect(screen.getByText('Regras')).toBeTruthy());
};
const entrarNoTopico = async () => {
  fireEvent.click(screen.getByText('Regras'));
  await waitFor(() => expect(screen.getByText('Como funciona a cascata?')).toBeTruthy());
  fireEvent.click(screen.getByText('Como funciona a cascata?'));
  await waitFor(() => expect(screen.getByText('A EF por último.')).toBeTruthy());
};
const novo = () => document.querySelector('.best-botao-novo');

describe('o Plebeu lê e curte', () => {
  it('vê as salas, sem o + e com o aviso de leitura', async () => {
    await abrir();
    await waitFor(() => expect(screen.getByText(/Contas Plebeu leem e curtem/)).toBeTruthy());
    expect(novo()).toBeNull();
  });

  it('na sala, sem o + de novo tópico', async () => {
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Como funciona a cascata?')).toBeTruthy());
    expect(novo()).toBeNull();
  });

  it('no tópico, lê o texto e as respostas, mas não tem onde responder', async () => {
    await abrir();
    await entrarNoTopico();
    expect(screen.getByText('EH, depois AR.')).toBeTruthy();
    expect(screen.queryByLabelText('Sua resposta')).toBeNull();
  });

  it('curte o tópico', async () => {
    await abrir();
    await entrarNoTopico();
    fireEvent.click(document.querySelector('.forum-post--topico .forum-curtir'));
    await waitFor(() => expect(escritas).toContainEqual({ tabela: 'forum_curtidas', op: 'insert', linha: { topico_id: 10 } }));
  });
});

describe('quem paga escreve', () => {
  it('cria tópico na sala', async () => {
    papel = { escreve: true, imperador: false };
    await abrir();
    expect(novo(), 'sala é do Imperador').toBeNull();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(novo()).toBeTruthy());
  });

  it('responde ao tópico', async () => {
    papel = { escreve: true, imperador: false };
    await abrir();
    await entrarNoTopico();
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'Concordo.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    await waitFor(() => expect(escritas).toContainEqual({ tabela: 'forum_respostas', op: 'insert', linha: { topico_id: 10, corpo: 'Concordo.' } }));
  });

  it('edita e apaga só o que é seu', async () => {
    papel = { escreve: true, imperador: false };
    await abrir();
    await entrarNoTopico();
    const topico = document.querySelector('.forum-post--topico');
    expect(within(topico).queryByLabelText('Editar tópico')).toBeNull();
    expect(within(topico).queryByLabelText('Apagar tópico')).toBeNull();
    const minha = screen.getByText('A EF por último.').closest('.forum-post');
    expect(within(minha).getByLabelText('Editar resposta')).toBeTruthy();
    expect(within(minha).getByLabelText('Apagar resposta')).toBeTruthy();
  });
});

describe('o Imperador', () => {
  it('abre salas e apaga o tópico dos outros', async () => {
    papel = { escreve: true, imperador: true };
    await abrir();
    await waitFor(() => expect(novo()).toBeTruthy());
    await entrarNoTopico();
    expect(within(document.querySelector('.forum-post--topico')).getByLabelText('Apagar tópico')).toBeTruthy();
    expect(within(document.querySelector('.forum-post--topico')).queryByLabelText('Editar tópico')).toBeNull();
  });
});

describe('onde o fórum mora', () => {
  it('carrega depois do shell e do bestiário', () => {
    const i = mainFonte.indexOf("import './14-forum/forum.jsx'");
    expect(i).toBeGreaterThan(mainFonte.indexOf("import './10-shell/shell.jsx'"));
    expect(i).toBeGreaterThan(mainFonte.indexOf("import './09-bestiario/bestiario.jsx'"));
  });
  it('abaixo do Compêndio, para o Mestre e para o Jogador', () => {
    const nav = window.NAV_MESA;
    ['master', 'player'].forEach((p) => {
      const ids = nav[p].mesa.map((n) => n.id || n.secao);
      expect(ids[ids.indexOf('compendio') + 1]).toBe('forum');
    });
  });
  it('o shell desenha a página', () => {
    expect(shellFonte).toMatch(/current\.id === 'forum' \? \(/);
    expect(shellFonte).toMatch(/forum: 'ti-messages'/);
  });
});

describe('salas dentro de salas e os números', () => {
  it('no primeiro nível só as salas sem pai; a linha diz tópicos, salas e o último tópico', async () => {
    await abrir();
    expect(screen.queryByText('Magias')).toBeNull();
    const linha = screen.getByText('Regras').closest('.forum-linha');
    expect(linha.textContent).toMatch(/3 tópicos/);
    expect(linha.textContent).toMatch(/1 sala/);
    expect(within(linha).getByText('Como funciona a cascata?')).toBeTruthy();
    expect(linha.querySelector('.forum-ultimo-meta').textContent).toMatch(/^Bia · /);
  });

  it('dentro da sala: as salas de dentro e o caminho no trilho', async () => {
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Magias')).toBeTruthy());
    fireEvent.click(screen.getByText('Magias'));
    const caminho = [...document.querySelectorAll('.forum-caminho .mc-acao-rotulo')].map((e) => e.textContent);
    expect(caminho).toEqual(['Salas', 'Regras', 'Magias']);
  });

  /* 15/11/2026, usuário: "O botão 'nova sala aqui' não vai existir. Ao clicar
     em mais, terei a opção de criar um novo tópico ou nova sala." */
  it('só o Imperador abre sala dentro da sala: o + oferece tópico ou sala', async () => {
    papel = { escreve: true, imperador: false };
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Como funciona a cascata?')).toBeTruthy());
    expect(screen.queryByText('Nova sala aqui')).toBeNull();
    fireEvent.click(document.querySelector('.best-botao-novo'));
    expect(document.querySelector('.forum-menu-novo')).toBeNull();   // quem não é Imperador vai direto ao tópico
    cleanup();
    papel = { escreve: true, imperador: true };
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Como funciona a cascata?')).toBeTruthy());
    expect(screen.queryByText('Nova sala aqui')).toBeNull();
    fireEvent.click(document.querySelector('.best-botao-novo'));
    const menu = document.querySelector('.forum-menu-novo');
    expect(menu).toBeTruthy();
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent)).toEqual(['Novo tópico', 'Nova sala']);
  });

  it('o tópico diz visualizações, comentários e o último post', async () => {
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Como funciona a cascata?')).toBeTruthy());
    const linha = screen.getByText('Como funciona a cascata?').closest('.forum-linha');
    expect(linha.textContent).toMatch(/7 visualizações/);
    expect(linha.textContent).toMatch(/1 comentário/);
    expect(within(linha).getByText('A EF por último.')).toBeTruthy();
    expect(linha.querySelector('.forum-ultimo-meta').textContent).toMatch(/^Eu · /);
  });

  it('abrir o tópico conta a visualização', async () => {
    await abrir();
    await entrarNoTopico();
    expect(rpcs).toContainEqual({ nome: 'forum_ver_topico', args: { p_id: 10 } });
  });
});

describe('os ícones do tópico', () => {
  const estado = (titulo) => screen.getByText(titulo).closest('.forum-linha').querySelector('.forum-estado');
  it('novo, lido e fechado — o fechado vale mais que o novo', async () => {
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(screen.getByText('Encerrado')).toBeTruthy());
    expect(estado('Como funciona a cascata?').getAttribute('aria-label')).toBe('Mensagens novas');
    expect(estado('Como funciona a cascata?').querySelector('.ti-mail')).toBeTruthy();
    expect(estado('Já lido').getAttribute('aria-label')).toBe('Sem mensagens novas');
    expect(estado('Já lido').querySelector('.ti-mail-opened')).toBeTruthy();
    expect(estado('Encerrado').getAttribute('aria-label')).toBe('Tópico fechado');
    expect(estado('Encerrado').querySelector('.ti-lock')).toBeTruthy();
    expect(screen.getByText('Como funciona a cascata?').closest('.forum-linha').classList.contains('is-novo')).toBe(true);
    expect(screen.getByText('Encerrado').closest('.forum-linha').classList.contains('is-novo')).toBe(false);
  });
  it('a legenda explica os três', async () => {
    await abrir();
    fireEvent.click(screen.getByText('Regras'));
    await waitFor(() => expect(document.querySelector('.forum-legenda')).toBeTruthy());
    expect(document.querySelector('.forum-legenda').textContent).toBe('Mensagens novasSem mensagens novasTópico fechado');
  });
});
