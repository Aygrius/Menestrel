/* ============================================================
   arte-de-item-por-tipo.test.jsx — uma pintura por TIPO de item
   ============================================================
   Pedido do usuário em 26/10/2026: "Vamos criar as próximas 20 imagens do
   Figma, uma imagem apenas para livro."

   É a mesma regra dos equipáveis levada ao resto do catálogo. Antes a arte de
   item era por SLUG — uma imagem por entrada — e isso não escala: só de
   "Livro de …" e "Manual do …" são quase 160 entradas, todas do mesmo objeto.
   Agora o NOME do item escolhe o tipo, e o tipo tem uma pintura.

   O que este arquivo protege:
     • a tabela é ORDENADA e a ordem importa (a Pérola Fantasma é um navio,
       não uma pérola);
     • item COM região não entra aqui — um "Anel Dourado" não pode cair na
       pintura de minério;
     • todo destino da tabela existe no disco.

   Os nomes são os do catálogo de verdade, conferidos no banco.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

beforeAll(async () => {
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../01-core/inventario-helpers.jsx');
  await import('../01-core/select-pill.jsx');
  await import('../01-core/clima-desgaste.jsx');
  await import('../01-core/game-data.jsx');
  await import('../01-core/forma-raca.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('../01-core/magias-efeito.jsx');
  await import('../01-core/status-efeito.jsx');
  await import('../01-core/efeito-temporario.jsx');
  await import('../01-core/fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('../10-shell/shell.jsx');
  await import('../07-inventario/inventario.jsx');
  await import('./atalhos-ficha.jsx');
  await import('./ficha.jsx');
});

// Item do catálogo SEM região: é por aí que a pintura de tipo entra.
const arte = (nome, extra = {}) => window.arteDoItem({ nome, slot_equip: null, ...extra });

describe('a obra: uma pintura para as ~160 do catálogo', () => {
  it.each([
    'Livro de Maira', 'Livro de Idiomas Khuzdul', 'Livro do Titã Fogo',
    'Livro da Ordem dos Oráculos', 'Manual do Mago', 'Manual da Guilda de Ladrões',
  ])('%s usa a pintura de livro', (nome) => {
    expect(arte(nome)).toBe('/itens/livro.webp');
  });
});

describe('os outros tipos', () => {
  it.each([
    ['Equipamento de Ferreiro', '/itens/equipamento.webp'],
    ['Equipamentos de Estudo', '/itens/equipamento.webp'],
    ['Elixir de Unicórnio', '/itens/elixir.webp'],
    ['Rubi', '/itens/gema.webp'],
    ['Água Marinha', '/itens/gema.webp'],
    ['Pedra Vidente', '/itens/gema.webp'],
    ['Ferro', '/itens/minerio.webp'],
    ['Aço', '/itens/minerio.webp'],
    ['Pedra', '/itens/minerio.webp'],
    ['Baú Grande', '/itens/bau.webp'],
    ['Arca', '/itens/bau.webp'],
    ['Tonel', '/itens/barril.webp'],
    ['Urna', '/itens/jarra.webp'],
    ['Mochila', '/itens/mochila.webp'],
    ['Saco', '/itens/saco.webp'],
    ['Quadro Rainha Tória', '/itens/quadro.webp'],
    ['Busto de Sivon', '/itens/estatua.webp'],
    ['Estátua de Maira', '/itens/estatua.webp'],
    ['Castelo', '/itens/casa.webp'],
    ['Taverna', '/itens/casa.webp'],
    ['Caravela', '/itens/barco.webp'],
    ['Carruagem Composta', '/itens/carroca.webp'],
    ['Carro de Boi', '/itens/carroca.webp'],
    ['Sela de Guerra', '/itens/sela.webp'],
    ['Cabeçada e Rédeas', '/itens/arreio.webp'],
    ['Cavalo Ludgrimiano de Guerra', '/itens/cavalo.webp'],
    ['Cavalo Puro-Sangue Élfico', '/itens/cavalo.webp'],
    ['Virote Envenenado (Peçonha)', '/itens/virote.webp'],
    ['Dardo Envenenado (Toxina)', '/itens/dardo.webp'],
  ])('%s → %s', (nome, caminho) => {
    expect(arte(nome)).toBe(caminho);
  });
});

describe('a tabela é ordenada, e a ordem resolve ambiguidade', () => {
  it('a Pérola Fantasma é um navio, não uma pérola', () => {
    expect(arte('Pérola Fantasma')).toBe('/itens/barco.webp');
    expect(arte('Pérola Negra')).toBe('/itens/gema.webp');
  });
  it('a Moeda de Ouro não vira minério', () => {
    expect(arte('Moeda de Ouro de Alfiates')).toBe('/itens/moeda_ouro.webp');
    expect(arte('Moeda Antiga de Prata')).toBe('/itens/moeda_prata.webp');
    expect(arte('Ouro')).toBe('/itens/minerio.webp');
  });
});

describe('a variante empresta a pintura que já existe', () => {
  it.each([
    ['Pergaminho Bola de Fogo', '/itens/pergaminho.webp'],
    ['Frasco Incendiário', '/itens/frasco.webp'],
    ['Flecha Envenenada (Pandemônio)', '/itens/flecha.webp'],
    ['Banquete Exótico', '/itens/racao.webp'],
    ['Vinho Élfico', '/itens/hidromel.webp'],
    ['Caramanhola', '/itens/cantil.webp'],
  ])('%s → %s', (nome, caminho) => {
    expect(arte(nome)).toBe(caminho);
  });
});

/* ── A COLHEITA (28/10/2026) ──────────────────────────────────────────────
   "Todas as ervas devem ter a mesma imagem, todos os cogumelos devem ter a
   mesma imagem." (usuário)

   Antes disto eram duas pinturas por SLUG, `erva_rubashi` e `cogumelo_aria`:
   das três ervas e dos três cogumelos do catálogo, só um de cada tinha
   imagem — os outros quatro ficavam no glifo. Os arquivos viraram
   `erva.webp` e `cogumelo.webp`, e a tabela de tipos leva o nome inteiro a
   eles, como já fazia com Livro e Manual. */
describe('a colheita: uma pintura por tipo', () => {
  it.each(['Erva Amalil', 'Erva Azpha', 'Erva Rubashi'])('%s usa a pintura de erva', (nome) => {
    expect(arte(nome)).toBe('/itens/erva.webp');
  });
  it.each(['Cogumelo Aria', 'Cogumelo Lumenia', 'Cogumelo Rubus'])('%s usa a pintura de cogumelo', (nome) => {
    expect(arte(nome)).toBe('/itens/cogumelo.webp');
  });
  /* As pinturas por slug saíram: quem as citasse voltaria a ter uma imagem
     por item, que é o que o pedido desfez. */
  it('nenhuma pintura de erva ou cogumelo sobrou amarrada a um slug', () => {
    const presos = [...window.ARTE_ITEM_SLUG].filter((x) => /^(erva|cogumelo)_/.test(x));
    expect(presos).toEqual([]);
  });
  /* Flor e Planta ainda não têm pintura — o pedido falou de erva e cogumelo.
     O teste segura o estado de hoje: se alguém pintar uma delas, vem aqui
     dizer qual é a regra. */
  it('flor e planta seguem no glifo', () => {
    expect(arte('Flor Vinna')).toBe(null);
    expect(arte('Planta Nex')).toBe(null);
  });
});

describe('a regra não invade o equipável', () => {
  it('"Anel Dourado" é joia de dedo, não minério', () => {
    expect(window.arteDoItem({ nome: 'Anel Dourado', slot_equip: 'dedo', tipo_equip: 'adorno' }))
      .toBe('/equip/anel-nobre.webp');
  });
  it('"Coroa de Ouro" é coroa, não minério', () => {
    expect(window.arteDoItem({ nome: 'Coroa de Ouro', slot_equip: 'cabeca', tipo_equip: 'adorno' }))
      .toBe('/equip/coroa-ouro.webp');
  });
  it('o nome fora de qualquer tipo continua sem pintura', () => {
    expect(arte('Gaiola')).toBe(null);
    expect(arte('Corda')).toBe(null);
  });
});

describe('as pinturas declaradas estão no disco', () => {
  it('toda pintura declarada em ARTE_ITEM_NOVA existe', () => {
    const faltando = [...window.ARTE_ITEM_NOVA]
      .filter((n) => !existsSync(resolve(raiz, 'public/itens', n + '.webp')));
    expect(faltando).toEqual([]);
  });

  /* Eram "as 20" até 27/10/2026, quando o arreamento acrescentou oito. O
     registro é uma lista viva — contar o total só sabe quebrar a cada
     encomenda nova. O que importa é que AS 20 DESTA ENCOMENDA continuem lá:
     é esta tabela que a página Imagens e arteDoItemPorTipo consultam. */
  it('as 20 pinturas de TIPO de 26/10/2026 continuam registradas', () => {
    const asVinte = [
      'livro', 'equipamento', 'gema', 'minerio', 'elixir', 'bau', 'barril', 'mochila',
      'saco', 'jarra', 'quadro', 'estatua', 'carroca', 'barco', 'sela', 'arreio',
      'casa', 'virote', 'dardo', 'cavalo',
    ];
    expect(asVinte).toHaveLength(20);
    const fora = asVinte.filter((n) => !window.ARTE_ITEM_NOVA.has(n));
    expect(fora).toEqual([]);
  });
});
