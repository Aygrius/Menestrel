/* ============================================================
   mesa-ativa.test.js — entrar e sair de uma mesa é gesto do Mestre
   ============================================================
   "Assim como o jogador escolhe o personagem, e continua com ele enquanto não
    clicar no botão sair. Isso deve acontecer com o mestre para a escolha a
    história, ou seja, remova o dropdown de histórias e adicione um botão de
    sair." (usuário, 20/09/2026)

   O dropdown de mesas saiu da barra do topo. Em lugar dele, o Mestre entra
   numa mesa clicando no card dela e sai por um botão — exatamente como o
   Jogador ativa um PJ e volta pela porta "Sair".

   O que este arquivo guarda é a regra que quase matou o recurso: o console
   ESCOLHIA uma mesa sozinho (`minhasHistorias[0]`) sempre que `mesaAtivaId`
   não casava com a lista. Com o botão de sair, esse mesmo efeito reentrava na
   mesa no quadro seguinte ao clique — sair ficava impossível, e sem uma
   função pura o bug só apareceria montando o console inteiro.

   `proximaMesaAtiva` devolve o id novo, ou `undefined` quando não há nada a
   mudar. `undefined` e `null` são coisas DIFERENTES aqui: null é "saia da
   mesa", undefined é "não toque no estado".
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let proximaMesaAtiva;
beforeAll(() => {
  proximaMesaAtiva = globalThis.proximaMesaAtiva;
  expect(proximaMesaAtiva, 'proximaMesaAtiva precisa estar no window').toBeTypeOf('function');
});

const A = { id: 1, titulo: 'Abadom' };
const B = { id: 2, titulo: 'Verrogar' };

describe('o console não escolhe mesa por conta própria', () => {
  /* O CORAÇÃO DO RECURSO. Antes, isto devolvia o id da primeira história e o
     botão de sair não tinha efeito nenhum: o clique zerava e o efeito
     reentrava. */
  it('sem mesa ativa e com histórias na lista, não entra em nenhuma', () => {
    expect(proximaMesaAtiva([A, B], null)).toBeUndefined();
  });

  it('nem quando só existe uma história', () => {
    // Tentador auto-selecionar "já que não há escolha" — mas aí sair de uma
    // mesa única seria impossível.
    expect(proximaMesaAtiva([A], null)).toBeUndefined();
  });

  it('e não mexe numa mesa que já está ativa e válida', () => {
    expect(proximaMesaAtiva([A, B], 1)).toBeUndefined();
    expect(proximaMesaAtiva([A, B], 2)).toBeUndefined();
  });
});

describe('mas limpa o que não existe mais', () => {
  it('mesa excluída (ou de outro dono) sai de cena', () => {
    expect(proximaMesaAtiva([A, B], 99)).toBeNull();
  });

  it('lista vazia de verdade zera a mesa', () => {
    expect(proximaMesaAtiva([], 1)).toBeNull();
  });

  it('lista vazia e sem mesa ativa não tem o que mudar', () => {
    expect(proximaMesaAtiva([], null)).toBeUndefined();
  });
});

describe('carregando não é o mesmo que vazio', () => {
  /* `null` na lista significa "a busca ainda não voltou". Tratar isso como
     lista vazia apagava a mesa salva no localStorage a cada recarga da
     página — o Mestre voltava para a tela de escolha sem ter pedido. */
  it('lista ainda carregando preserva a mesa salva', () => {
    expect(proximaMesaAtiva(null, 1)).toBeUndefined();
    expect(proximaMesaAtiva(undefined, 1)).toBeUndefined();
  });
});
