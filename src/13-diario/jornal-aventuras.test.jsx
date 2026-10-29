/* ============================================================
   jornal-aventuras.test.jsx — o mural da cidade
   ============================================================
   Pedido do usuário (06/10/2026): "Quero criar um jornal para divulgação das
   aventuras que os personagens podem explorar […] Nome da Aventura · Estágio ·
   Personagem · Recompensa · Experiência · Início · Fim. As aventuras vão estar
   em uma aba da cidade."

   O QUE ESTE ARQUIVO TRAVA:

   1. O FIM NÃO VAZA. É a solução da aventura — "Envilla Demiris assassinou o
      próprio marido" —, e é a única decisão do jornal que não está literal no
      pedido: o jogador vê o convite, não o desfecho. Um `podeEditar` invertido
      por acidente entregaria o mistério resolvido, e nada na tela avisaria.
   2. OS SETE CAMPOS, na ordem do pedido. Campo que suma do formulário é campo
      que o Mestre não consegue preencher.
   3. `estagio` VAZIO VIRA NULL. '' num smallint é erro de tipo no Postgres, e
      o anúncio simplesmente não salvaria.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import './jornal-aventuras.jsx';

const A_VIUVA = {
  id: 1, cidade_slug: 'haafel', nome: 'A Viúva', estagio: 5,
  personagem: 'Celsior Altana',
  recompensa: '2 moedas de ouro',
  experiencia: '15 pontos de experiência',
  inicio: 'Dizem as más línguas que Celsior Altana está procurando aventureiros…',
  fim: 'Envilla Demiris assassinou o próprio marido enquanto ele dormia…',
};

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

/* `escritas` guarda o que foi para o banco; `linhas` é o que o mural devolve. */
function stub(linhas) {
  const escritas = [];
  const sel = () => {
    const b = {
      eq: () => b,
      order: () => b,
      select: () => b,
      single: async () => ({ data: linhas[0] || null, error: null }),
      then: (ok, falha) => Promise.resolve({ data: linhas, error: null }).then(ok, falha),
    };
    return b;
  };
  globalThis.supabaseClient = {
    from: () => ({
      select: sel,
      insert: (p) => { escritas.push({ op: 'insert', p }); return sel(); },
      update: (p) => { escritas.push({ op: 'update', p }); return sel(); },
      delete: () => { escritas.push({ op: 'delete' }); return sel(); },
    }),
  };
  return escritas;
}

let AventurasDaCidade, AVENTURA_CAMPOS, aventuraParaBanco;
beforeAll(() => {
  ({ AventurasDaCidade, AVENTURA_CAMPOS, aventuraParaBanco } = window);
  expect(AventurasDaCidade, 'AventurasDaCidade precisa estar no window').toBeTypeOf('function');
});

const montar = (props) => render(
  <div className="menestrel-ui">
    <AventurasDaCidade cidadeSlug="haafel" lang="pt" {...(props || {})} />
  </div>
);

describe('o anúncio no mural', () => {
  it('publica os campos do pedido, com o exemplo do usuário', async () => {
    stub([A_VIUVA]);
    montar();
    await waitFor(() => expect(document.querySelector('[data-aventura="1"]')).toBeTruthy());
    const txt = document.querySelector('[data-aventura="1"]').textContent;
    expect(txt).toContain('A Viúva');
    expect(txt).toContain('Estágio');
    expect(txt).toContain('5');
    expect(txt).toContain('Celsior Altana');
    expect(txt).toContain('2 moedas de ouro');
    expect(txt).toContain('15 pontos de experiência');
    expect(txt).toContain('Dizem as más línguas');
  });

  it('o FIM não chega ao jogador — nem fechado, nem no HTML', async () => {
    /* A trava que importa. Esconder com CSS deixaria o texto no DOM, onde
       qualquer um o lê; o jogador nem recebe o nó. */
    stub([A_VIUVA]);
    montar();                                  // sem podeEditar = jogador
    await waitFor(() => expect(document.querySelector('[data-aventura="1"]')).toBeTruthy());
    expect(document.body.textContent).not.toContain('Envilla Demiris');
    expect(document.body.innerHTML).not.toContain('Envilla');
    expect(document.querySelector('[data-fim="1"]')).toBeNull();
  });

  it('o Mestre tem o Fim, FECHADO, e abre quando quer', async () => {
    stub([A_VIUVA]);
    montar({ podeEditar: true });
    await waitFor(() => expect(document.querySelector('[data-fim="1"]')).toBeTruthy());
    // Fechado por padrão: spoiler se lê sem querer, até por cima do ombro.
    expect(document.body.textContent).not.toContain('Envilla Demiris');
    const btn = document.querySelector('[data-fim="1"]');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    act(() => { fireEvent.click(btn); });
    expect(document.body.textContent).toContain('Envilla Demiris');
  });

  it('o mural vazio diz coisas diferentes ao Mestre e ao jogador', async () => {
    stub([]);
    montar();
    await waitFor(() => expect(document.querySelector('.jornal-vazio')).toBeTruthy());
    expect(document.querySelector('.jornal-vazio').textContent).toMatch(/mural está vazio/i);
    cleanup();
    stub([]);
    montar({ podeEditar: true });
    await waitFor(() => expect(document.querySelector('.jornal-vazio')).toBeTruthy());
    expect(document.querySelector('.jornal-vazio').textContent).toMatch(/Nenhuma aventura anunciada/i);
  });

  it('só o Mestre vê anunciar, editar e excluir', async () => {
    stub([A_VIUVA]);
    montar();
    await waitFor(() => expect(document.querySelector('[data-aventura="1"]')).toBeTruthy());
    expect(document.querySelector('[data-nova-aventura]')).toBeNull();
    expect(document.querySelector('[data-editar="1"]')).toBeNull();
    expect(document.querySelector('[data-excluir="1"]')).toBeNull();
    cleanup();
    stub([A_VIUVA]);
    montar({ podeEditar: true });
    await waitFor(() => expect(document.querySelector('[data-nova-aventura]')).toBeTruthy());
    expect(document.querySelector('[data-editar="1"]')).toBeTruthy();
    expect(document.querySelector('[data-excluir="1"]')).toBeTruthy();
  });
});

describe('o formulário do Mestre', () => {
  it('tem os SETE campos do pedido, na ordem do pedido', () => {
    expect(AVENTURA_CAMPOS.map((c) => c.col)).toEqual([
      'nome', 'estagio', 'personagem', 'recompensa', 'experiencia', 'inicio', 'fim',
    ]);
    // O Fim é o único marcado como do Mestre.
    expect(AVENTURA_CAMPOS.filter((c) => c.soMestre).map((c) => c.col)).toEqual(['fim']);
  });

  it('abre em branco e grava a aventura nova', async () => {
    const escritas = stub([]);
    montar({ podeEditar: true });
    await waitFor(() => expect(document.querySelector('[data-nova-aventura]')).toBeTruthy());
    act(() => { fireEvent.click(document.querySelector('[data-nova-aventura]')); });

    // Os sete campos aparecem.
    AVENTURA_CAMPOS.forEach((c) => {
      expect(document.querySelector(`[data-campo-${c.col}]`), c.col).toBeTruthy();
    });
    // Salvar fica travado sem nome: uma aventura sem nome não é anúncio.
    expect(document.querySelector('[data-salvar-aventura]').disabled).toBe(true);

    act(() => {
      fireEvent.change(document.querySelector('[data-campo-nome]'), { target: { value: 'A Viúva' } });
    });
    expect(document.querySelector('[data-salvar-aventura]').disabled).toBe(false);
    act(() => { fireEvent.click(document.querySelector('[data-salvar-aventura]')); });
    await waitFor(() => expect(escritas.length).toBe(1));
    expect(escritas[0].op).toBe('insert');
    expect(escritas[0].p.nome).toBe('A Viúva');
    expect(escritas[0].p.cidade_slug).toBe('haafel');
  });

  it('editar um anúncio existente ATUALIZA, não insere outro', async () => {
    const escritas = stub([A_VIUVA]);
    montar({ podeEditar: true });
    await waitFor(() => expect(document.querySelector('[data-editar="1"]')).toBeTruthy());
    act(() => { fireEvent.click(document.querySelector('[data-editar="1"]')); });
    expect(document.querySelector('[data-campo-nome]').value).toBe('A Viúva');
    act(() => { fireEvent.click(document.querySelector('[data-salvar-aventura]')); });
    await waitFor(() => expect(escritas.length).toBe(1));
    expect(escritas[0].op).toBe('update');
  });
});

describe('o payload para o banco', () => {
  it('estagio vazio vira NULL, não zero nem string', () => {
    // '' num smallint é erro de tipo no Postgres: o anúncio não salvaria.
    expect(aventuraParaBanco({ nome: 'X', estagio: '' }).estagio).toBeNull();
    expect(aventuraParaBanco({ nome: 'X' }).estagio).toBeNull();
    expect(aventuraParaBanco({ nome: 'X', estagio: 'oito' }).estagio).toBeNull();
  });

  it('estagio entra como número, preso entre 1 e 40 (a tabela de estágios)', () => {
    expect(aventuraParaBanco({ nome: 'X', estagio: '5' }).estagio).toBe(5);
    expect(aventuraParaBanco({ nome: 'X', estagio: 0 }).estagio).toBe(1);
    expect(aventuraParaBanco({ nome: 'X', estagio: 99 }).estagio).toBe(40);
  });

  it('texto em branco vira NULL, e o que tem conteúdo vai aparado', () => {
    const p = aventuraParaBanco({ nome: '  A Viúva  ', personagem: '   ', recompensa: ' 2 ouro ' });
    expect(p.nome).toBe('A Viúva');
    expect(p.personagem).toBeNull();
    expect(p.recompensa).toBe('2 ouro');
  });
});
