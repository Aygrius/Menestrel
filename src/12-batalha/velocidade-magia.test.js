/* ============================================================
   velocidade-magia.test.js — velocidade lida do catálogo
   ============================================================
   Os textos abaixo são CÓPIAS LITERAIS do banco de produção (levantamento de
   01/09/2026), não invenções. Se o catálogo mudar de redação, este teste é o
   lugar onde a mudança aparece primeiro.

   Contexto: o catálogo descreve os efeitos em prosa, e o código já pesca o
   dano de lá (danoMagiaNoNivel). Velocidade segue o mesmo caminho — decisão
   registrada em docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md §2.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const mag = (nivel1, extra) => ({ key: 'x', nome: 'X', nivel_1: nivel1, ...extra });

describe('modVelocidadeNoNivel — os nove modificadores reais', () => {
  it('Aumente N de velocidade (Forçar Disputa, Velocidade)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 2 de velocidade.'), 1)).toBe(2);
  });

  it('Reduza N de velocidade (Região Inviolável)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza 12 de velocidade.'), 1)).toBe(-12);
  });

  it('Reduza N PONTOS de velocidade (Distração)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza 4 pontos de velocidade.'), 1)).toBe(-4);
  });

  it('velocidade no meio de outros efeitos (Coordenação)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 coluna de ataque e 2 de velocidade.'), 1)).toBe(2);
  });

  it('velocidade em primeiro, outros depois (Canção do Ânimo)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 de velocidade e 5 de energia heroica.'), 1)).toBe(1);
  });

  it('lista de três (Perspicácia)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 de velocidade, 1 de defesa e 1 coluna de ataque.'), 1)).toBe(1);
  });

  it('Tensão, já corrigida pela Task 1', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 3 de defesa, 3 de velocidade e 3 colunas de ataque.'), 1)).toBe(3);
  });

  it('tolera o typo Reduza5 sem espaço (Ruído Extenuante)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza5 colunas de ataque e 16 de velocidade.'), 1)).toBe(-16);
  });
});

describe('modVelocidadeNoNivel — rejeita quem só DESCREVE velocidade', () => {
  it('Telecinese: número DEPOIS da palavra', () => {
    expect(M.modVelocidadeNoNivel(
      mag('Mova 5 kg, arraste 10 kg ou derrube 15 kg em uma velocidade de 5 metros por rodada.'), 1)).toBe(0);
  });

  it('Unidade Natural: "com velocidade 20"', () => {
    expect(M.modVelocidadeNoNivel(mag('Se move por 25 metros com velocidade 20.'), 1)).toBe(0);
  });

  it('Olhar de Predador: sem número nenhum', () => {
    expect(M.modVelocidadeNoNivel(
      mag('O alvo perde a iniciativa, além disso, revele sua velocidade e seus tipos de ataque.'), 1)).toBe(0);
  });

  it('sem verbo Aumente/Reduza o sinal é ambíguo → 0', () => {
    expect(M.modVelocidadeNoNivel(mag('O alvo fica com 5 de velocidade.'), 1)).toBe(0);
  });
});

describe('modVelocidadeNoNivel — o nível certo', () => {
  const velocidade = {
    key: 'velocidade', nome: 'Velocidade',
    nivel_1: 'Aumente 2 de velocidade.',
    nivel_5: 'Aumente 6 de velocidade.',
    nivel_9: 'Aumente 10 de velocidade.',
  };

  it('lê o texto do nível efetivo pedido', () => {
    expect(M.modVelocidadeNoNivel(velocidade, 1)).toBe(2);
    expect(M.modVelocidadeNoNivel(velocidade, 5)).toBe(6);
    expect(M.modVelocidadeNoNivel(velocidade, 9)).toBe(10);
  });

  it('nível sem texto devolve 0', () => {
    expect(M.modVelocidadeNoNivel(velocidade, 3)).toBe(0);
  });

  it('magia ausente devolve 0', () => {
    expect(M.modVelocidadeNoNivel(null, 1)).toBe(0);
    expect(M.modVelocidadeNoNivel(undefined, 5)).toBe(0);
  });
});

describe('duracaoEmRodadas — a coluna duracao é texto livre', () => {
  it('"2 rodadas" vira 2', () => {
    expect(M.duracaoEmRodadas({ duracao: '2 rodadas' }))
      .toEqual({ rodadas: 2, concentracao: false });
  });

  it('"10 rodadas" vira 10', () => {
    expect(M.duracaoEmRodadas({ duracao: '10 rodadas' }))
      .toEqual({ rodadas: 10, concentracao: false });
  });

  it('"Variável" é CONCENTRAÇÃO, não duração', () => {
    expect(M.duracaoEmRodadas({ duracao: 'Variável' }))
      .toEqual({ rodadas: null, concentracao: true });
  });

  it('tempos mais longos que uma batalha duram até o fim dela', () => {
    for (const d of ['30 minutos', '1 hora', '6 horas', '1 ano e 1 dia']) {
      expect(M.duracaoEmRodadas({ duracao: d }))
        .toEqual({ rodadas: null, concentracao: false });
    }
  });

  it('duração ausente dura até o fim da batalha', () => {
    expect(M.duracaoEmRodadas({})).toEqual({ rodadas: null, concentracao: false });
    expect(M.duracaoEmRodadas(null)).toEqual({ rodadas: null, concentracao: false });
  });
});

describe('exigeResistencia — a frase é literal e idêntica nas quatro', () => {
  it('Distração', () => {
    expect(M.exigeResistencia({ descricao:
      'Você emite um som à sua escolha que é capaz de chamar rapidamente a atenção de todos que não passarem em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Forçar Disputa', () => {
    expect(M.exigeResistencia({ descricao:
      'Esta magia é utilizada de forma estratégica para atrair a atenção de um determinado adversário e forçá-lo ao combate, caso falhe em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Região Inviolável', () => {
    expect(M.exigeResistencia({ descricao:
      'Com esta magia, você é capaz de controlar o ambiente através de um toque no chão, fazendo com que todos se locomovam com muita dificuldade, caso falhem em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Tensão', () => {
    expect(M.exigeResistencia({ descricao:
      'Dentro da área de efeito, todos devem fazer um teste de resistência mágica.' })).toBe('rm');
  });

  it('resistência FÍSICA também é reconhecida', () => {
    expect(M.exigeResistencia({ descricao: 'O alvo faz um teste de resistência física.' })).toBe('rf');
  });

  // REGRESSÃO: um padrão largo (teste|resist|falh|passar) casava o "passar"
  // dentro de "ultraPASSAR 30" e marcava a magia Velocidade como se pedisse
  // rolagem. Ela NÃO pede. Erro cometido de verdade na investigação.
  it('não confunde "ultrapassar" com "passar em um teste"', () => {
    expect(M.exigeResistencia({ descricao:
      'Uma descarga cinética envolve seu corpo, aumentando sua velocidade e sua iniciativa. Se sua velocidade ultrapassar 30, você terá uma segunda ação na mesma rodada.' })).toBeNull();
  });

  it('buffs sem teste devolvem null', () => {
    expect(M.exigeResistencia({ descricao: 'Aumenta a disposição dos ouvintes.' })).toBeNull();
    expect(M.exigeResistencia({})).toBeNull();
    expect(M.exigeResistencia(null)).toBeNull();
  });
});

describe('magiasDeApoioDoAtor', () => {
  const CATALOGOS = {
    pjById: { 7: { id: 7, magias: { velocidade: 3, distracao: 1, bola_fogo: 2 } } },
    magiasByKey: {
      // passos 3 → nível efetivo 5 (p*2-1)
      velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
                    descricao: 'Uma descarga cinética. Se sua velocidade ultrapassar 30, você terá uma segunda ação.',
                    nivel_5: 'Aumente 6 de velocidade.' },
      // passos 1 → nível efetivo 1
      distracao:  { key: 'distracao', nome: 'Distração', duracao: '2 rodadas',
                    descricao: 'Chama a atenção de todos que não passarem em um teste de resistência mágica.',
                    nivel_1: 'Reduza 4 pontos de velocidade.' },
      // passos 2 → nível efetivo 3; não mexe em velocidade
      bola_fogo:  { key: 'bola_fogo', nome: 'Bola de Fogo', duracao: 'Instantânea',
                    descricao: 'Fogo.', nivel_3: 'Causa 12 de dano.' },
    },
    catalogoBySlug: {},
  };
  const ATOR = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Mago' };

  it('lista só as magias que modificam velocidade', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    expect(lista.map((m) => m.key).sort()).toEqual(['distracao', 'velocidade']);
  });

  it('traz o valor do nível efetivo, não do nível 1', () => {
    const v = M.magiasDeApoioDoAtor(ATOR, CATALOGOS).find((m) => m.key === 'velocidade');
    expect(v.nivel).toBe(5);        // 3 passos → 5
    expect(v.mod_vb).toBe(6);
    expect(v.custo_karma).toBe(5);  // karma = nível efetivo
  });

  it('traz duração, concentração e resistência resolvidas', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    const v = lista.find((m) => m.key === 'velocidade');
    const d = lista.find((m) => m.key === 'distracao');
    expect(v.rodadas).toBeNull();
    expect(v.concentracao).toBe(false);
    expect(v.resistencia).toBeNull();
    expect(d.rodadas).toBe(2);
    expect(d.mod_vb).toBe(-4);
    expect(d.resistencia).toBe('rm');
  });

  it('criatura não tem magia de apoio (só PJ conjura)', () => {
    expect(M.magiasDeApoioDoAtor({ tipo: 'criatura', ref_id: 1 }, CATALOGOS)).toEqual([]);
  });

  it('ator ou catálogo ausente devolve lista vazia', () => {
    expect(M.magiasDeApoioDoAtor(null, CATALOGOS)).toEqual([]);
    expect(M.magiasDeApoioDoAtor(ATOR, null)).toEqual([]);
  });
});

describe('aplicarEfeitoApoio', () => {
  const alvo = { tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Alvo', vb: 20, status_temp: [] };
  const apoio = { key: 'velocidade', nome: 'Velocidade', mod_vb: 6, rodadas: null, concentracao: false };

  it('cria um status_temp com o efeito mod_vb', () => {
    const p = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_vb', valor: 6 });
  });

  it('NÃO altera o vb real do snapshot', () => {
    const p = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(p.vb).toBe(20);
    expect(M.vbEfetivo(p)).toBe(26);
  });

  it('não muta o participante original', () => {
    M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(alvo.status_temp).toHaveLength(0);
  });

  it('duração em rodadas vira rodadas_rest; sem duração vira null', () => {
    expect(M.aplicarEfeitoApoio(alvo, { ...apoio, rodadas: 2 }, 'pj:7').status_temp[0].rodadas_rest).toBe(2);
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].rodadas_rest).toBeNull();
  });

  it('só marca concentracao quando a magia é de concentração', () => {
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].concentracao).toBeUndefined();
    const c = M.aplicarEfeitoApoio(alvo, { ...apoio, concentracao: true }, 'pj:7');
    expect(c.status_temp[0].concentracao).toEqual({ ator: 'pj:7', magia_key: 'velocidade' });
  });

  it('duas aplicações empilham e somam', () => {
    const um = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    const dois = M.aplicarEfeitoApoio(um, apoio, 'pj:7');
    expect(dois.status_temp).toHaveLength(2);
    expect(M.vbEfetivo(dois)).toBe(32);
  });
});

describe('quebrarConcentracao', () => {
  const comEfeito = (nome, instId, sustentadoPor) => ({
    tipo: 'pj', ref_id: nome, inst_id: instId, nome, vb: 20,
    status_temp: [{ id: 'mag:x:1', nome: 'Velocidade', rodadas_rest: null,
                    concentracao: { ator: sustentadoPor, magia_key: 'velocidade' },
                    efeito: { tipo: 'mod_vb', valor: 6 } }],
  });

  it('remove o efeito sustentado pelo ator que quebrou', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:7')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(0);
    expect(M.vbEfetivo(next[0])).toBe(20);
  });

  it('remove em TODOS os alvos do mesmo conjurador', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:7'), comEfeito('B', 'pj:2', 'pj:7')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(0);
    expect(next[1].status_temp).toHaveLength(0);
  });

  it('NÃO toca no efeito de outro conjurador', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:9')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(1);
  });

  it('NÃO toca em efeito sem concentração (duração fixa)', () => {
    const arr = [{ tipo: 'pj', ref_id: 'A', inst_id: 'pj:1', nome: 'A', vb: 20,
      status_temp: [{ id: 'mag:y:1', nome: 'Distração', rodadas_rest: 2,
                      efeito: { tipo: 'mod_vb', valor: -4 } }] }];
    expect(M.quebrarConcentracao(arr, 'pj:7')[0].status_temp).toHaveLength(1);
  });

  it('devolve o MESMO array quando nada muda (evita re-render à toa)', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:9')];
    expect(M.quebrarConcentracao(arr, 'pj:7')).toBe(arr);
  });
});

describe('virada de rodada — iniciativa, movimento e ação extra andam juntos', () => {
  const base = (nome, vb, extra) => ({
    tipo: 'pj', ref_id: nome, inst_id: 'pj:' + nome, nome, vb,
    status: 'ativo', atual: false, ordem: 1,
    pa_max: 2, pa_rest: 0, mov_rest: 0, moveu_na_rodada: true,
    ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 9, karma_max: 9,
    status_temp: [], ...extra,
  });
  const acelerar = (n) => ([{ id: 'mag:v:1', nome: 'Velocidade', rodadas_rest: null,
                              efeito: { tipo: 'mod_vb', valor: n } }]);

  it('acelerado passa na frente na rodada seguinte', () => {
    const arr = [base('Lento', 20), base('Rapido', 12, { status_temp: acelerar(15) })];
    const { participantes } = M.montarNovaRodada(arr);
    const rapido = participantes.find((p) => p.nome === 'Rapido');
    const lento  = participantes.find((p) => p.nome === 'Lento');
    expect(rapido.ordem).toBeLessThan(lento.ordem);
    expect(rapido.vb).toBe(12);   // o vb REAL não muda
  });

  it('movimento segue a velocidade efetiva, não o vb cru', () => {
    // movimentoBase = max(5, floor(VB * 5/20)). VB 20 → 5; VB 40 → 10.
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(20) })]);
    expect(participantes[0].mov_rest).toBe(10);
  });

  it('debuff grande não derruba o movimento abaixo do piso de 5', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(-18) })]);
    expect(participantes[0].mov_rest).toBe(5);
  });

  it('velocidade efetiva ACIMA de 30 dá uma ação extra', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(15) })]);
    expect(participantes[0].pa_rest).toBe(3);   // pa_max 2 + 1
  });

  it('exatamente 30 NÃO dá ação extra (a regra é "ultrapassar")', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(10) })]);
    expect(participantes[0].pa_rest).toBe(2);
  });

  it('quem já nasce acima de 30 também ganha a ação extra', () => {
    const { participantes } = M.montarNovaRodada([base('A', 35)]);
    expect(participantes[0].pa_rest).toBe(3);
  });

  it('quem não está ativo não recupera nada', () => {
    const { participantes } = M.montarNovaRodada([base('A', 35, { status: 'desmaiado' })]);
    expect(participantes[0].pa_rest).toBe(0);
  });
});
