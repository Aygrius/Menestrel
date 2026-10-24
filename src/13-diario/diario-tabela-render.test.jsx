/* ============================================================
   diario-tabela-render.test.jsx — Personagens/Lugares/Memórias no molde
   de Magias, com as duas origens na mesma tabela
   ============================================================
   Pedido do usuário (12/09/2026): "As telas de memórias, personagens e
   lugares ainda estão muito diferentes de magias, técnicas, habilidades.
   Remova 'meu diário' e 'informações da aventura', agora devem aparecer na
   mesma tabela, com marcação de criação do usuário ou da aventura."

   E em 14/09/2026: "As páginas 'lugares', 'npcs', 'memórias' vão seguir o
   mesmo padrão das demais páginas 'itens', 'magias', etc, no que diz
   respeito aos botões de filtro, botão de buscar, etc." — sem chips de
   filtro, sem o "X de Y", e a busca no cabeçalho ao lado do +.

   Cada bloco falha se a regra correspondente voltar atrás.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './diario.jsx';

const PJ = { id: 7, user_id: 'u1' };

const RPC = {
  listar_diario_lore: {
    ok: true, historia_id: 1, historia_nome: 'A Noite',
    entradas: [
      // Escrita por ESTE personagem → Pessoal
      { tipo: 'npc', slug: 'arissia', nome: 'Arissia', criado_por_personagem_id: 7, criado_por_nome: 'Eu' },
      // Compartilhada por outro jogador → chegou pela aventura
      { tipo: 'npc', slug: 'borin', nome: 'Borin', criado_por_personagem_id: 9, criado_por_nome: 'Tavi', compartilhado: true },
      { tipo: 'cidade', slug: 'verrogar', nome: 'Verrogar', criado_por_personagem_id: 7 },
    ],
  },
  listar_diario_disponivel: {
    ok: true, criaturas: [], colecao: [],
    memorias: [{ id: 1, titulo: 'A noite em Verrogar', comentario: 'Chovia.' }],
    // Do Mestre. Arissia repetida de propósito: já está no diário, não duplica.
    lore: [
      { tipo: 'npc', slug: 'cael', nome: 'Cael' },
      { tipo: 'npc', slug: 'arissia', nome: 'Arissia' },
      { tipo: 'reino', slug: 'norte', nome: 'Reino do Norte' },
    ],
  },
};

beforeAll(() => {
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  window.supabaseClient = {
    rpc: async (nome) => ({ data: RPC[nome] ?? { ok: true }, error: null }),
    from: () => { throw new Error('a lista não deveria consultar tabela ao montar'); },
  };
});

afterEach(() => { cleanup(); });

const montar = async (tipoFixo) => {
  render(
    <div className="menestrel-ui">
      <window.DiarioView pj={PJ} lang="pt" currentUserId="u1" isMestre={false} tipoFixo={tipoFixo} />
    </div>
  );
  await vi.waitFor(() => {
    expect(document.querySelector('.diario-cartao') || document.querySelector('.best-empty')).toBeTruthy();
  });
};

/* 23/10/2026: as páginas do Diário do Jogador viraram CARTÕES, como as do
   Mestre e Personagens — o trilho com a busca e o + acima, um cartão por
   entrada. A origem ("Pessoal") virou o sinal no canto do nome. */
const cartoes = () => Array.from(document.querySelectorAll('.diario-cartao')).map((c) => ({
  nome: (c.querySelector('.diario-cartao-nome').textContent || '').trim(),
  canto: c.querySelector('.pj-card-status')?.getAttribute('aria-label') || null,
  meta: Array.from(c.querySelectorAll('.pj-meta')).map((m) => (m.textContent || '').trim()),
}));

describe('NPCs: uma lista só', () => {
  it('não há mais o menu "Meu Diário" / "Informações da Aventura"', async () => {
    await montar('npc');
    const texto = document.body.textContent;
    expect(texto).not.toMatch(/Meu Diário/);
    expect(texto).not.toMatch(/Informações da Aventura/);
  });

  it('o que o jogador escreveu e o que veio da aventura aparecem juntos, marcados', async () => {
    await montar('npc');
    expect(cartoes().map((c) => [c.nome, c.canto])).toEqual([
      ['Arissia', 'Escrito por você'],
      ['Borin', null],   // outro jogador compartilhou
      ['Cael', null],    // o Mestre liberou
    ]);
  });

  it('a busca do trilho filtra os cartões', async () => {
    await montar('npc');
    const busca = document.querySelector('.cartoes-barra .best-search input[type="search"]');
    expect(busca.getAttribute('placeholder')).toBe('Buscar');
    expect(busca.parentElement.querySelector('.busca-ic.ti-eye')).toBeTruthy();
    fireEvent.change(busca, { target: { value: 'bor' } });
    expect(cartoes().map((c) => c.nome)).toEqual(['Borin']);
  });
});

describe('Lugares mistura Reino e Cidade e as duas origens', () => {
  it('os dois tipos, cada um com a sua origem', async () => {
    await montar('lugar');
    expect(cartoes().map((c) => [c.nome, c.canto])).toEqual([
      ['Reino do Norte', null],
      ['Verrogar', 'Escrito por você'],
    ]);
  });

  /* 17/09/2026: "Novo reino e nova cidade serão a mesma coisa." (usuário)
     O + abre o formulário direto, com o tipo como primeiro campo dele (ver
     lugar-tipo-unico.test.jsx, que cobre o seletor). */
  it('um + só no trilho, que abre o formulário de lugar direto', async () => {
    await montar('lugar');
    const novos = document.querySelectorAll('.cartoes-barra [aria-label="Novo"]');
    expect(novos).toHaveLength(1);
    fireEvent.click(novos[0]);
    expect(document.querySelector('[role="dialog"][aria-label="Novo lugar"]')).toBeNull();
    const form = document.querySelector('[role="dialog"][aria-label="Novo Reino"]');
    expect(form).toBeTruthy();
    expect([...form.querySelectorAll('.diario-lugar-tipo input')].map((i) => i.value))
      .toEqual(['reino', 'cidade']);
  });
});

describe('Memórias: o título e o começo do texto', () => {
  it('sem sinal de origem — memória é sempre do jogador', async () => {
    await montar('memoria');
    expect(cartoes()).toEqual([{ nome: 'A noite em Verrogar', canto: null, meta: ['Chovia.'] }]);
  });
});

describe('as mesmas peças de Personagens', () => {
  it.each(['npc', 'lugar', 'memoria'])('%s: sem tabela, sem chips de filtro, sem contagem', async (tipo) => {
    await montar(tipo);
    expect(document.querySelector('table')).toBeNull();
    expect(document.querySelector('.best-chips')).toBeNull();
    expect(document.querySelector('.best-count')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+ de \d+/);
    expect(document.querySelector('.pjs-grid .pj-card-wrap .pj-card')).toBeTruthy();
  });

  it('o + (só o símbolo, com tooltip) no trilho', async () => {
    await montar('npc');
    const novo = document.querySelector('.cartoes-barra [aria-label="Novo"]');
    expect(novo.textContent.trim()).toBe('');
    fireEvent.mouseEnter(novo);
    expect([...document.querySelectorAll('.mn-tip')].map((t) => t.textContent)).toContain('Nova pessoa');
  });

  it('memórias: o + tem o tooltip "Nova memória"', async () => {
    await montar('memoria');
    const novo = document.querySelector('.cartoes-barra [aria-label="Novo"]');
    fireEvent.mouseEnter(novo);
    expect([...document.querySelectorAll('.mn-tip')].map((t) => t.textContent)).toContain('Nova memória');
  });

  it('as ações moram na janela da entrada: a própria compartilha, edita e exclui', async () => {
    await montar('npc');
    fireEvent.click(document.querySelector('.diario-cartao'));
    const rotulos = [...document.querySelectorAll('[role="dialog"] button[aria-label]')].map((b) => b.getAttribute('aria-label'));
    expect(rotulos).toEqual(expect.arrayContaining(['Compartilhar com a mesa', 'Editar', 'Excluir']));
  });
});

/* A aba Diário dentro da ficha, na visão do Mestre (23/10/2026): também em
   cartões, com as sub-abas por tipo, e só leitura (o Mestre não é o autor). */
describe('a aba Diário da ficha (Mestre)', () => {
  it('cartões no lugar da tabela, sem o +', async () => {
    render(
      <div className="menestrel-ui">
        <window.DiarioView pj={PJ} lang="pt" currentUserId="mestre" isMestre />
      </div>
    );
    await vi.waitFor(() => {
      expect(document.querySelector('.diario-cartao') || document.querySelector('.best-empty')).toBeTruthy();
    });
    expect(document.querySelector('table')).toBeNull();
    expect(cartoes().map((c) => c.nome)).toEqual(['A noite em Verrogar']);
    fireEvent.click([...document.querySelectorAll('.diario-subtabs button')].find((b) => /Pessoa|NPC/i.test(b.textContent)));
    await vi.waitFor(() => expect(cartoes().length).toBe(3));
    expect(cartoes().map((c) => c.canto)).toEqual([null, null, null]);
    expect(document.querySelector('[aria-label="Novo"]')).toBeNull();
  });
});
