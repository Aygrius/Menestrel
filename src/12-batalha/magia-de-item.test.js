/* ============================================================
   magia-de-item.test.js — o anel conjura
   ============================================================
   55 itens do catálogo carregam `magia` + `nivel_magia`: 22 armas, 19
   vestimentas, 6 pergaminhos e mais alguns. Até 12/09/2026 isso era um selo no
   inventário e nada mais — o Anel Narya dizia "Piromanipulação" e não
   conjurava coisa nenhuma. A verificação dos itens pedida pelo usuário foi o
   que revelou a categoria inteira parada.

   As regras decididas ao ligar, e que este arquivo trava:

     EM USO       equipado (arma, escudo) ou vestido (anel, capa). Anel no
                  fundo da mochila não empresta magia. Pergaminho é exceção:
                  não se veste, vale por estar na mão.
     KARMA ZERO   a magia está no ITEM. É o que separa um anel de aprender a
                  magia — e o mesmo tratamento que as criaturas já tinham.
     NÍVEL        do item, 1..9. Não escala com o PJ: quem escalou foi o
                  artífice.
     PERGAMINHO   some depois de lido, inclusive quando a magia falha.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Textos literais do banco.
const PIRO = { key: 'piromanipulacao', nome: 'Piromanipulação', duracao: 'Instantânea',
               evocacao: 'Instantânea', alcance: '20 metros',
               nivel_1: 'Causa 4 de dano elemental de fogo.',
               nivel_5: 'Causa 12 de dano elemental de fogo.' };
const BENCAO = { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                 evocacao: 'Instantânea', alcance: 'Toque',
                 nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };

const ANEL = { slug: 'anel_narya', nome: 'Anel Narya', grupo: 'Vestimentas', tipo: 'S',
               magia: 'Piromanipulação', nivel_magia: 5 };
const PERGAMINHO = { slug: 'pergaminho_bencao', nome: 'Pergaminho Bênção 1',
                     grupo: 'Consumíveis', tipo: 'S', magia: 'Bênção', nivel_magia: 1 };
const ESPADA = { slug: 'espada', nome: 'Espada', grupo: 'Armas', tipo: 'S' };

const catalogos = (itens, magias = {}) => ({
  pjById: { 7: { id: 7, magias, inventario: { itens } } },
  magiasByKey: { piromanipulacao: PIRO, bencao: BENCAO },
  catalogoBySlug: { anel_narya: ANEL, pergaminho_bencao: PERGAMINHO, espada: ESPADA },
});
const ATOR = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Mago' };

describe('quando o item concede a magia', () => {
  it('anel VESTIDO concede', () => {
    const r = M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'anel_narya', quantidade: 1, vestido: true }]));
    expect(r.map((x) => x.key)).toEqual(['piromanipulacao']);
  });

  it('anel GUARDADO não concede — é a regra que dá sentido a vestir', () => {
    const r = M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'anel_narya', quantidade: 1 }]));
    expect(r).toEqual([]);
  });

  it('arma EQUIPADA concede', () => {
    const cat = catalogos([{ slug: 'anel_narya', quantidade: 1, equipado: true }]);
    expect(M.magiasConhecidasDoAtor(ATOR, cat).map((x) => x.key)).toEqual(['piromanipulacao']);
  });

  it('pergaminho concede sem estar vestido — não se veste um papel', () => {
    const r = M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'pergaminho_bencao', quantidade: 1 }]));
    expect(r.map((x) => x.key)).toEqual(['bencao']);
  });

  it('item sem magia não concede nada', () => {
    expect(M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'espada', quantidade: 1, equipado: true }]))).toEqual([]);
  });

  it('quantidade zero não concede', () => {
    expect(M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'pergaminho_bencao', quantidade: 0 }]))).toEqual([]);
  });
});

describe('o que o item empresta', () => {
  const doAnel = () => M.magiasConhecidasDoAtor(ATOR,
    catalogos([{ slug: 'anel_narya', quantidade: 1, vestido: true }]))[0];

  it('karma ZERO — a magia está no item', () => {
    expect(doAnel().custo_karma).toBe(0);
  });

  it('o nível vem do ITEM, não do PJ', () => {
    expect(doAnel().nivel).toBe(5);
  });

  it('e o nível do item governa o dano', () => {
    // Nível 5 do anel lê nivel_5 (12), não nivel_1 (4).
    const m = doAnel();
    expect(window.efeitosNoNivel(m.magia, m.nivel).dano).toBe(12);
  });

  it('a magia viaja com a marca do item, para a tela poder dizer de onde vem', () => {
    expect(doAnel().item).toMatchObject({ slug: 'anel_narya', nome: 'Anel Narya', consumivel: false });
  });

  it('pergaminho é marcado como consumível', () => {
    const r = M.magiasConhecidasDoAtor(ATOR,
      catalogos([{ slug: 'pergaminho_bencao', quantidade: 1 }]))[0];
    expect(r.item.consumivel).toBe(true);
  });

  it('nível fora de 1..9 no banco é preso na faixa', () => {
    const cat = catalogos([{ slug: 'anel_narya', quantidade: 1, vestido: true }]);
    cat.catalogoBySlug.anel_narya = { ...ANEL, nivel_magia: 99 };
    expect(M.magiasConhecidasDoAtor(ATOR, cat)[0].nivel).toBe(9);
  });
});

describe('item e magia aprendida convivem', () => {
  it('magia que o PJ SABE ganha da do item — saber escala, item é fixo', () => {
    // 3 passos → nível 5. O anel também dá 5, mas a aprendida é que fica, e
    // ela cobra karma, que é a diferença que importa.
    const cat = catalogos([{ slug: 'anel_narya', quantidade: 1, vestido: true }],
                          { piromanipulacao: 3 });
    const r = M.magiasConhecidasDoAtor(ATOR, cat);
    expect(r).toHaveLength(1);
    expect(r[0].custo_karma).toBeGreaterThan(0);
    expect(r[0].item).toBeUndefined();
  });

  it('magia diferente soma às duas listas', () => {
    const cat = catalogos([{ slug: 'pergaminho_bencao', quantidade: 1 }],
                          { piromanipulacao: 3 });
    expect(M.magiasConhecidasDoAtor(ATOR, cat).map((x) => x.key).sort())
      .toEqual(['bencao', 'piromanipulacao']);
  });

  it('PJ sem magia nenhuma aprendida ainda recebe a do anel', () => {
    const cat = { pjById: { 7: { id: 7, inventario: { itens: [{ slug: 'anel_narya', quantidade: 1, vestido: true }] } } },
                  magiasByKey: { piromanipulacao: PIRO }, catalogoBySlug: { anel_narya: ANEL } };
    expect(M.magiasConhecidasDoAtor(ATOR, cat).map((x) => x.key)).toEqual(['piromanipulacao']);
  });

  it('dois itens com a MESMA magia não viram duas entradas iguais na lista', () => {
    const cat = catalogos([{ slug: 'anel_narya', quantidade: 2, vestido: true }]);
    expect(M.magiasConhecidasDoAtor(ATOR, cat)).toHaveLength(1);
  });
});

describe('a magia do item chega nas abas de ação', () => {
  it('ofensiva: o anel aparece na aba Magia', () => {
    const cat = catalogos([{ slug: 'anel_narya', quantidade: 1, vestido: true }]);
    const lista = M.magiasOfensivasDoAtor(ATOR, cat);
    expect(lista.map((x) => x.key)).toContain('piromanipulacao');
    expect(lista[0].item.nome).toBe('Anel Narya');
    expect(lista[0].custo_karma).toBe(0);
  });

  it('apoio: o pergaminho de Bênção aparece na aba Apoio', () => {
    const cat = catalogos([{ slug: 'pergaminho_bencao', quantidade: 1 }]);
    const lista = M.magiasDeApoioDoAtor(ATOR, cat);
    expect(lista.map((x) => x.key)).toContain('bencao');
    expect(lista[0].item.consumivel).toBe(true);
  });

  it('e o catálogo viaja inteiro, então o efeito é o mesmo de sempre', () => {
    const cat = catalogos([{ slug: 'pergaminho_bencao', quantidade: 1 }]);
    const m = M.magiasDeApoioDoAtor(ATOR, cat)[0];
    const alvo = { inst_id: 'a1', nome: 'Alvo', eh: 10, eh_max: 10, ef: 20, ef_max: 20,
                   status: 'ativo', status_temp: [] };
    const r = M.aplicarEfeitoApoio(alvo, m, 'pj:7');
    expect(r.status_temp.some((s) => s.efeito.tipo === 'mod_ataque')).toBe(true);
  });
});

describe('o consumo do pergaminho está ligado nos dois lados', () => {
  /* Teste de fonte: o consumo é fire-and-forget contra o Supabase, e o que
     importa travar é que os DOIS handlers (Mestre e Jogador) o chamam — e que
     a largada da canalização NÃO gasta o papel. */
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('apoio: Mestre e Jogador consomem', () => {
    const n = (fonte.match(/if \(passo\.fase !== 'iniciou'\) consumirItemDaMagia/g) || []).length;
    expect(n, 'Mestre e Jogador').toBe(2);
  });

  it('ataque: Mestre e Jogador consomem', () => {
    const n = (fonte.match(/if \(tipo === 'magia'\) consumirItemDaMagia/g) || []).length;
    expect(n, 'Mestre e Jogador').toBe(2);
  });

  it('só consome item marcado como consumível', () => {
    const i = fonte.indexOf('function consumirItemDaMagia');
    const corpo = fonte.slice(i, i + 700);
    expect(corpo).toMatch(/!item\.consumivel/);
  });
});
