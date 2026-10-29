/* ============================================================
   fileiras-e-conteudo-da-loja.test.jsx — 29/10/2026
   ============================================================
   Dois pedidos do usuário, no mesmo dia:

   "A cada 10 slots de uma loja, eu tenho como abrir ou fechar a loja. Por
   exemplo, do item 1 ao item 10 eu posso abrir para os personagens comprar, e
   fechar do item 11 ao 60. Cada divisão dessa deve ter uma etiqueta informando
   se está aberta ou fechada para compra."

   "Torne possível vender itens na loja que tenham itens armazenados dentro
   deles, por exemplo uma algibeira sempre de moedas."

   O que este arquivo guarda, em três camadas:
     1. as regras puras (fileira de um índice, aberta por omissão, o preço do
        pacote somando o recheio);
     2. a TELA do Mestre — etiqueta por fileira, o clique que fecha, a casa que
        desbota, e o "Dentro" que grava o recheio na entrada;
     3. a SINCRONIA com o servidor: o cliente conta 10 por fileira e o SQL
        divide por 10 no mesmo lugar. Se um dos dois mudar sozinho, a loja passa
        a mostrar uma coisa e a vender outra — e isso não dá erro em lugar
        nenhum, só vende errado.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/lojas-cidade.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './historias.jsx';
import './estoque-mestre.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let View;
beforeAll(() => {
  View = window.EstoqueMestreView;
  expect(View, 'EstoqueMestreView precisa estar no window').toBeTypeOf('function');
  window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
});

const stubOriginal = globalThis.supabaseClient;
const fetchOriginal = globalThis.fetchCatalogoCompleto;
afterEach(() => {
  cleanup();
  globalThis.supabaseClient = stubOriginal;
  globalThis.fetchCatalogoCompleto = fetchOriginal;
  window.fetchCatalogoCompleto = fetchOriginal;
});

const ALGIBEIRA = {
  id: 'alg', slug: 'algibeira', nome: 'Algibeira', grupo: 'Vestimentas',
  tipo: 'S', tipo_item: 'Moedas', armazena: 2, ocupa: 0.2, valor_latao: 50,
};
const OURO = { id: 'ou', slug: 'moeda_ouro', nome: 'Moeda de Ouro', grupo: 'Moedas', tipo: 'S', ocupa: 0.01, valor_latao: 1000 };
const ESPADA = { id: 'es', slug: 'espada', nome: 'Espada', grupo: 'Armas', tipo: 'S', ocupa: 2, valor_latao: 400 };
const CATALOGO = [ALGIBEIRA, OURO, ESPADA];
const catBySlug = { algibeira: ALGIBEIRA, moeda_ouro: OURO, espada: ESPADA };

// 12 entradas: fileira 0 cheia (10) e fileira 1 com duas.
const doze = Array.from({ length: 12 }, (_, i) => ({
  entryId: 'e' + i, slug: 'espada', estoque: null, preco_latao_override: null,
}));

function montar(comercio) {
  const estoque_loja = { comercios: [{ id: 'c1', nome: 'Crássia', lugar: 'Crássia', ativo: true, itens: [], ...comercio }], editando_em: null };
  const tabelas = {
    __authUserId: 'u1',
    historias: [{ id: 13, mestre_id: 'u1', estoque_loja }],
    cidades: [], anuncios_loja: [], __updates: [],
  };
  globalThis.supabaseClient = fakeSupabase(tabelas);
  const cat = async () => ({ data: CATALOGO, error: null });
  globalThis.fetchCatalogoCompleto = cat;
  window.fetchCatalogoCompleto = cat;
  const historia = { id: 13, titulo: 'As Marcas do Passado', mestre_id: 'u1', lugares: ['Crássia'], estoque_loja };
  const r = render(<View historia={historia} lang="pt" onChanged={() => {}} />);
  return { ...r, tabelas };
}

const etiquetas = () => [...document.querySelectorAll('.estoque-lingueta')];
const porRotulo = (re) => etiquetas().find((b) => re.test(b.getAttribute('aria-label') || ''));
const itensGravados = (t) => t.historias[0].estoque_loja.comercios[0].itens;

describe('as regras puras da fileira', () => {
  const { estFileiraDoIndice, estFileiraAberta, estComFileira, EST_POR_FILEIRA } = window;

  it('dez por fileira: o item 10 é a fileira 0, o 11 abre a fileira 1', () => {
    expect(EST_POR_FILEIRA).toBe(10);
    expect(estFileiraDoIndice(0)).toBe(0);    // item 1
    expect(estFileiraDoIndice(9)).toBe(0);    // item 10
    expect(estFileiraDoIndice(10)).toBe(1);   // item 11
    expect(estFileiraDoIndice(59)).toBe(5);   // item 60
  });

  /* Aberta por omissão é o que mantém TODA loja existente vendendo como antes:
     o script SQL não precisa escrever `fileiras` em ninguém. */
  it('sem `fileiras`, toda fileira está aberta; só `false` fecha', () => {
    expect(estFileiraAberta({}, 0)).toBe(true);
    expect(estFileiraAberta({ fileiras: [] }, 3)).toBe(true);
    expect(estFileiraAberta({ fileiras: [true, false] }, 1)).toBe(false);
    expect(estFileiraAberta({ fileiras: [true, false] }, 0)).toBe(true);
  });

  it('fechar a fileira 2 preenche as anteriores como abertas', () => {
    expect(estComFileira({ id: 'c' }, 2, false).fileiras).toEqual([true, true, false]);
    expect(estComFileira({ fileiras: [false] }, 0, true).fileiras).toEqual([true]);
  });
});

/* ── A CASA DO ITEM (29/10/2026) ─────────────────────────────────────────────
   "Eu preciso ter permissão para mudar o item de casa na loja, para dizer em
   qual linha ele está." A casa virou propriedade do item, e a fileira sai dela.
   Mover TROCA, de propósito: inserir-e-empurrar mudaria de fileira todos os
   itens seguintes — e fileira é o que está ou não à venda. */
describe('a casa do item e a mudança de casa', () => {
  const { estCasaDoItem, estComCasas, estMoverCasa, estFileiraDoIndice } = window;

  it('item sem casa vale a posição — é o que o servidor assume também', () => {
    expect(estCasaDoItem({ entryId: 'a' }, 7)).toBe(7);
    expect(estCasaDoItem({ entryId: 'a', casa: 23 }, 7)).toBe(23);
  });

  it('a gravação carimba a casa de quem não tem, sem pisar nas ocupadas', () => {
    const c = estComCasas({ itens: [{ entryId: 'a', casa: 1 }, { entryId: 'b' }, { entryId: 'c' }] });
    expect(c.itens.map((i) => i.casa)).toEqual([1, 0, 2]);
    // Já normalizado, devolve o mesmo objeto: nada de gravação à toa.
    expect(estComCasas(c)).toBe(c);
  });

  it('mover para casa vazia leva só aquele item', () => {
    const c = estMoverCasa({ itens: [{ entryId: 'a', casa: 0 }, { entryId: 'b', casa: 1 }] }, 'a', 15);
    expect(c.itens.find((i) => i.entryId === 'a').casa).toBe(15);
    expect(c.itens.find((i) => i.entryId === 'b').casa).toBe(1);
    expect(estFileiraDoIndice(15)).toBe(1);   // mudou de fileira, que é o objetivo
  });

  it('mover para casa ocupada TROCA os dois, e não empurra mais ninguém', () => {
    const antes = { itens: [{ entryId: 'a', casa: 0 }, { entryId: 'b', casa: 12 }, { entryId: 'c', casa: 30 }] };
    const c = estMoverCasa(antes, 'a', 12);
    expect(c.itens.map((i) => [i.entryId, i.casa])).toEqual([['a', 12], ['b', 0], ['c', 30]]);
  });
});

describe('o preço do pacote (recipiente + recheio)', () => {
  const { precoDaEntrada, valorDoConteudo, conteudoDaEntrada, ocupaDoConteudo } = window;

  it('soma o que vai dentro: algibeira de 50 com 20 de ouro custa 20.050', () => {
    const entrada = { slug: 'algibeira', conteudo: [{ slug: 'moeda_ouro', quantidade: 20 }] };
    expect(valorDoConteudo(entrada, catBySlug)).toBe(20000);
    expect(precoDaEntrada(entrada, ALGIBEIRA, catBySlug)).toBe(20050);
  });

  /* A trava que importa: sem a soma, essa algibeira sairia por 50 latão e
     devolveria 20.000 em moeda — uma máquina de dinheiro. */
  it('o override do Mestre vence a soma, inclusive para dar de graça', () => {
    const entrada = { slug: 'algibeira', conteudo: [{ slug: 'moeda_ouro', quantidade: 20 }], preco_latao_override: 60 };
    expect(precoDaEntrada(entrada, ALGIBEIRA, catBySlug)).toBe(60);
    expect(precoDaEntrada({ ...entrada, preco_latao_override: 0 }, ALGIBEIRA, catBySlug)).toBe(0);
  });

  it('entrada sem recheio é o valor de tabela, como sempre foi', () => {
    expect(precoDaEntrada({ slug: 'espada' }, ESPADA, catBySlug)).toBe(400);
    expect(conteudoDaEntrada({ slug: 'espada' })).toEqual([]);
    expect(ocupaDoConteudo({ conteudo: [{ slug: 'moeda_ouro', quantidade: 20 }] }, catBySlug)).toBeCloseTo(0.2, 5);
  });

  it('quantidade suja não contamina a conta: mínimo 1, inteiro', () => {
    expect(conteudoDaEntrada({ conteudo: [{ slug: 'moeda_ouro', quantidade: 0 }] })).toEqual([{ slug: 'moeda_ouro', quantidade: 1 }]);
    expect(conteudoDaEntrada({ conteudo: [{ slug: 'moeda_ouro', quantidade: 2.7 }] })).toEqual([{ slug: 'moeda_ouro', quantidade: 2 }]);
    expect(conteudoDaEntrada({ conteudo: [{ quantidade: 3 }] })).toEqual([]);
  });
});

describe('a língueta de cada fileira, na tela do Mestre', () => {
  /* "Um ícone em formato de língueta, do lado esquerdo e fora da loja,
     apontado para a fileira" (29/10/2026): o estado é a forma do cadeado e a
     cor; a frase inteira — faixa de itens, estado e ação — vive no rótulo
     acessível, que é o que um leitor de tela e o title entregam. */
  it('uma língueta por fileira COM item, fora da grade, dizendo faixa e estado', async () => {
    montar({ itens: doze });
    await waitFor(() => expect(etiquetas().length).toBe(2));
    expect(porRotulo(/Itens 1–10: aberta para compra/)).toBeTruthy();
    expect(porRotulo(/Itens 11–20: aberta para compra/)).toBeTruthy();
    // Fora da loja: a língueta não é casa da grade, e vem ANTES dela.
    expect(document.querySelector('.inv-bag-grid .estoque-lingueta')).toBeFalsy();
    const col = document.querySelector('.estoque-linguetas');
    expect(col.nextElementSibling.classList.contains('inv-grid-wrap')).toBe(true);
    // As fileiras vazias guardam a vaga, senão a língueta aponta para a fileira errada.
    expect(document.querySelectorAll('.estoque-lingueta-vaga').length).toBe(4);
    expect(etiquetas()[0].querySelector('.ti-lock-open')).toBeTruthy();
  });

  it('clicar fecha só aquela fileira, e é isso que vai para o banco', async () => {
    const { tabelas } = montar({ itens: doze });
    await waitFor(() => expect(porRotulo(/Itens 11–20/)).toBeTruthy());
    fireEvent.click(porRotulo(/Itens 11–20/));

    await waitFor(() => {
      expect(tabelas.historias[0].estoque_loja.comercios[0].fileiras).toEqual([true, false]);
    });
    await waitFor(() => expect(porRotulo(/Itens 11–20: fechada para compra/)).toBeTruthy());
    expect(porRotulo(/Itens 11–20/).querySelector('.ti-lock')).toBeTruthy();
    expect(porRotulo(/Itens 1–10: aberta para compra/)).toBeTruthy();
  });

  /* A casa desbota junto: quem vê a grade precisa saber qual peça está fora de
     venda sem conferir a etiqueta linha por linha. */
  it('a casa da fileira fechada é marcada na grade', async () => {
    montar({ itens: doze, fileiras: [true, false] });
    await waitFor(() => expect(document.querySelectorAll('.estoque-casa--fechada').length).toBe(2));
    expect(document.querySelectorAll('.loja-casa').length).toBe(12);
  });

  /* A busca reordena a grade: a 3ª casa deixa de ser o 3º item, e uma etiqueta
     sobre a grade reordenada mentiria sobre quem ela cobre. */
  it('com busca, as etiquetas saem de cena', async () => {
    montar({ itens: doze });
    await waitFor(() => expect(etiquetas().length).toBe(2));
    const busca = document.querySelector('.estoque-trilho input');
    fireEvent.change(busca, { target: { value: 'espada' } });
    await waitFor(() => expect(etiquetas().length).toBe(0));
  });
});

describe('mudar o item de casa, na tela do Mestre', () => {
  const botaoPorRotulo = (re) => [...document.querySelectorAll('button')]
    .find((b) => re.test(b.getAttribute('aria-label') || '') || re.test(b.textContent || ''));

  it('escolher o item, pôr na mão e soltar numa casa da fileira 2', async () => {
    const { tabelas } = montar({ itens: doze });
    const casa = await waitFor(() => {
      const b = [...document.querySelectorAll('.loja-casa')][0];
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(casa);                                   // escolhe o item 1
    const mover = await waitFor(() => {
      const b = botaoPorRotulo(/Mudar de casa/);
      expect(b).toBeTruthy(); return b;
    });
    expect(mover.textContent).toMatch(/fileira 1/);          // onde ele está hoje
    fireEvent.click(mover);

    // Com o item na mão, a casa vazia vira destino e diz a fileira que é.
    const destino = await waitFor(() => {
      const b = botaoPorRotulo(/Mover para cá \(casa 15, fileira 2\)/);
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(destino);

    await waitFor(() => {
      const gravados = itensGravados(tabelas);
      expect(gravados[0].casa).toBe(14);                     // casa 15 na tela = índice 14
      // Os outros ficam onde estavam: a troca não empurra a fila.
      expect(gravados[1].casa).toBe(1);
      expect(gravados[11].casa).toBe(11);
    });
  });
});

describe('o "Dentro" da entrada, na tela do Mestre', () => {
  const entradaAlgibeira = [{ entryId: 'a1', slug: 'algibeira', estoque: 1, preco_latao_override: null }];

  it('só recipiente tem "Dentro" — a espada não', async () => {
    montar({ itens: [{ entryId: 's1', slug: 'espada', estoque: 1, preco_latao_override: null }] });
    const casa = await waitFor(() => {
      const b = [...document.querySelectorAll('.loja-casa')][0];
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(casa);
    await waitFor(() => expect(document.querySelector('.estoque-dentro-tit')).toBeFalsy());
    expect(document.querySelector('.estoque-painel-corpo')).toBeTruthy();
  });

  it('a algibeira abre o "Dentro", e pôr moeda grava o recheio na entrada', async () => {
    const { tabelas } = montar({ itens: entradaAlgibeira });
    const casa = await waitFor(() => {
      const b = [...document.querySelectorAll('.loja-casa')][0];
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(casa);
    await waitFor(() => expect(document.querySelector('.estoque-dentro')).toBeTruthy());
    expect(document.querySelector('.estoque-dentro-nada').textContent).toMatch(/Nada dentro ainda/);

    const campo = document.querySelector('.estoque-dentro .estoque-campo');
    fireEvent.change(campo, { target: { value: 'moeda' } });
    const achado = await waitFor(() => {
      const b = document.querySelector('.estoque-dentro-achados button');
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(achado);

    await waitFor(() => {
      expect(itensGravados(tabelas)[0].conteudo).toEqual([{ slug: 'moeda_ouro', quantidade: 1 }]);
    });
  });

  /* O recipiente diz o que aceita: `tipo_item: 'Moedas'` na algibeira é a mesma
     trava de podeMoverParaContainer, e a espada não entra numa bolsa de moedas
     nem no inventário. */
  it('a busca do "Dentro" não oferece o que o recipiente não aceita', async () => {
    montar({ itens: entradaAlgibeira });
    const casa = await waitFor(() => {
      const b = [...document.querySelectorAll('.loja-casa')][0];
      expect(b).toBeTruthy(); return b;
    });
    fireEvent.click(casa);
    const campo = await waitFor(() => {
      const c = document.querySelector('.estoque-dentro .estoque-campo');
      expect(c).toBeTruthy(); return c;
    });
    fireEvent.change(campo, { target: { value: 'espada' } });
    await waitFor(() => {
      expect(document.querySelector('.estoque-dentro-achados')).toBeFalsy();
      expect(document.querySelector('.estoque-dentro-sem-achado').textContent).toMatch(/Nada encontrado que caiba/);
    });
  });
});

/* ── O CLIENTE E O SERVIDOR CONTAM O MESMO (29/10/2026) ──────────────────────
   A etiqueta é desenho; a trava é SQL. Se a tela passar a agrupar de 12 e o
   estoque_loja_flat continuar dividindo por 10, a loja mostra uma fileira
   fechada e vende o item mesmo assim — sem erro em lugar nenhum. O repositório
   é core.autocrlf=true, daí o \r?\n nas regex (CLAUDE.md). */
describe('a sincronia com o SQL', () => {
  const sql = readFileSync('scripts/sql/fileiras-e-conteudo-da-loja-2026-10-29.sql', 'utf8');

  it('o estoque_loja_flat esconde a fileira fechada, com o mesmo 10 do cliente', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.estoque_loja_flat/);
    expect(sql).toMatch(/IS DISTINCT FROM 'false'/);
    expect(window.EST_POR_FILEIRA).toBe(10);
  });

  /* A casa do item é o endereço nos DOIS lados: o cliente lê `casa` e cai na
     posição quando ela falta (estCasaDoItem), o SQL faz o mesmo COALESCE. */
  it('a fileira do servidor sai da `casa`, com a posição como reserva', () => {
    expect(sql).toMatch(/COALESCE\(NULLIF\(it\.item ->> 'casa', ''\)::int, \(it\.ord - 1\)::int\) \/ 10/);
    expect(window.estCasaDoItem({ casa: 23 }, 7)).toBe(23);
    expect(window.estCasaDoItem({}, 7)).toBe(7);
  });

  it('o comprar_item soma o recheio no preço e o entrega dentro da instância', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.comprar_item/);
    // O preço sugerido = valor do item + valor do recheio (espelho de precoDaEntrada).
    expect(sql).toMatch(/COALESCE\(v_cat\.valor_latao, 0\) \+ v_conteudo_valor/);
    // O recheio entra apontando para a instância recém-criada do recipiente.
    expect(sql).toMatch(/'containerId',\s*v_inst_id/);
    // E não cabe mais do que o recipiente armazena.
    expect(sql).toMatch(/conteudo_nao_cabe/);
  });
});
