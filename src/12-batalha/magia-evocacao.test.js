/* ============================================================
   magia-evocacao.test.js — a evocação canalizada
   ============================================================
   O mecanismo novo da Fase 1 das magias: uma magia de "N rodadas" de evocação
   prende o conjurador por N rodadas antes de resolver, e qualquer outra ação
   derruba.

   As regras de QUEBRA não são novas — são as da concentração, que já existiam
   e já eram testadas (concentracao-dano.test.js, saida-de-combate.test.js).
   quebrarEvocacao fica ENCADEADA em quebrarConcentracao justamente pra não
   criar um segundo caminho paralelo; esta suíte prova que o encadeamento
   funciona nos três gatilhos.

   Spec §4.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M.evocacaoEmRodadas).toBeTypeOf('function');
  expect(M.iniciarEvocacao).toBeTypeOf('function');
});

const conj = (over = {}) => ({
  inst_id: 'c1', ref_id: 1, tipo: 'pj', nome: 'Conjurador',
  eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, res: 0,
  karma: 9, karma_max: 9, pa_max: 1, pa_rest: 1, vb: 10,
  status: 'ativo', status_temp: [], ...over,
});

const METEOROS = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };
const CURAS    = { key: 'curas_fisicas', nome: 'Curas Físicas', evocacao: '3 rodadas' };

describe('evocacaoEmRodadas — o que cada valor do banco significa', () => {
  it.each([
    ['Instantânea', 0], ['1 rodada', 1], ['2 rodadas', 2],
    ['3 rodadas', 3], ['5 rodadas', 5], ['10 rodadas', 10],
  ])('%s → %i rodadas, não bloqueada', (txt, n) => {
    expect(M.evocacaoEmRodadas({ evocacao: txt })).toEqual({ rodadas: n, bloqueada: false });
  });

  it.each(['Ritual', 'Variável', '12 horas', '8 horas', '1 dia', '30 minutos'])(
    '%s é bloqueada em batalha', (txt) => {
      expect(M.evocacaoEmRodadas({ evocacao: txt }).bloqueada).toBe(true);
    });

  it('evocação ausente é instantânea, NÃO bloqueio', () => {
    // Uma linha de catálogo incompleta não pode tirar a magia da mesa.
    expect(M.evocacaoEmRodadas({})).toEqual({ rodadas: 0, bloqueada: false });
    expect(M.evocacaoEmRodadas(null)).toEqual({ rodadas: 0, bloqueada: false });
  });
});

describe('iniciarEvocacao — a largada', () => {
  it('grava o estado com as rodadas do banco', () => {
    expect(M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5).evocando).toMatchObject({
      magia_key: 'meteoros', nivel: 5, alvos: ['a1'], rodadas_rest: 5, karma_pago: 5,
    });
  });

  it('debita o karma NA LARGADA, não na resolução', () => {
    expect(M.iniciarEvocacao(conj({ karma: 9 }), METEOROS, 5, ['a1'], 5).karma).toBe(4);
  });

  it('debita 1 PA na largada', () => {
    expect(M.iniciarEvocacao(conj({ pa_rest: 1 }), METEOROS, 5, ['a1'], 5).pa_rest).toBe(0);
  });

  it('karma nunca fica negativo', () => {
    expect(M.iniciarEvocacao(conj({ karma: 2 }), METEOROS, 5, ['a1'], 5).karma).toBe(0);
  });

  it('magia instantânea NÃO cria estado, mas cobra', () => {
    const r = M.iniciarEvocacao(conj(), { key: 'bola_de_fogo', evocacao: 'Instantânea' }, 1, ['a1'], 1);
    expect(r.evocando).toBeUndefined();
    expect(r.karma).toBe(8);
  });

  it('magia bloqueada não cria estado NEM cobra', () => {
    const p = conj();
    expect(M.iniciarEvocacao(p, { key: 'sagracao', evocacao: 'Ritual' }, 1, ['a1'], 1)).toBe(p);
  });

  it('sem alvos declarados grava lista vazia, sem lançar', () => {
    expect(M.iniciarEvocacao(conj(), METEOROS, 5, null, 5).evocando.alvos).toEqual([]);
  });
});

describe('a contagem até a resolução', () => {
  it('cada virada tira uma rodada', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    expect(p.evocando.rodadas_rest).toBe(3);
    p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(2);
    p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(1);
  });

  it('evocacaoPronta só em zero', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    expect(M.evocacaoPronta(p)).toBe(false);
    p = M.decrementarEvocacao(M.decrementarEvocacao(M.decrementarEvocacao(p)));
    expect(p.evocando.rodadas_rest).toBe(0);
    expect(M.evocacaoPronta(p)).toBe(true);
  });

  it('não decrementa abaixo de zero', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    for (let i = 0; i < 10; i++) p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(0);
  });

  it('quem não está evocando atravessa a virada sem mudar', () => {
    const p = conj();
    expect(M.decrementarEvocacao(p)).toBe(p);
    expect(M.evocacaoPronta(p)).toBe(false);
  });

  it('processarViradaDeRodada decrementa a evocação junto de tudo o mais', () => {
    // A integração importa: a contagem tem que andar na virada REAL, não só
    // quando alguém chama decrementarEvocacao à mão.
    const p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    expect(M.processarViradaDeRodada(p).participante.evocando.rodadas_rest).toBe(2);
  });
});

describe('a quebra — as mesmas regras da concentração', () => {
  const evocando = () => [M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5)];

  it('quebrar remove o estado e registra o motivo', () => {
    const r = M.quebrarEvocacao(evocando(), 'c1', 'atacou');
    expect(r[0].evocando).toBeUndefined();
    expect(r[0].evocacao_quebrada).toEqual({ magia_key: 'meteoros', motivo: 'atacou' });
  });

  it('o karma NÃO volta', () => {
    const antes = evocando();
    expect(M.quebrarEvocacao(antes, 'c1', 'atacou')[0].karma).toBe(antes[0].karma);
  });

  it('quebra só a evocação do ator citado', () => {
    const outro = M.iniciarEvocacao(conj({ inst_id: 'c2' }), METEOROS, 5, ['a1'], 5);
    const r = M.quebrarEvocacao([...evocando(), outro], 'c1', 'andou');
    expect(r[0].evocando).toBeUndefined();
    expect(r[1].evocando).toBeDefined();
  });

  it('sem nada a quebrar devolve o MESMO array', () => {
    const ps = [conj()];
    expect(M.quebrarEvocacao(ps, 'c1', 'atacou')).toBe(ps);
  });

  it('quebrarConcentracao derruba a evocação junto', () => {
    // O encadeamento: as duas coisas são "preso a uma magia", e uma ação que
    // derruba uma tem que derrubar a outra.
    const p = { ...M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5),
                status_temp: [{ id: 'mag_y', rodadas_rest: null,
                                concentracao: { ator: 'c1', magia_key: 'sono' },
                                efeito: { tipo: 'mod_vb', valor: -2 } }] };
    const r = M.quebrarConcentracao([p], 'c1');
    expect(r[0].status_temp).toHaveLength(0);
    expect(r[0].evocando).toBeUndefined();
  });

  it('quebrarConcentracao derruba a evocação mesmo sem concentração ativa', () => {
    // O caso comum: o conjurador está SÓ evocando, sem sustentar nada.
    const r = M.quebrarConcentracao(evocando(), 'c1');
    expect(r[0].evocando).toBeUndefined();
  });
});

describe('dano: o que quebra e o que não quebra', () => {
  const ev = (over = {}) => M.iniciarEvocacao(conj(over), METEOROS, 5, ['a1'], 5);

  it('dano que CHEGA NA EF quebra', () => {
    const antes = ev({ ef: 20 });
    const depois = { ...antes, ef: 15 };
    expect(M.quebrarConcentracaoPorDano([depois], antes, depois)[0].evocando).toBeUndefined();
  });

  it('dano contido pela EH NÃO quebra', () => {
    const antes = ev({ eh: 10, ef: 20 });
    const depois = { ...antes, eh: 4 };
    expect(M.quebrarConcentracaoPorDano([depois], antes, depois)[0].evocando).toBeDefined();
  });

  it('dano contido pela AR NÃO quebra', () => {
    const antes = ev({ ar: 8, ef: 20, res: 3 });
    const depois = { ...antes, res: 2 };
    expect(M.quebrarConcentracaoPorDano([depois], antes, depois)[0].evocando).toBeDefined();
  });

  it('desmaiar quebra, mesmo sem a EF ser tocada', () => {
    // Zerar a EH desmaia sem a EF mudar — o caso que escapava nos call sites
    // antes do fix de concentracao-dano.test.js.
    const antes = ev({ eh: 3, ef: 20, status: 'ativo' });
    const depois = { ...antes, eh: 0, status: 'desmaiado' };
    expect(M.quebrarConcentracaoPorDano([depois], antes, depois)[0].evocando).toBeUndefined();
  });
});

describe('sair de combate quebra a evocação', () => {
  it.each(['desmaiado', 'morto', 'desistiu'])('%s derruba a canalização', (st) => {
    const p = M.iniciarEvocacao(conj({ atual: false }), METEOROS, 5, ['a1'], 5);
    const r = M.saidaDeCombate([p], { tipo: 'pj', ref_id: 1, inst_id: 'c1' }, st);
    expect(r.participantes[0].evocando).toBeUndefined();
  });
});

describe('passar a vez NÃO quebra — é assim que se evoca', () => {
  it('a virada de rodada mantém a canalização e só conta', () => {
    const p = M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5);
    const depois = M.processarViradaDeRodada(p).participante;
    expect(depois.evocando).toBeDefined();
    expect(depois.evocando.rodadas_rest).toBe(4);
  });

  it('cinco viradas levam Meteoros até a resolução', () => {
    let p = M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5);
    for (let i = 0; i < 5; i++) p = M.processarViradaDeRodada(p).participante;
    expect(M.evocacaoPronta(p)).toBe(true);
  });
});
