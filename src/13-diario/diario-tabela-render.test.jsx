/* ============================================================
   diario-tabela-render.test.jsx — Personagens/Lugares/Memórias no molde
   de Magias, com as duas origens na mesma tabela
   ============================================================
   Pedido do usuário (12/09/2026): "As telas de memórias, personagens e
   lugares ainda estão muito diferentes de magias, técnicas, habilidades.
   Remova 'meu diário' e 'informações da aventura', agora devem aparecer na
   mesma tabela, com marcação de criação do usuário ou da aventura."

   Cada bloco falha se a regra correspondente voltar atrás: o menu de duas
   abas reaparecer, uma das origens sumir da tabela, a coluna Origem perder
   a marcação, ou a página voltar a ter barra/paginação próprias.
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
    expect(document.querySelector('.best-count').textContent).toBe('3 de 3');
  });

  it('os chips de origem filtram a tabela, e a contagem diz quanto sobrou', async () => {
    await montar('npc');
    fireEvent.click(document.querySelector('[aria-label="Criadas por você"]'));
    expect(linhas()).toEqual([['Arissia', 'Pessoal']]);
    expect(document.querySelector('.best-count').textContent).toBe('1 de 3');

    fireEvent.click(document.querySelector('[aria-label="Da aventura"]'));
    expect(linhas().map((l) => l[0])).toEqual(['Borin', 'Cael']);
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
});

describe('Memórias: só existe uma origem, então não há coluna nem chips', () => {
  it('sem Origem', async () => {
    await montar('memoria');
    expect(cabecalho()).toEqual(['Título', 'Trecho']);
    expect(document.querySelector('.best-chips')).toBeNull();
  });
});

describe('as mesmas peças de Magias', () => {
  it('cabeçalho com o "Novo", barra do bestiário, paginação do bestiário', async () => {
    await montar('npc');
    const card = document.querySelector('.fp-card.best.best-auto');
    // As peças ficam soltas no card, como em Magias: .best é coluna flex.
    expect(card.querySelector(':scope > .best-toolbar-bestiario')).toBeTruthy();
    expect(card.querySelector(':scope > .best-table-wrap')).toBeTruthy();
    expect(card.querySelector(':scope > .best-pag')).toBeTruthy();
    expect(card.querySelector('.fp-card-top').textContent).toMatch(/Novo NPC/);
    // A contagem saiu do cabeçalho para a barra.
    expect(card.querySelector('.fp-card-top .best-count')).toBeNull();
  });
});
