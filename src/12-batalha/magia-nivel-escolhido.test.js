/* ============================================================
   magia-nivel-escolhido.test.js — o nível é do jogador
   ============================================================
   Decisão do usuário, 12/09/2026:

     "Dentro ou fora de batalha, o nível da magia é uma escolha do jogador. O
      nível da magia é também a quantidade de karma que a magia consome."

   Fora de combate a ficha já deixava escolher; em batalha, não — conjurava-se
   sempre no nível máximo comprado, e o karma saía desse mesmo número. Isso
   tirava do jogador a decisão mais interessante que a magia oferece: gastar
   menos para guardar karma.

   `magiaNoNivel` é o ÚNICO lugar que sabe quais campos dependem do nível — as
   listas a chamam para montar o item no máximo, e o painel a chama de novo
   quando o jogador escolhe outro. Sem isso haveria duas contas do mesmo
   número, que é o erro que esta sessão passou inteira corrigindo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Textos literais do banco.
const PIRO = { key: 'piromanipulacao', nome: 'Piromanipulação', duracao: 'Instantânea',
               evocacao: 'Instantânea', alcance: '20 metros',
               nivel_1: 'Causa 4 de dano elemental de fogo.',
               nivel_3: 'Causa 8 de dano elemental de fogo.',
               nivel_5: 'Causa 12 de dano elemental de fogo.' };
const BENCAO = { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                 evocacao: 'Instantânea', alcance: 'Toque',
                 nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.',
                 nivel_5: 'Aumenta 3 colunas de ataque e 15 de energia heroica.' };

describe('quais níveis o jogador pode escolher', () => {
  it('só os que ele comprou E que têm texto', () => {
    expect(M.niveisDisponiveis(PIRO, 5)).toEqual([1, 3, 5]);
    expect(M.niveisDisponiveis(PIRO, 3)).toEqual([1, 3]);
  });

  it('nível sem texto não entra — não há o que aplicar ali', () => {
    // Bênção tem 1 e 5 no banco, não tem 3.
    expect(M.niveisDisponiveis(BENCAO, 9)).toEqual([1, 5]);
  });

  it('a escada do sistema é 1/3/5/7/9 — não existe nível 2', () => {
    expect(M.niveisDisponiveis(PIRO, 9)).not.toContain(2);
  });
});

describe('o karma sai do NÍVEL ESCOLHIDO', () => {
  const base = () => M.magiasOfensivasDoAtor(
    { tipo: 'pj', ref_id: 7, inst_id: 'pj:7' },
    { pjById: { 7: { id: 7, magias: { piromanipulacao: 3 } } },   // 3 passos → nível 5
      magiasByKey: { piromanipulacao: PIRO }, catalogoBySlug: {} }
  )[0];

  it('no máximo, cobra o máximo', () => {
    expect(base()).toMatchObject({ nivel: 5, custo_karma: 5 });
  });

  it('escolhendo nível 1, cobra 1 — é a decisão que estava faltando', () => {
    expect(M.magiaNoNivel(base(), 1)).toMatchObject({ nivel: 1, custo_karma: 1 });
  });

  it('e o DANO desce junto: nível 1 causa 4, não 12', () => {
    expect(M.magiaNoNivel(base(), 1).dano).toBe(4);
    expect(M.magiaNoNivel(base(), 3).dano).toBe(8);
  });

  it('a descrição mostrada é a do nível escolhido', () => {
    expect(M.magiaNoNivel(base(), 1).descricao).toBe('Causa 4 de dano elemental de fogo.');
  });

  it('magia de ITEM continua sem custar karma em qualquer nível', () => {
    // A magia está no anel, não em quem o usa — decisão anterior, mantida.
    const doItem = { ...base(), item: { slug: 'anel', nome: 'Anel', consumivel: false } };
    expect(M.magiaNoNivel(doItem, 3).custo_karma).toBe(0);
  });

  it('escolher o nível que já está devolve o MESMO objeto', () => {
    const b = base();
    expect(M.magiaNoNivel(b, 5)).toBe(b);
  });

  it('nível nulo devolve o objeto intocado — null significa "o máximo"', () => {
    const b = base();
    expect(M.magiaNoNivel(b, null)).toBe(b);
  });
});

describe('na aba Apoio o nível mexe no que a magia faz', () => {
  const base = () => M.magiasDeApoioDoAtor(
    { tipo: 'pj', ref_id: 7, inst_id: 'pj:7' },
    { pjById: { 7: { id: 7, magias: { bencao: 3 } } },
      magiasByKey: { bencao: BENCAO }, catalogoBySlug: {} }
  )[0];

  it('o karma acompanha o nível', () => {
    expect(base().custo_karma).toBe(5);
    expect(M.magiaNoNivel(base(), 1).custo_karma).toBe(1);
  });

  it('e o efeito aplicado é o do nível escolhido', () => {
    const alvo = { inst_id: 'a1', nome: 'Alvo', eh: 10, eh_max: 10, ef: 20, ef_max: 20,
                   status: 'ativo', status_temp: [] };
    const n1 = M.aplicarEfeitoApoio(alvo, M.magiaNoNivel(base(), 1), 'pj:7');
    const col = (p) => p.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.valor;
    expect(col(n1)).toBe(1);
    const n5 = M.aplicarEfeitoApoio(alvo, M.magiaNoNivel(base(), 5), 'pj:7');
    expect(col(n5)).toBe(3);
  });
});

describe('o painel oferece a escolha nas duas abas', () => {
  /* Teste de fonte: o seletor vive dentro do componente, e sem ele a decisão
     do usuário não chega a lugar nenhum. */
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('as duas abas passam pelo recalculador', () => {
    expect(fonte).toMatch(/const magia = magiaNoNivel\(magiaBase, nivelMagiaSel\)/);
    expect(fonte).toMatch(/const apoioSel = magiaNoNivel\(apoioBase, nivelApoioSel\)/);
  });

  it('trocar de magia zera o nível escolhido — não vaza de uma para a outra', () => {
    expect((fonte.match(/setNivelMagiaSel\(null\)|setNivelApoioSel\(null\)/g) || []).length).toBe(2);
  });

  it('as duas listas publicam os níveis disponíveis', () => {
    expect((fonte.match(/niveis: niveisDisponiveis\(m, nivel\)/g) || []).length).toBe(2);
  });
});

describe('os ícones de visibilidade EXISTEM', () => {
  /* O usuário reportou o ícone da escuridão quebrado: `ti-cloud-moon` não
     existe no conjunto Tabler que o index.html carrega, e ícone inventado não
     avisa — ele simplesmente some. Os quatro abaixo foram conferidos contra o
     tabler-icons.min.css.

     Este teste não valida a fonte (não há como, offline); ele trava a LISTA
     num lugar só, para a próxima mudança não voltar a espalhar nomes soltos
     dentro de um ternário no JSX. */
  it('há um ícone para cada um dos quatro estados', () => {
    const I = M.VISIBILIDADE_ICONE;
    expect(Object.keys(I).sort()).toEqual(['clara', 'magica', 'parcial', 'total']);
    Object.values(I).forEach((v) => expect(v).toMatch(/^ti-[a-z-]+$/));
  });

  it('nenhum é o `ti-cloud-moon` que não existe', () => {
    expect(Object.values(M.VISIBILIDADE_ICONE)).not.toContain('ti-cloud-moon');
  });

  it('o botão cicla pelos quatro e volta ao começo', () => {
    expect(M.proximaVisibilidade('clara')).toBe('parcial');
    expect(M.proximaVisibilidade('parcial')).toBe('total');
    expect(M.proximaVisibilidade('total')).toBe('magica');
    expect(M.proximaVisibilidade('magica')).toBe('clara');
  });

  it('valor desconhecido cai no começo da escada', () => {
    expect(M.proximaVisibilidade('qualquer')).toBe('clara');
  });

  it('o tooltip diz o nome e o que custa', () => {
    const tb = { visib_total: 'Escuridão total', coluna: 'de coluna' };
    expect(M.textoVisibilidade('total', tb)).toBe('Escuridão total · -4 de coluna');
  });

  it('no claro não anuncia penalidade nenhuma', () => {
    expect(M.textoVisibilidade('clara', { visib_clara: 'Iluminado' })).toBe('Iluminado');
  });
});
