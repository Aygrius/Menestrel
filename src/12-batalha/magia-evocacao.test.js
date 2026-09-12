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

describe('passoDeApoio — a evocação finalmente COMEÇA de algum lugar', () => {
  /* Até este ponto iniciarEvocacao existia, era testada e nunca era chamada:
     a mecânica que o usuário pediu ("quantidade de rodadas para evocar") não
     acontecia na mesa. passoDeApoio é quem decide entre largar e resolver, e
     mora numa função pura porque a decisão precisa ser IDÊNTICA nos dois
     lados — aplicarApoio (Mestre) e handleApoio (Jogador). */
  const CURAS_CAT = { key: 'curas_fisicas', nome: 'Curas Físicas',
                      evocacao: '3 rodadas', duracao: 'Instantânea',
                      nivel_1: 'Restaura 4 de energia física.' };
  const BENCAO_CAT = { key: 'bencao', nome: 'Bênção', evocacao: 'Instantânea',
                       duracao: '10 rodadas',
                       nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };
  const apoio = (cat) => ({ key: cat.key, nome: cat.nome, nivel: 1, catalogo: cat });

  const alvoP = (over = {}) => ({
    inst_id: 'a1', tipo: 'pj', nome: 'Alvo', raca: 'Humano',
    eh: 10, eh_max: 10, ef: 5, ef_max: 20, status: 'ativo', status_temp: [], ...over,
  });

  it('magia de N rodadas LARGA a canalização e não toca no alvo', () => {
    const arr = [conj(), alvoP()];
    const r = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false);
    expect(r.fase).toBe('iniciou');
    expect(r.participantes[0].evocando).toMatchObject({ magia_key: 'curas_fisicas', rodadas_rest: 3 });
    expect(r.participantes[1].ef).toBe(5);     // ninguém foi curado ainda
  });

  it('a largada cobra karma e PA', () => {
    const r = M.passoDeApoio([conj({ karma: 9, pa_rest: 1 }), alvoP()], 0, 1, apoio(CURAS_CAT), 1, false);
    expect(r.participantes[0].karma).toBe(8);
    expect(r.participantes[0].pa_rest).toBe(0);
  });

  it('magia INSTANTÂNEA resolve na hora, sem criar estado', () => {
    const r = M.passoDeApoio([conj(), alvoP()], 0, 1, apoio(BENCAO_CAT), 1, false);
    expect(r.fase).toBe('resolveu');
    expect(r.participantes[0].evocando).toBeUndefined();
    expect(r.participantes[1].status_temp.length).toBeGreaterThan(0);
  });

  it('concluir a canalização aplica o efeito e limpa o estado', () => {
    let arr = [conj(), alvoP()];
    arr = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false).participantes;
    // Três viradas até o contador zerar.
    for (let i = 0; i < 3; i++) arr[0] = M.processarViradaDeRodada(arr[0]).participante;
    expect(M.evocacaoPronta(arr[0])).toBe(true);
    const r = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false);
    expect(r.fase).toBe('resolveu');
    expect(r.participantes[0].evocando).toBeUndefined();
    expect(r.participantes[1].ef).toBe(9);     // curou os 4
  });

  it('concluir NÃO cobra o karma de novo — já foi pago na largada', () => {
    let arr = [conj({ karma: 5 }), alvoP()];
    arr = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false).participantes;
    expect(arr[0].karma).toBe(4);
    const r = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false);
    expect(r.participantes[0].karma).toBe(4);  // continua 4, não 3
  });

  it('alvo que MORREU no meio faz a magia resolver sem efeito', () => {
    // Spec §4.3: o karma já foi gasto; a magia sai, mas não pega em ninguém.
    let arr = [conj(), alvoP()];
    arr = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false).participantes;
    arr[1] = { ...arr[1], status: 'morto' };
    const r = M.passoDeApoio(arr, 0, 1, apoio(CURAS_CAT), 1, false);
    expect(r.fase).toBe('perdeu');
    expect(r.participantes[1].ef).toBe(5);     // não curou
    expect(r.participantes[0].evocando).toBeUndefined();
  });

  it('alvo de raça inválida também derruba o efeito na resolução', () => {
    const AURA_CAT = { key: 'aura_divina', nome: 'Aura Divina', evocacao: 'Instantânea',
                       duracao: '1 hora', nivel_1: 'A área reduz 1 coluna de ataque.' };
    const r = M.passoDeApoio([conj(), alvoP({ raca: 'Animal' })], 0, 1, apoio(AURA_CAT), 1, false);
    expect(r.fase).toBe('perdeu');
  });

  it('alvo que RESISTIU não recebe o efeito, mas a magia foi lançada', () => {
    const r = M.passoDeApoio([conj(), alvoP()], 0, 1, apoio(BENCAO_CAT), 1, true);
    expect(r.fase).toBe('resolveu');
    expect(r.participantes[1].status_temp).toHaveLength(0);
  });
});

describe('textoPassoDeApoio — o log conta a verdade em cada fase', () => {
  const CURAS = { key: 'curas_fisicas', nome: 'Curas Físicas', nivel: 1,
                  catalogo: { key: 'curas_fisicas', evocacao: '3 rodadas',
                              duracao: 'Instantânea', nivel_1: 'Restaura 4 de energia física.' } };

  it('largada diz que COMEÇOU, não que lançou', () => {
    // "lançou X em Y" era mentira quando nada tinha acontecido ainda.
    expect(M.textoPassoDeApoio('iniciou', 'Mago', CURAS, 'Alvo', false))
      .toBe('Mago começou a evocar Curas Físicas — 3 rodada(s) até resolver');
  });

  it('alvo perdido é registrado como tal', () => {
    expect(M.textoPassoDeApoio('perdeu', 'Mago', CURAS, 'Alvo', false))
      .toMatch(/o alvo não era mais válido/);
  });

  it('resolução com resistência', () => {
    expect(M.textoPassoDeApoio('resolveu', 'Mago', CURAS, 'Alvo', true))
      .toMatch(/resistiu/);
  });

  it('resolução normal descreve o efeito', () => {
    expect(M.textoPassoDeApoio('resolveu', 'Mago', CURAS, 'Alvo', false))
      .toBe('Mago lançou Curas Físicas em Alvo (restaura 4 de energia física)');
  });
});

describe('faseDeEvocacao — a mesma resposta para as duas abas e os dois lados', () => {
  const RITUAL   = { key: 'sagracao', nome: 'Sagração', evocacao: 'Ritual' };
  const INSTANT  = { key: 'bola_de_fogo', nome: 'Bola de Fogo', evocacao: 'Instantânea' };
  const CANAL    = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };

  it('Ritual é bloqueada', () => {
    expect(M.faseDeEvocacao(conj(), RITUAL)).toBe('bloqueada');
  });

  it('instantânea resolve na hora', () => {
    expect(M.faseDeEvocacao(conj(), INSTANT)).toBe('resolucao');
  });

  it('canalizada que ainda não começou é largada', () => {
    expect(M.faseDeEvocacao(conj(), CANAL)).toBe('largada');
  });

  it('canalizada JÁ em curso é resolução — não larga de novo', () => {
    // Sem isto o conjurador pagaria o karma a cada turno sem nunca resolver.
    const p = M.iniciarEvocacao(conj(), CANAL, 5, ['a1'], 5);
    expect(M.faseDeEvocacao(p, CANAL)).toBe('resolucao');
  });

  it('evocando OUTRA magia não faz esta virar resolução', () => {
    const p = M.iniciarEvocacao(conj(), CANAL, 5, ['a1'], 5);
    expect(M.faseDeEvocacao(p, { key: 'dardos_de_gelo', evocacao: '1 rodada' })).toBe('largada');
  });
});

describe('canalizar PRENDE o conjurador e a vez passa sozinha', () => {
  /* Regra confirmada pelo usuário em 11/09/2026: Meteoros com 5 rodadas de
     evocação realmente deixa o personagem 5 rodadas sem fazer nada, e a vez
     dele passa automaticamente. */
  const CANAL = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };

  it('quem está canalizando não tem ação, mesmo com PA cheio', () => {
    const p = { ...M.iniciarEvocacao(conj(), CANAL, 5, ['a1'], 5), pa_rest: 2 };
    expect(M.evocacaoPrendeAcao(p)).toBe(true);
    expect(M.temAcaoRestante(p)).toBe(false);
  });

  it('em ZERO rodadas ele volta a agir — a ação é resolver a magia', () => {
    let p = M.iniciarEvocacao(conj(), CANAL, 5, ['a1'], 5);
    for (let i = 0; i < 5; i++) p = M.processarViradaDeRodada(p).participante;
    expect(M.evocacaoPrendeAcao(p)).toBe(false);
    expect(M.temAcaoRestante(p)).toBe(true);
  });

  it('proximoAtivo PULA quem está canalizando', () => {
    // Sem o pulo a vez PARAVA nele: sem ação pra gastar, nada faria o turno
    // andar, e a batalha travava.
    const canalizando = { ...M.iniciarEvocacao(conj({ inst_id: 'c1' }), CANAL, 5, ['a1'], 5), ordem: 2 };
    const livre = { ...conj({ inst_id: 'c3' }), ordem: 3 };
    expect(M.proximoAtivo([canalizando, livre], 1).inst_id).toBe('c3');
  });

  it('proximoAtivo aceita quem TERMINOU a canalização', () => {
    let pronto = M.iniciarEvocacao(conj({ inst_id: 'c2' }), CANAL, 5, ['a1'], 5);
    for (let i = 0; i < 5; i++) pronto = M.processarViradaDeRodada(pronto).participante;
    expect(M.proximoAtivo([{ ...pronto, ordem: 2 }], 1).inst_id).toBe('c2');
  });

  it('quem não canaliza não é afetado', () => {
    expect(M.evocacaoPrendeAcao(conj())).toBe(false);
    expect(M.evocacaoPrendeAcao(null)).toBe(false);
  });
});
