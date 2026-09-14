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
import '../01-core/magias-efeito.jsx';
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
  /* CRITÉRIO MUDOU EM 11/09/2026, de propósito.

     Era "modifica velocidade no nível efetivo", porque velocidade era o único
     efeito de apoio que o motor sabia aplicar. Com a Fase 1 das magias o
     critério passou a ser "tem entrada no MAGIA_EFEITO_MAP e não é magia de
     ataque" — a aba Apoio deixa de ser a aba da Velocidade e vira a aba de
     todo buff mecânico.

     Consequência nas fixtures: a magia "fora do registro" precisa ser uma que
     REALMENTE ficou de fora — e essa fixture já trocou DUAS vezes por causa
     disso: era `distracao`, que entrou na varredura de 12/09/2026; virou
     `forcar_disputa`, que entrou no mesmo dia quando o usuário decidiu de
     quem é o bônus de velocidade. Agora é uma chave INVENTADA, que nenhum
     dia de varredura pode alcançar: o que o teste afirma é sobre estar fora
     do registro, não sobre qual magia está fora. Ganhou lugar `bencao`, que
     é do recorte.
     As expectativas sobre Velocidade em si NÃO mudaram — ela atravessou a
     migração sem mudar de comportamento, que era o requisito. */
  const CATALOGOS = {
    pjById: { 7: { id: 7, magias: { velocidade: 3, nao_registrada: 1, bola_de_fogo: 2, bencao: 1 } } },
    magiasByKey: {
      // passos 3 → nível efetivo 5 (p*2-1)
      velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
                    evocacao: 'Instantânea', alcance: 'Pessoal',
                    descricao: 'Uma descarga cinética. Se sua velocidade ultrapassar 30, você terá uma segunda ação.',
                    nivel_5: 'Aumente 6 de velocidade.' },
      // Modifica velocidade, mas NÃO está no registro da Fase 1 → narrativa.
      nao_registrada: { key: 'nao_registrada', nome: 'Magia Narrativa', duracao: '2 rodadas',
                    descricao: 'Chama a atenção de todos que não passarem em um teste de resistência mágica.',
                    nivel_1: 'Reduza 4 pontos de velocidade.' },
      // No registro, mas alvo 'inimigo' → vive na aba Magia, não na Apoio.
      bola_de_fogo: { key: 'bola_de_fogo', nome: 'Bola de Fogo', duracao: 'Instantânea',
                      evocacao: 'Instantânea', descricao: 'Fogo.',
                      nivel_3: 'Causa 12 de dano elemental de fogo.' },
      // No registro, alvo 'aliado', e NÃO mexe em velocidade — o caso que o
      // critério antigo excluía e o novo inclui.
      bencao:     { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                    evocacao: 'Instantânea', alcance: 'Toque', descricao: 'Bênção divina.',
                    nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' },
    },
    catalogoBySlug: {},
  };
  const ATOR = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Mago' };

  it('lista as magias de apoio do registro, não só as de velocidade', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    expect(lista.map((m) => m.key).sort()).toEqual(['bencao', 'velocidade']);
  });

  it('magia de ATAQUE não entra na aba Apoio', () => {
    expect(M.magiasDeApoioDoAtor(ATOR, CATALOGOS).map((m) => m.key))
      .not.toContain('bola_de_fogo');
  });

  it('magia fora do registro continua narrativa, mesmo mexendo em velocidade', () => {
    expect(M.magiasDeApoioDoAtor(ATOR, CATALOGOS).map((m) => m.key))
      .not.toContain('nao_registrada');
  });

  it('traz o valor do nível efetivo, não do nível 1', () => {
    const v = M.magiasDeApoioDoAtor(ATOR, CATALOGOS).find((m) => m.key === 'velocidade');
    expect(v.nivel).toBe(5);        // 3 passos → 5
    expect(v.mod_vb).toBe(6);
    expect(v.custo_karma).toBe(5);  // karma = nível efetivo
  });

  it('traz duração, concentração e resistência resolvidas', () => {
    const v = M.magiasDeApoioDoAtor(ATOR, CATALOGOS).find((m) => m.key === 'velocidade');
    expect(v.rodadas).toBeNull();
    expect(v.concentracao).toBe(false);
    expect(v.resistencia).toBeNull();
  });

  it('traz os campos novos da Fase 1', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    const v = lista.find((m) => m.key === 'velocidade');
    const b = lista.find((m) => m.key === 'bencao');
    expect(v).toMatchObject({ alvo: 'self',   max_alvos: 1, evocacao_rodadas: 0,
                              evocacao_bloqueada: false, pessoal: true });
    expect(b).toMatchObject({ alvo: 'aliado', max_alvos: 1, pessoal: false });
    // O objeto do catálogo viaja inteiro pra aplicarEfeitoMagia ler o nível.
    expect(b.catalogo.nivel_1).toContain('energia heroica');
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
  /* MUDOU EM 11/09/2026: magia COM entrada no MAGIA_EFEITO_MAP passa a ser
     delegada a aplicarEfeitoMagia, que lê todos os efeitos do texto do nível.
     A delegação mora dentro de aplicarEfeitoApoio, e não nos dois handlers
     (Mestre e Jogador), pela mesma disciplina do resto do motor: a regra fica
     na função pura, a duplicação fica no call site.

     Duas consequências para estas fixtures:
       • elas precisam carregar o texto do nível — o valor não vem mais de um
         campo `mod_vb` pré-calculado;
       • reaplicar RENOVA em vez de empilhar (decisão 8 do spec).

     O caminho ANTIGO continua vivo para magia sem entrada no registro, e tem
     describe próprio logo abaixo. */
  const alvo = { tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Alvo', vb: 20,
                 eh: 10, eh_max: 10, status_temp: [] };
  // Velocidade nível 5: "Aumente 6 de velocidade", duração 30 minutos.
  const apoio = { key: 'velocidade', nome: 'Velocidade', nivel: 5, mod_vb: 6,
                  rodadas: null, concentracao: false,
                  catalogo: { key: 'velocidade', nome: 'Velocidade',
                              duracao: '30 minutos', nivel_5: 'Aumente 6 de velocidade.' } };

  it('cria um status_temp com o efeito mod_vb', () => {
    const p = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].efeito).toMatchObject({ tipo: 'mod_vb', valor: 6 });
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

  it('duração em rodadas vira rodadas_rest; mais longa que a batalha vira null', () => {
    const curta = { ...apoio,
      catalogo: { ...apoio.catalogo, duracao: '2 rodadas' } };
    expect(M.aplicarEfeitoApoio(alvo, curta, 'pj:7').status_temp[0].rodadas_rest).toBe(2);
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].rodadas_rest).toBeNull();
  });

  it('só marca concentracao quando a magia é de concentração', () => {
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].concentracao).toBeUndefined();
    const conc = { ...apoio, catalogo: { ...apoio.catalogo, duracao: 'Variável' } };
    expect(M.aplicarEfeitoApoio(alvo, conc, 'pj:7').status_temp[0].concentracao)
      .toEqual({ ator: 'pj:7', magia_key: 'velocidade' });
  });

  it('reaplicar RENOVA em vez de empilhar', () => {
    // Era "duas aplicações empilham e somam" (vbEfetivo 32). Empilhar deixava
    // relançar Velocidade cinco vezes virar +30 de velocidade no mesmo alvo.
    // Decisão 8 do spec, a mesma que as técnicas já seguiam.
    const um = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    const dois = M.aplicarEfeitoApoio(um, apoio, 'pj:7');
    expect(dois.status_temp).toHaveLength(1);
    expect(M.vbEfetivo(dois)).toBe(26);
  });
});

describe('aplicarEfeitoApoio — o caminho antigo, para magia fora do registro', () => {
  /* Magia sem entrada no MAGIA_EFEITO_MAP continua pelo caminho de antes da
     Fase 1: um status de mod_vb montado a partir do campo pré-calculado. É o
     fallback, não um erro — Distração e as outras magias de velocidade que
     nenhum PJ comprou seguem por aqui. */
  const alvo = { tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Alvo', vb: 20, status_temp: [] };
  // Chave INVENTADA de propósito: ver a nota da fixture lá em cima — usar magia
  // real aqui faz o teste quebrar no dia em que ela entra no registro.
  const fora = { key: 'nao_registrada', nome: 'Magia Narrativa', mod_vb: -4, rodadas: 2, concentracao: false };

  it('grava mod_vb a partir do campo pré-calculado', () => {
    const p = M.aplicarEfeitoApoio(alvo, fora, 'pj:7');
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_vb', valor: -4 });
    expect(p.status_temp[0].rodadas_rest).toBe(2);
  });

  it('AINDA empilha — o caminho antigo não mudou de comportamento', () => {
    const dois = M.aplicarEfeitoApoio(M.aplicarEfeitoApoio(alvo, fora, 'pj:7'), fora, 'pj:7');
    expect(dois.status_temp).toHaveLength(2);
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

describe('magia de debuff/controle tem onde ser lançada', () => {
  /* BURACO DA FASE 1, achado em 12/09/2026 ao ligar o controle da Fase 2.

     magiasOfensivasDoAtor exige `dano > 0`; magiasDeApoioDoAtor excluía
     `alvo === 'inimigo'`. Magia que mira inimigo SEM causar dano caía entre as
     duas e não aparecia em aba nenhuma — Aura Divina ficou INCONJURÁVEL desde
     que entrou no registro, e Medo, Sono e Esconjuração nasceriam iguais.

     O critério passou a ser sobre o EFEITO: quem causa dano vive na aba Magia
     (coluna de ataque); todo o resto vive na Apoio, que já resolve por disputa
     de resistência. */
  const CAT = {
    pjById: { 7: { id: 7, magias: { aura_divina: 1, medo: 1, bola_de_fogo: 1, bencao: 1 } } },
    magiasByKey: {
      aura_divina:  { key: 'aura_divina', nome: 'Aura Divina', duracao: '1 hora',
                      evocacao: 'Instantânea', alcance: '25 metros',
                      descricao: 'Repele demônios e mortos-vivos.',
                      nivel_1: 'A área reduz 1 coluna de ataque.' },
      medo:         { key: 'medo', nome: 'Medo', duracao: 'Variável',
                      evocacao: 'Instantânea', alcance: '5 metros',
                      descricao: 'O alvo que falhar em um teste de resistência mágica fica sem ação.',
                      nivel_1: 'A magia tem duração de 1 rodada.' },
      bola_de_fogo: { key: 'bola_de_fogo', nome: 'Bola de Fogo', duracao: 'Instantânea',
                      evocacao: 'Instantânea', descricao: 'Fogo.',
                      nivel_1: 'Causa 12 de dano elemental de fogo.' },
      bencao:       { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                      evocacao: 'Instantânea', alcance: 'Toque', descricao: 'Bênção.',
                      nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' },
    },
    catalogoBySlug: {},
  };
  const ATOR = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Clériga' };

  it('Aura Divina aparece na aba Apoio', () => {
    expect(M.magiasDeApoioDoAtor(ATOR, CAT).map((m) => m.key)).toContain('aura_divina');
  });

  it('Medo também — controle é resolvido por resistência, não por coluna', () => {
    const medo = M.magiasDeApoioDoAtor(ATOR, CAT).find((m) => m.key === 'medo');
    expect(medo).toBeDefined();
    expect(medo.resistencia).toBe('rm');
  });

  it('magia de DANO continua fora da aba Apoio', () => {
    expect(M.magiasDeApoioDoAtor(ATOR, CAT).map((m) => m.key)).not.toContain('bola_de_fogo');
  });

  it('buff em aliado não foi afetado pela mudança', () => {
    expect(M.magiasDeApoioDoAtor(ATOR, CAT).map((m) => m.key)).toContain('bencao');
  });
});

describe('CRIATURA conjura — 12/09/2026', () => {
  /* A spec registrava normalização de `criaturas.magia` como PRÉ-REQUISITO.
     O levantamento mostrou que ela não é necessária: 89 menções, 39 nomes
     distintos, 100% casando com magias.nome, e magia_n preenchido nas 60
     criaturas, sempre em 1/3/5/7/9.

     Resolver por nome em tempo de execução não corre risco de migração, não
     muda schema e deixa o Mestre continuar digitando nomes no editor. */
  /* 13/09/2026: o nível das magias da criatura é o ESTÁGIO dela, não
     `magia_n` ("se a criatura tem nível 7 e magia bola de fogo, o nível da
     magia é 7" — usuário). magia_n fica nas fixtures com valor DIFERENTE de
     propósito, para provar que não é mais lido. */
  const CAT = {
    pjById: {},
    criById: {
      10: { id: 10, nome: 'Gárgula II', magia: 'Geoproteção, Piromanipulação', estagio: 5, magia_n: 1 },
      11: { id: 11, nome: 'Aparição',   magia: 'Toque Gélido',                 estagio: 11, magia_n: 3 },
      12: { id: 12, nome: 'Mudo',       magia: null,                           estagio: 2, magia_n: null },
      13: { id: 13, nome: 'Fantasma',   magia: 'Magia Que Não Existe',         estagio: 3, magia_n: 3 },
    },
    magiasByKey: {
      geoprotecao:     { key: 'geoprotecao', nome: 'Geoproteção', duracao: '3 rodadas',
                         evocacao: '2 rodadas', alcance: 'Pessoal', descricao: 'Pedra.',
                         nivel_5: 'Reduz 24 de dano elemental da terra.' },
      piromanipulacao: { key: 'piromanipulacao', nome: 'Piromanipulação', duracao: '1 rodada',
                         evocacao: '1 rodada', alcance: '10 metros', descricao: 'Fogo.',
                         nivel_5: 'Causa 12 de dano elemental de fogo.' },
      toque_gelido:    { key: 'toque_gelido', nome: 'Toque Gélido', duracao: 'Instantânea',
                         evocacao: 'Instantânea', alcance: 'Toque', descricao: 'Gelo.',
                         nivel_9: 'Cause 36 de dano base.' },
    },
    catalogoBySlug: {},
  };
  const cri = (id) => ({ tipo: 'criatura', ref_id: id, inst_id: 'criatura:' + id, nome: 'X' });

  it('resolve os nomes separados por vírgula em magias do catálogo', () => {
    expect(M.magiasConhecidasDoAtor(cri(10), CAT).map((x) => x.key).sort())
      .toEqual(['geoprotecao', 'piromanipulacao']);
  });

  it('o ESTÁGIO é o nível de todas as magias da criatura (magia_n não conta)', () => {
    M.magiasConhecidasDoAtor(cri(10), CAT).forEach((x) => expect(x.nivel).toBe(5));
  });

  it('estágio acima de 9 conjura no 9, o topo da escada', () => {
    expect(M.magiasConhecidasDoAtor(cri(11), CAT)[0].nivel).toBe(9);
  });

  it('nivelMagiaDeCriatura: o degrau 1/3/5/7/9 mais alto que o estágio alcança', () => {
    const n = window.nivelMagiaDeCriatura;
    expect([1, 2, 3, 4, 6, 7, 8, 9, 10, 27].map(n)).toEqual([1, 1, 3, 3, 5, 7, 7, 9, 9, 9]);
    expect(n(null)).toBe(1);
    expect(n(0)).toBe(1);
  });

  it('criatura NÃO paga karma — a tabela nem tem a coluna', () => {
    M.magiasConhecidasDoAtor(cri(10), CAT).forEach((x) => expect(x.custo_karma).toBe(0));
  });

  it('a magia ofensiva da criatura entra na aba Magia, no nível dela', () => {
    const lista = M.magiasOfensivasDoAtor(cri(11), CAT);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ key: 'toque_gelido', nivel: 9, dano: 36, custo_karma: 0 });
  });

  it('a magia de proteção da criatura entra na aba Apoio', () => {
    const lista = M.magiasDeApoioDoAtor(cri(10), CAT);
    expect(lista.map((m) => m.key)).toEqual(['geoprotecao']);
    expect(lista[0].nivel).toBe(5);
  });

  it('a magia de dano NÃO aparece na aba Apoio da criatura', () => {
    expect(M.magiasDeApoioDoAtor(cri(10), CAT).map((m) => m.key)).not.toContain('piromanipulacao');
  });

  it('criatura sem magia devolve lista vazia', () => {
    expect(M.magiasConhecidasDoAtor(cri(12), CAT)).toEqual([]);
  });

  it('nome que não casa com o catálogo é ignorado, sem lançar', () => {
    // Mesmo fallback de magia sem entrada no registro: some da lista mecânica
    // e continua no texto do card, para o Mestre narrar.
    expect(M.magiasConhecidasDoAtor(cri(13), CAT)).toEqual([]);
  });

  it('criatura fora do criById não quebra', () => {
    expect(M.magiasConhecidasDoAtor(cri(999), CAT)).toEqual([]);
  });

  it('o casamento por nome ignora caixa e espaços', () => {
    const catEspacos = { ...CAT, criById: { 20: { id: 20, magia: '  geoproteção ,PIROMANIPULAÇÃO', estagio: 5 } } };
    expect(M.magiasConhecidasDoAtor(cri(20), catEspacos).map((x) => x.key).sort())
      .toEqual(['geoprotecao', 'piromanipulacao']);
  });

  it('PJ continua funcionando exatamente como antes', () => {
    const catPj = { ...CAT, pjById: { 7: { id: 7, magias: { toque_gelido: 5 } } } };
    const lista = M.magiasConhecidasDoAtor({ tipo: 'pj', ref_id: 7 }, catPj);
    expect(lista[0]).toMatchObject({ key: 'toque_gelido', nivel: 9, custo_karma: 9 });
  });
});
