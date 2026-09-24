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
    expect(document.querySelector('tbody tr') || document.querySelector('.best-empty')).toBeTruthy();
  });
};

const linhas = () => Array.from(document.querySelectorAll('tbody tr')).map((tr) =>
  Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim()).filter(Boolean)
);
const cabecalho = () => Array.from(document.querySelectorAll('thead th'))
  .map((th) => (th.textContent || '').replace(/[▲▼]/g, '').trim()).filter(Boolean);

describe('NPCs: uma tabela só', () => {
  it('não há mais o menu "Meu Diário" / "Informações da Aventura"', async () => {
    await montar('npc');
    const texto = document.body.textContent;
    expect(texto).not.toMatch(/Meu Diário/);
    expect(texto).not.toMatch(/Informações da Aventura/);
  });

  it('o que o jogador escreveu e o que veio da aventura aparecem juntos, marcados', async () => {
    await montar('npc');
    expect(cabecalho()).toEqual(['Nome', 'Origem']);
    expect(linhas()).toEqual([
      ['Arissia', 'Pessoal'],
      ['Borin', 'Aventura'],   // outro jogador compartilhou
      ['Cael', 'Aventura'],    // o Mestre liberou
    ]);
  });

  it('a busca do cabeçalho filtra a tabela', async () => {
    await montar('npc');
    const busca = document.querySelector('.fp-card-top .best-search input[type="search"]');
    expect(busca.getAttribute('placeholder')).toBe('Buscar NPC…');
    fireEvent.change(busca, { target: { value: 'bor' } });
    expect(linhas()).toEqual([['Borin', 'Aventura']]);
  });
});

describe('Lugares mistura Reino e Cidade e as duas origens', () => {
  it('Tipo e Origem lado a lado', async () => {
    await montar('lugar');
    expect(cabecalho()).toEqual(['Nome', 'Tipo', 'Origem']);
    expect(linhas()).toEqual([
      ['Reino do Norte', 'Reino', 'Aventura'],
      ['Verrogar', 'Cidade', 'Pessoal'],
    ]);
  });

  /* 17/09/2026: "Novo reino e nova cidade serão a mesma coisa." (usuário)
     O + abria um modal de escolha Reino/Cidade e SÓ ENTÃO o formulário — dois
     passos para um campo. Agora abre o formulário direto, com o tipo como
     primeiro campo dele (ver lugar-tipo-unico.test.jsx, que cobre o seletor).
     O + continua sendo um só, que é o que este teste garantia antes. */
  it('um + só no cabeçalho, que abre o formulário de lugar direto', async () => {
    await montar('lugar');
    const novos = document.querySelectorAll('.fp-card-top [aria-label="Novo"]');
    expect(novos).toHaveLength(1);
    fireEvent.click(novos[0]);
    // Sem passar por nenhuma janela de escolha: o formulário já está aberto.
    expect(document.querySelector('[role="dialog"][aria-label="Novo lugar"]')).toBeNull();
    const form = document.querySelector('[role="dialog"][aria-label="Novo Reino"]');
    expect(form).toBeTruthy();
    // E o tipo é escolhível ali dentro, sem fechar e reabrir.
    expect([...form.querySelectorAll('.diario-lugar-tipo input')].map((i) => i.value))
      .toEqual(['reino', 'cidade']);
  });
});

describe('Memórias: só existe uma origem, então não há coluna', () => {
  it('sem Origem', async () => {
    await montar('memoria');
    expect(cabecalho()).toEqual(['Título', 'Trecho']);
  });
});

describe('as mesmas peças de Itens e Magias', () => {
  it.each(['npc', 'lugar', 'memoria'])('%s: sem chips de filtro, sem contagem, sem barra abaixo do cabeçalho', async (tipo) => {
    await montar(tipo);
    expect(document.querySelector('.best-chips')).toBeNull();
    expect(document.querySelector('.best-count')).toBeNull();
    expect(document.querySelector('.best-toolbar-bestiario')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+ de \d+/);
  });

  it('cabeçalho com a busca e o + (só o símbolo, com tooltip), tabela e paginação do bestiário', async () => {
    await montar('npc');
    const card = document.querySelector('.fp-card.best.best-auto');
    const acoes = card.querySelector('.fp-card-top .best-header-acoes');
    expect(acoes.querySelector('.best-search input')).toBeTruthy();
    const novo = acoes.querySelector('[aria-label="Novo"]');
    expect(novo.textContent.trim()).toBe('');
    fireEvent.mouseEnter(novo);
    expect([...document.querySelectorAll('.mn-tip')].map((t) => t.textContent)).toContain('Novo NPC');
    // As peças ficam soltas no card, como em Magias: .best é coluna flex.
    expect(card.querySelector(':scope > .best-table-wrap')).toBeTruthy();
    expect(card.querySelector(':scope > .best-pag')).toBeTruthy();
  });

  it('memórias: o + tem o tooltip "Nova memória"', async () => {
    await montar('memoria');
    const novo = document.querySelector('.fp-card-top [aria-label="Novo"]');
    fireEvent.mouseEnter(novo);
    expect([...document.querySelectorAll('.mn-tip')].map((t) => t.textContent)).toContain('Nova memória');
  });
});
