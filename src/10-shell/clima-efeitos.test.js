/* ============================================================
   clima-efeitos.test.js — o clima da mesa pinta o fundo do console
   ============================================================
   "Água: efeito de chuva mais forte em tempestade, e efeito de areia mais
    forte em desértico. Vento: efeito de vento mais forte em tornado, e ir
    diminuindo. Temperatura: efeito de insolação mais forte em calor extremo,
    e efeito de neve mais forte em frio extremo." (usuário, 20/09/2026)

   As três trilhas já existiam na barra do topo (TEMPO_TRILHAS, cinco degraus
   cada, gravadas em historias.data_jogo_atual.tempo). O que é novo é o fundo
   reagir a elas.

   Duas das três trilhas são EIXOS, não escadas: água vai de deserto a
   tempestade passando por um meio seco-nem-molhado, e temperatura vai de
   frio extremo a calor extremo passando por agradável. Nesses dois, o degrau
   do meio não emite efeito nenhum — e os degraus de cada lado emitem efeitos
   DIFERENTES, não o mesmo efeito com sinal trocado. Vento é a única escada de
   verdade: um só efeito, do nada ao tornado.

   `efeitosDoTempo` é pura e recebe o jsonb inteiro (não só `.tempo`) porque é
   assim que ela é chamada no console — e porque mesa sem clima definido, que
   é a maioria, não pode quebrar.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let efeitosDoTempo;
beforeAll(() => {
  efeitosDoTempo = globalThis.efeitosDoTempo;
  expect(efeitosDoTempo, 'efeitosDoTempo precisa estar no window').toBeTypeOf('function');
});

// Açúcar: o efeito de um tipo, ou undefined se ele não está na tela.
const efeito = (tempo, tipo) => efeitosDoTempo({ tempo }).find((e) => e.tipo === tipo);
const intensidade = (tempo, tipo) => efeito(tempo, tipo)?.intensidade;

describe('Água — chuva de um lado, areia do outro', () => {
  it('tempestade chove mais forte que chuva fina', () => {
    expect(intensidade({ agua: 'tempestade' }, 'chuva'))
      .toBeGreaterThan(intensidade({ agua: 'chuva_fina' }, 'chuva'));
  });

  it('desértico levanta mais areia que árido', () => {
    expect(intensidade({ agua: 'desertico' }, 'areia'))
      .toBeGreaterThan(intensidade({ agua: 'arido' }, 'areia'));
  });

  it('fresco é o meio: nem chuva nem areia', () => {
    expect(efeitosDoTempo({ tempo: { agua: 'fresco' } })).toEqual([]);
  });

  /* O erro fácil aqui é tratar a trilha como uma escada só e deixar a chuva
     "negativa" virar areia no mesmo elemento — dois efeitos diferentes não
     podem dividir a mesma camada. */
  it('chuva e areia nunca aparecem juntas', () => {
    expect(efeito({ agua: 'tempestade' }, 'areia')).toBeUndefined();
    expect(efeito({ agua: 'desertico' }, 'chuva')).toBeUndefined();
  });
});

describe('Vento — uma escada só, do nada ao tornado', () => {
  it('sobe degrau a degrau até o tornado', () => {
    const niveis = ['leves', 'ventania', 'vendaval', 'tornado']
      .map((v) => intensidade({ vento: v }, 'vento'));
    expect(niveis).toEqual([...niveis].sort((a, b) => a - b));
    expect(new Set(niveis).size).toBe(4); // nenhum degrau repete o anterior
  });

  it('o tornado é o mais forte de todos', () => {
    expect(intensidade({ vento: 'tornado' }, 'vento'))
      .toBeGreaterThan(intensidade({ vento: 'vendaval' }, 'vento'));
  });

  it('sem vento não desenha nada', () => {
    expect(efeitosDoTempo({ tempo: { vento: 'sem_vento' } })).toEqual([]);
  });
});

describe('Temperatura — insolação de um lado, neve do outro', () => {
  it('calor extremo insola mais que calor leve', () => {
    expect(intensidade({ temperatura: 'calor_extremo' }, 'insolacao'))
      .toBeGreaterThan(intensidade({ temperatura: 'calor_leve' }, 'insolacao'));
  });

  it('frio extremo neva mais que frio leve', () => {
    expect(intensidade({ temperatura: 'frio_extremo' }, 'neve'))
      .toBeGreaterThan(intensidade({ temperatura: 'frio_leve' }, 'neve'));
  });

  it('agradável é o meio: nem neve nem insolação', () => {
    expect(efeitosDoTempo({ tempo: { temperatura: 'agradavel' } })).toEqual([]);
  });

  it('neve e insolação nunca aparecem juntas', () => {
    expect(efeito({ temperatura: 'frio_extremo' }, 'insolacao')).toBeUndefined();
    expect(efeito({ temperatura: 'calor_extremo' }, 'neve')).toBeUndefined();
  });
});

describe('as três trilhas convivem', () => {
  it('um temporal gelado e ventando mostra os três efeitos', () => {
    const efeitos = efeitosDoTempo({
      tempo: { agua: 'tempestade', vento: 'tornado', temperatura: 'frio_extremo' },
    });
    expect(efeitos.map((e) => e.tipo).sort()).toEqual(['chuva', 'neve', 'vento']);
  });

  it('e uma mesa em dia ameno não mostra nenhum', () => {
    expect(efeitosDoTempo({
      tempo: { agua: 'fresco', vento: 'sem_vento', temperatura: 'agradavel' },
    })).toEqual([]);
  });
});

describe('mesa sem clima definido', () => {
  /* Os padrões de TEMPO_TRILHAS (fresco, sem_vento, agradável) são justamente
     os três degraus neutros — uma mesa que nunca tocou no clima tem que abrir
     com a tela limpa, não com um temporal. */
  it('não desenha nada', () => {
    expect(efeitosDoTempo(null)).toEqual([]);
    expect(efeitosDoTempo({})).toEqual([]);
    expect(efeitosDoTempo({ tempo: {} })).toEqual([]);
    expect(efeitosDoTempo({ dia: 11, mes: 11, ano: 1500, hora: 20 })).toEqual([]);
  });

  it('degrau desconhecido no jsonb não quebra nem inventa efeito', () => {
    expect(efeitosDoTempo({ tempo: { agua: 'granizo_roxo' } })).toEqual([]);
  });
});

describe('o vento inclina o que cai do céu', () => {
  /* Detalhe que denuncia o temporal: chuva e neve leem o nível do vento, e é
     por isso que ele viaja junto no resultado em vez de a camada ter que ir
     buscá-lo. */
  it('chuva e neve carregam o vento da mesa', () => {
    const [chuva] = efeitosDoTempo({ tempo: { agua: 'tempestade', vento: 'vendaval' } });
    expect(chuva.tipo).toBe('chuva');
    expect(chuva.vento).toBe(intensidade({ vento: 'vendaval' }, 'vento'));
  });

  it('sem vento, cai reto', () => {
    const [chuva] = efeitosDoTempo({ tempo: { agua: 'chuva_fina' } });
    expect(chuva.vento).toBe(0);
  });
});
