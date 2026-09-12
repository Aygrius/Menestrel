/* ============================================================
   magia-efeitos.test.js — a aplicação do efeito de magia
   ============================================================
   Espelha tecnica-efeitos.test.js: o registro diz a forma, esta suíte
   verifica o que chega no participante.

   A regra de NÃO ACUMULAR é a mesma decisão 7 do spec das técnicas, pelo
   mesmo motivo: sem ela, lançar Bênção cinco vezes empilha cinco bônus de
   coluna e cinco empréstimos de EH no mesmo alvo.

   Spec: docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
// constants.jsx entra por FANTASY_MONTHS: o calendário fantasy é quem sabe que
// o ano tem 361 dias, e a cura natural de Doenças conta nele.
import '../01-core/constants.jsx';
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
  expect(M.aplicarEfeitoMagia).toBeTypeOf('function');
});

const alvo = (over = {}) => ({
  inst_id: 'a1', nome: 'Alvo', tipo: 'pj', raca: 'Humano',
  eh: 10, eh_max: 10, ar: 5, ar_max: 5, ef: 20, ef_max: 20, res: 3,
  rf: 2, rm: 2, vb: 10, status: 'ativo', status_temp: [], ...over,
});

// Objetos de catálogo montados à mão, com os textos LITERAIS do banco.
const BENCAO = { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                 nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.',
                 nivel_5: 'Aumenta 3 colunas de ataque e 15 de energia heroica.' };
const VELOCIDADE = { key: 'velocidade', nome: 'Velocidade', duracao: '5 rodadas',
                     nivel_1: 'Aumenta 2 de velocidade.' };
const AURA = { key: 'aura_divina', nome: 'Aura Divina', duracao: '1 hora',
               nivel_1: 'A área reduz 1 coluna de ataque.' };
const ARQUEIRISMO = { key: 'arqueirismo', nome: 'Arqueirismo', duracao: '2 rodadas',
                      nivel_1: 'Aumenta 4 colunas de ataque para arco.' };
const SUPER_RES = { key: 'super_resistencia', nome: 'Super Resistência', duracao: '10 rodadas',
                    nivel_1: 'Aumenta 1 de resistência física e 1 de resistência mágica.' };
const PIROPROT = { key: 'piroprotecao', nome: 'Piroproteção', duracao: '3 rodadas',
                   nivel_1: 'Reduz 16 de dano elemental de fogo.' };

describe('aplicarEfeitoMagia — o básico', () => {
  it('Bênção grava os DOIS efeitos sob o mesmo id', () => {
    const r = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    const meus = r.status_temp.filter((s) => s.id === 'mag_bencao');
    expect(meus).toHaveLength(2);
    expect(meus.map((s) => s.efeito.tipo).sort()).toEqual(['mod_ataque', 'mod_eh_temp']);
  });

  it('o valor vem do NÍVEL, não de um número fixo', () => {
    const col = (p) => p.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.valor;
    expect(col(M.aplicarEfeitoMagia(alvo(), BENCAO, 1))).toBe(1);
    expect(col(M.aplicarEfeitoMagia(alvo(), BENCAO, 5))).toBe(3);
  });

  it('a duração vem do banco, não do registro', () => {
    expect(M.aplicarEfeitoMagia(alvo(), VELOCIDADE, 1).status_temp[0].rodadas_rest).toBe(5);
  });

  it('duração mais longa que a batalha persiste até o fim (rodadas_rest null)', () => {
    // "1 hora" é mais longo que qualquer batalha: decrementarStatusTemp
    // mantém rodadas_rest null pra sempre.
    expect(M.aplicarEfeitoMagia(alvo(), AURA, 1).status_temp[0].rodadas_rest).toBeNull();
  });

  it('o sinal do registro vira o sinal do valor — Aura Divina é debuff', () => {
    expect(M.aplicarEfeitoMagia(alvo(), AURA, 1).status_temp[0].efeito.valor).toBe(-1);
  });

  it('Super Resistência grava rf e rm separados', () => {
    const r = M.aplicarEfeitoMagia(alvo(), SUPER_RES, 1);
    expect(r.status_temp.map((s) => s.efeito.tipo).sort()).toEqual(['mod_rf', 'mod_rm']);
  });

  it('a restrição de arma viaja NO efeito, não no registro', () => {
    // Ativar Arqueirismo e trocar o arco por uma espada não pode manter o
    // bônus — somaModAtaque consulta ef.grupos a cada golpe.
    expect(M.aplicarEfeitoMagia(alvo(), ARQUEIRISMO, 1).status_temp[0].efeito.grupos)
      .toEqual(['AR']);
  });

  it('reducao_dano carrega o elemento', () => {
    const ef = M.aplicarEfeitoMagia(alvo(), PIROPROT, 1).status_temp[0].efeito;
    expect(ef).toMatchObject({ tipo: 'reducao_dano', valor: 16, elemento: 'fogo' });
  });

  it('magia sem entrada no registro não muda nada', () => {
    const p = alvo();
    expect(M.aplicarEfeitoMagia(p, { key: 'ressurreicao', nome: 'Ressurreição' }, 1)).toBe(p);
  });

  it('magia no registro cujo texto do nível não tem a unidade não inventa zero', () => {
    const p = alvo();
    expect(M.aplicarEfeitoMagia(p, { key: 'bencao', nome: 'Bênção', nivel_1: 'Texto trocado.' }, 1))
      .toBe(p);
  });
});

describe('mod_eh_temp — levanta o teto e enche junto', () => {
  it('Bênção sobe eh e eh_max', () => {
    const r = M.aplicarEfeitoMagia(alvo({ eh: 10, eh_max: 10 }), BENCAO, 1);
    expect({ eh: r.eh, eh_max: r.eh_max }).toEqual({ eh: 15, eh_max: 15 });
  });

  it('relançar NÃO empilha o teto', () => {
    // Devolve o empréstimo antigo antes de emprestar de novo — mesmo cuidado
    // de aplicarEfeitoTecnica, e o mesmo bug evitado.
    let p = M.aplicarEfeitoMagia(alvo({ eh: 10, eh_max: 10 }), BENCAO, 1);
    p = M.aplicarEfeitoMagia(p, BENCAO, 1);
    expect(p.eh_max).toBe(15);
  });

  it('subir de nível no relançamento ajusta o teto pela diferença', () => {
    let p = M.aplicarEfeitoMagia(alvo({ eh: 10, eh_max: 10 }), BENCAO, 1);  // +5
    p = M.aplicarEfeitoMagia(p, BENCAO, 5);                                  // +15
    expect(p.eh_max).toBe(25);
  });
});

describe('reaplicar RENOVA, não acumula', () => {
  it('a segunda Bênção substitui a primeira', () => {
    let p = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    p = { ...p, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 2 })) };
    const r = M.aplicarEfeitoMagia(p, BENCAO, 1);
    const meus = r.status_temp.filter((s) => s.id === 'mag_bencao');
    expect(meus).toHaveLength(2);              // não viraram 4
    expect(meus[0].rodadas_rest).toBe(10);     // renovou
  });

  it('magia diferente no mesmo alvo CONVIVE', () => {
    let p = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    p = M.aplicarEfeitoMagia(p, VELOCIDADE, 1);
    expect(p.status_temp.filter((s) => s.id === 'mag_bencao')).toHaveLength(2);
    expect(p.status_temp.filter((s) => s.id === 'mag_velocidade')).toHaveLength(1);
  });

  it('não mexe em status de TÉCNICA no mesmo alvo', () => {
    const p = alvo({ status_temp: [{ id: 'tec_mira', nome: 'Mira', rodadas_rest: 1,
                                     efeito: { tipo: 'mod_ataque', valor: 3 } }] });
    const r = M.aplicarEfeitoMagia(p, BENCAO, 1);
    expect(r.status_temp.find((s) => s.id === 'tec_mira')).toBeDefined();
  });
});

describe('a magia conversa com o motor que já existia', () => {
  it('mod_ataque de magia entra em somaModAtaque', () => {
    const r = M.aplicarEfeitoMagia(alvo(), BENCAO, 5);
    expect(window.MotorBatalha.somaModAtaque
      ? window.MotorBatalha.somaModAtaque(r, 'CM')
      : r.status_temp.filter((s) => s.efeito.tipo === 'mod_ataque')[0].efeito.valor).toBe(3);
  });

  it('a magia expira pela virada de rodada, como qualquer status', () => {
    let p = M.aplicarEfeitoMagia(alvo(), ARQUEIRISMO, 1);   // 2 rodadas
    p = M.processarViradaDeRodada(p).participante;
    expect(p.status_temp[0].rodadas_rest).toBe(1);
    p = M.processarViradaDeRodada(p).participante;
    expect(p.status_temp).toHaveLength(0);
  });

  it('a EH emprestada volta na expiração, via expirarEhTemp', () => {
    let p = M.aplicarEfeitoMagia(alvo({ eh: 10, eh_max: 10 }), BENCAO, 1);
    expect(p.eh_max).toBe(15);
    for (let i = 0; i < 10; i++) p = M.processarViradaDeRodada(p).participante;
    expect(p.eh_max).toBe(10);
  });
});

describe('cura_pool — preenche o pool, respeitando o teto', () => {
  it('Curas Espirituais enche a EH até o máximo', () => {
    expect(M.aplicarCuraPool(alvo({ eh: 2, eh_max: 10 }), 'eh', 20).eh).toBe(10);
  });

  it('Curas Físicas enche a EF', () => {
    expect(M.aplicarCuraPool(alvo({ ef: 5, ef_max: 20 }), 'ef', 4).ef).toBe(9);
  });

  it('NÃO ultrapassa o máximo — é a diferença para mod_eh_temp', () => {
    const r = M.aplicarCuraPool(alvo({ eh: 9, eh_max: 10 }), 'eh', 50);
    expect({ eh: r.eh, eh_max: r.eh_max }).toEqual({ eh: 10, eh_max: 10 });
  });

  it('inverter transforma a cura em dano no mesmo pool', () => {
    // "Esta magia possui o efeito inverso em mortos-vivos".
    expect(M.aplicarCuraPool(alvo({ eh: 10, eh_max: 10 }), 'eh', 4, { inverter: true }).eh).toBe(6);
  });

  it('invertida não deixa o pool negativo', () => {
    expect(M.aplicarCuraPool(alvo({ eh: 2, eh_max: 10 }), 'eh', 20, { inverter: true }).eh).toBe(0);
  });

  it('curar quem desmaiou pode reativar — statusPorPools decide', () => {
    const r = M.aplicarCuraPool(
      alvo({ eh: 0, eh_max: 10, ef: 1, ef_max: 20, status: 'desmaiado' }), 'eh', 5);
    expect({ eh: r.eh, status: r.status }).toEqual({ eh: 5, status: 'ativo' });
  });

  it('pool inválido não faz nada, sem lançar', () => {
    const p = alvo();
    expect(M.aplicarCuraPool(p, 'ar', 5)).toBe(p);
  });
});

describe('dreno_eh — Toque Gélido ultrapassa o máximo de propósito', () => {
  it('25% do dano que chegou na EF vira EH no conjurador', () => {
    expect(M.aplicarDrenoEh(alvo({ eh: 10, eh_max: 10 }), 12).eh).toBe(13);
  });

  it('PASSA do máximo — o texto da magia é explícito', () => {
    const c = alvo({ eh: 10, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 100).eh).toBeGreaterThan(c.eh_max);
  });

  it('arredonda para baixo', () => {
    expect(M.aplicarDrenoEh(alvo({ eh: 0, eh_max: 10 }), 7).eh).toBe(1);  // floor(1.75)
  });

  it('dano zero na EF não drena nada', () => {
    const c = alvo({ eh: 10, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 0)).toBe(c);
  });
});

describe('restrição de alvo por raça — regra, não sugestão', () => {
  const cri = (raca) => ({ inst_id: 'x', tipo: 'criatura', raca, status: 'ativo' });
  const pj  = () => ({ inst_id: 'p', tipo: 'pj', raca: 'Humano', status: 'ativo' });

  it('Aura Divina aceita Demônio e Morto', () => {
    expect(M.alvoPermitidoParaMagia(cri('Demônio'), 'aura_divina').pode).toBe(true);
    expect(M.alvoPermitidoParaMagia(cri('Morto'), 'aura_divina').pode).toBe(true);
  });

  it('Aura Divina RECUSA Animal, com motivo', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal'), 'aura_divina'))
      .toEqual({ pode: false, motivo: 'raca' });
  });

  it('Aura Divina nunca acerta um PJ', () => {
    // Um PJ tem raça de personagem (Humano, Elfo…), nunca Demônio ou Morto.
    // A restrição simplesmente não dispara sobre personagens — e está certo.
    expect(M.alvoPermitidoParaMagia(pj(), 'aura_divina').pode).toBe(false);
  });

  it('Força Mútua só aceita Animal', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal'), 'forca_mutua').pode).toBe(true);
    expect(M.alvoPermitidoParaMagia(cri('Dragão'), 'forca_mutua').pode).toBe(false);
  });

  it('magia sem so_racas aceita qualquer alvo', () => {
    expect(M.alvoPermitidoParaMagia(cri('Dragão'), 'bencao').pode).toBe(true);
    expect(M.alvoPermitidoParaMagia(pj(), 'bencao').pode).toBe(true);
  });

  it('magia fora do registro aceita qualquer alvo', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal'), 'ressurreicao').pode).toBe(true);
  });

  it('alvo sem raça não é bloqueado por engano em magia sem restrição', () => {
    expect(M.alvoPermitidoParaMagia({ inst_id: 'x' }, 'bencao').pode).toBe(true);
  });
});

describe('inverte_em — Curas Espirituais em morto-vivo', () => {
  const cri = (raca) => ({ inst_id: 'x', tipo: 'criatura', raca, status: 'ativo' });

  it('inverte em Morto', () => {
    expect(M.efeitoInverteNoAlvo(cri('Morto'), 'curas_espirituais')).toBe(true);
  });

  it('não inverte em Animal', () => {
    expect(M.efeitoInverteNoAlvo(cri('Animal'), 'curas_espirituais')).toBe(false);
  });

  it('Curas Físicas não tem inversão', () => {
    expect(M.efeitoInverteNoAlvo(cri('Morto'), 'curas_fisicas')).toBe(false);
  });

  it('a cura invertida queima EH em vez de restaurar', () => {
    const morto = { ...alvo(), raca: 'Morto', eh: 10, eh_max: 10 };
    const inverte = M.efeitoInverteNoAlvo(morto, 'curas_espirituais');
    expect(M.aplicarCuraPool(morto, 'eh', 4, { inverter: inverte }).eh).toBe(6);
  });
});

describe('teto de alvos', () => {
  it.each([
    ['dardos_de_gelo', 3], ['dardos_de_luz', 2], ['raio_eletrico', 2],
    ['meteoros', 5], ['bola_de_fogo', 1], ['bencao', 1],
  ])('%s → %s', (key, n) => {
    expect(M.tetoDeAlvosMagia(key)).toBe(n);
  });

  it('Aura Divina não tem teto', () => {
    expect(M.tetoDeAlvosMagia('aura_divina')).toBeNull();
  });

  it('magia fora do registro cai em alvo único', () => {
    expect(M.tetoDeAlvosMagia('ressurreicao')).toBe(1);
  });
});

describe('área: o raio vem depois, e o código já espera por ele', () => {
  /* O usuário informou em 11/09/2026 que vai acrescentar raio de efeito a Bola
     de Fogo e Meteoros. Para que isso seja PREENCHIMENTO DE BANCO e não
     mudança de código, a seleção lê um campo `raio` que ainda não existe na
     tabela. Os dois ramos são testados agora. Spec §6.3. */
  const noTab = (x, over = {}) => ({
    inst_id: 'p' + x, tipo: 'criatura', raca: 'Animal',
    status: 'ativo', pos: { x, y: 1 }, ...over,
  });
  const parts = [noTab(1), noTab(4), noTab(40)];

  it('SEM raio no catálogo devolve null — a seleção fica manual', () => {
    expect(M.alvosDeArea({ key: 'bola_de_fogo', alcance: '20 metros' }, { x: 1, y: 1 }, parts))
      .toBeNull();
  });

  it('raio 0 também é seleção manual', () => {
    expect(M.alvosDeArea({ key: 'bola_de_fogo', raio: 0 }, { x: 1, y: 1 }, parts)).toBeNull();
  });

  it('COM raio pega quem está dentro e ignora quem está fora', () => {
    const r = M.alvosDeArea({ key: 'bola_de_fogo', raio: 2 }, { x: 1, y: 1 }, parts);
    expect(r.map((p) => p.inst_id)).toEqual(['p1', 'p4']);
  });

  it('COM raio ignora morto, desistiu e ausente', () => {
    const mistos = [
      noTab(1, { status: 'morto' }), noTab(2, { status: 'desistiu' }),
      noTab(3, { ausente: true }),   noTab(4),
    ];
    const r = M.alvosDeArea({ key: 'bola_de_fogo', raio: 20 }, { x: 1, y: 1 }, mistos);
    expect(r.map((p) => p.inst_id)).toEqual(['p4']);
  });

  it('a área RESPEITA a restrição de raça', () => {
    // Aura Divina com raio não pode pegar o companheiro animal do grupo.
    const mistos = [noTab(1, { raca: 'Demônio' }), noTab(2, { raca: 'Animal' })];
    const r = M.alvosDeArea({ key: 'aura_divina', raio: 20 }, { x: 1, y: 1 }, mistos);
    expect(r.map((p) => p.raca)).toEqual(['Demônio']);
  });
});

describe('resumoEfeitoMagia — a prévia deixou de ser só velocidade', () => {
  /* A linha de efeito da aba Apoio era `mod_vb + " de velocidade"`, fixo. Com
     a Fase 1, Bênção chegava nessa linha e aparecia como "0 de velocidade" —
     afirmação ERRADA, pior que não mostrar nada. */
  const apoio = (key, nivel, catalogo) => ({ key, nome: key, nivel, catalogo });

  it('Bênção lista os dois efeitos', () => {
    const r = M.resumoEfeitoMagia(apoio('bencao', 1, BENCAO), null);
    expect(r).toEqual(['+1 coluna de ataque', '+5 de energia heroica']);
  });

  it('Velocidade continua dizendo velocidade', () => {
    expect(M.resumoEfeitoMagia(apoio('velocidade', 1, VELOCIDADE), null))
      .toEqual(['+2 de velocidade']);
  });

  it('Aura Divina mostra o sinal negativo do registro', () => {
    expect(M.resumoEfeitoMagia(apoio('aura_divina', 1, AURA), null))
      .toEqual(['-1 coluna de ataque']);
  });

  it('Super Resistência lista as duas resistências', () => {
    expect(M.resumoEfeitoMagia(apoio('super_resistencia', 1, SUPER_RES), null))
      .toEqual(['+1 de resistência física', '+1 de resistência mágica']);
  });

  it('Piroproteção nomeia o elemento', () => {
    expect(M.resumoEfeitoMagia(apoio('piroprotecao', 1, PIROPROT), null))
      .toEqual(['−16 de redução de dano (fogo)']);
  });

  it('cura diz "restaura", não "aumenta"', () => {
    const CURAS = { key: 'curas_espirituais', nome: 'Curas Espirituais',
                    duracao: 'Instantânea', nivel_1: 'Restaura 20 de energia heroica.' };
    expect(M.resumoEfeitoMagia(apoio('curas_espirituais', 1, CURAS), null))
      .toEqual(['restaura 20 de energia heroica']);
  });

  it('magia fora do registro devolve lista vazia — a UI cai no fallback', () => {
    expect(M.resumoEfeitoMagia(apoio('ressurreicao', 1, {}), null)).toEqual([]);
  });
});

describe('textoEfeitoMagia — o que vai pro log da mesa', () => {
  it('junta os efeitos numa frase', () => {
    expect(M.textoEfeitoMagia({ key: 'bencao', nome: 'Bênção', nivel: 1, catalogo: BENCAO }))
      .toBe('+1 coluna de ataque, +5 de energia heroica');
  });

  it('marca o que ficou PARCIAL — área escolhida pelo Mestre', () => {
    /* Bola de Fogo, não Aura Divina: a aura deixou de ser parcial em
       12/09/2026, quando se viu que o raio dela é o próprio alcance. Quem
       continua parcial é o PROJÉTIL de área, cujo raio não está no catálogo. */
    const BOLA_LOG = { key: 'bola_de_fogo', nome: 'Bola de Fogo', nivel: 1,
                       catalogo: { key: 'bola_de_fogo', duracao: 'Instantânea',
                                   nivel_1: 'Causa 12 de dano elemental de fogo.' } };
    expect(M.textoEfeitoMagia(BOLA_LOG)).toMatch(/alvos de área escolhidos pelo Mestre/);
  });

  it('Aura Divina NÃO é mais marcada como parcial', () => {
    const AURA_LOG = { key: 'aura_divina', nome: 'Aura Divina', nivel: 1, catalogo: AURA };
    expect(M.textoEfeitoMagia(AURA_LOG)).not.toMatch(/escolhidos pelo Mestre/);
  });

  it('marca o vínculo não conferido de Força Mútua', () => {
    const FM = { key: 'forca_mutua', nome: 'Força Mútua', nivel: 1,
                 catalogo: { key: 'forca_mutua', duracao: '1 dia',
                             nivel_1: 'Aumenta 1 coluna de ataque.' } };
    expect(M.textoEfeitoMagia(FM)).toMatch(/vínculo de Elo Animal não conferido/);
  });

  it('magia fora do registro cai no formato antigo', () => {
    expect(M.textoEfeitoMagia({ key: 'distracao', nome: 'Distração', mod_vb: -4 }))
      .toBe('-4 de velocidade');
  });
});

describe('a cura está LIGADA à aba Apoio', () => {
  /* aplicarEfeitoMagia ignora efeito instantâneo de propósito — cura não é
     status_temp. Mas alguém tem que aplicá-la, senão Curas Físicas vira uma
     magia que gasta karma e não faz nada. aplicarEfeitoApoio é a ponte. */
  const CURAS_EF = { key: 'curas_fisicas', nome: 'Curas Físicas', duracao: 'Instantânea',
                     nivel_1: 'Restaura 4 de energia física.' };
  const CURAS_EH = { key: 'curas_espirituais', nome: 'Curas Espirituais', duracao: 'Instantânea',
                     nivel_1: 'Restaura 20 de energia heroica.' };
  const apoio = (cat) => ({ key: cat.key, nome: cat.nome, nivel: 1, catalogo: cat });

  it('Curas Físicas restaura EF pela aba Apoio', () => {
    const r = M.aplicarEfeitoApoio(alvo({ ef: 5, ef_max: 20 }), apoio(CURAS_EF), 'c1');
    expect(r.ef).toBe(9);
  });

  it('Curas Espirituais restaura EH, respeitando o teto', () => {
    const r = M.aplicarEfeitoApoio(alvo({ eh: 2, eh_max: 10 }), apoio(CURAS_EH), 'c1');
    expect(r.eh).toBe(10);
  });

  it('em morto-vivo, Curas Espirituais QUEIMA a EH', () => {
    const morto = alvo({ raca: 'Morto', eh: 20, eh_max: 20 });
    expect(M.aplicarEfeitoApoio(morto, apoio(CURAS_EH), 'c1').eh).toBe(0);
  });

  it('cura NÃO deixa status_temp para trás', () => {
    const r = M.aplicarEfeitoApoio(alvo({ ef: 5, ef_max: 20 }), apoio(CURAS_EF), 'c1');
    expect(r.status_temp).toHaveLength(0);
  });

  it('magia que só dá buff não passa pela cura', () => {
    const r = M.aplicarEfeitoApoio(alvo(), { key: 'bencao', nome: 'Bênção', nivel: 1, catalogo: BENCAO }, 'c1');
    expect(r.ef).toBe(20);
  });
});

describe('dreno_eh — Toque Gélido converte o que chegou na EF', () => {
  /* A conta é sobre o dano que CHEGOU NA EF, não sobre o bruto: o texto
     condiciona ("se for um ataque na energia física do alvo"). Dano que a EH
     ou a armadura seguraram não drena nada. */
  const atacante = (over = {}) => ({ inst_id: 'c1', eh: 10, eh_max: 10, status_temp: [], ...over });
  const vitima = (over = {}) => ({
    inst_id: 'v1', eh: 0, eh_max: 0, ar: 0, ar_max: 0, res: 0,
    ef: 40, ef_max: 40, status: 'ativo', status_temp: [], ...over,
  });

  it('drena 25% do que furou até a EF', () => {
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima()], 0, 1, 12, false, null, true);
    expect(r[1].ef).toBe(28);      // levou 12
    expect(r[0].eh).toBe(13);      // ganhou floor(12 * 0,25)
  });

  it('sem a flag, não drena', () => {
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima()], 0, 1, 12, false, null, false);
    expect(r[0].eh).toBe(10);
  });

  it('dano contido pela EH do alvo não drena', () => {
    // Nada chegou na EF, então não houve "ataque na energia física".
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima({ eh: 50, eh_max: 50 })], 0, 1, 12, false, null, true);
    expect(r[1].ef).toBe(40);
    expect(r[0].eh).toBe(10);
  });

  it('o dreno PASSA do máximo do conjurador', () => {
    const r = M.aplicarGolpeEmAlvo([atacante({ eh: 10, eh_max: 10 }), vitima()], 0, 1, 40, false, null, true);
    expect(r[0].eh).toBeGreaterThan(10);
  });
});

describe('multi-alvo de magia usa a máquina do Golpe Giratório', () => {
  /* tetoDeAlvosMagia troca a FONTE do teto (registro da magia em vez do
     status_temp do atacante); a máquina a jusante — alvosExtrasEfetivos e
     aplicarGolpeEmAlvo — é a mesma e não mudou. */
  it('cada alvo resolve a PRÓPRIA proteção elemental', () => {
    const atacante = { inst_id: 'c1', status_temp: [] };
    const semProt = { inst_id: 'v1', eh: 0, eh_max: 0, ar: 0, ar_max: 0, res: 0,
                      ef: 40, ef_max: 40, status: 'ativo', status_temp: [] };
    const comProt = { ...semProt, inst_id: 'v2',
                      status_temp: [{ id: 'mag_piroprotecao',
                        efeito: { tipo: 'reducao_dano', valor: 10, elemento: 'fogo' } }] };
    let arr = [atacante, semProt, comProt];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 12, false, 'fogo');
    arr = M.aplicarGolpeEmAlvo(arr, 0, 2, 12, false, 'fogo');
    expect(arr[1].ef).toBe(28);   // 12 inteiros
    expect(arr[2].ef).toBe(38);   // 12 − 10 = 2
  });
});

describe('duracaoNoNivel — 21 magias põem a duração no TEXTO DO NÍVEL', () => {
  /* Defeito que o levantamento da Fase 2 expôs: duracaoEmRodadas trata
     'Variável' como CONCENTRAÇÃO, mas 21 magias usam 'Variável' na coluna com
     o sentido oposto — "a duração está no nível, e escala com ele". Medo seria
     lida como concentração perpétua em vez de 1 rodada.

     As outras 32 'Variável' não trazem duração no nível, e essas SIM são
     concentração. O discriminador é a frase existir no texto. */
  const MEDO = { key: 'medo', duracao: 'Variável',
                 nivel_1: 'A magia tem duração de 1 rodada.',
                 nivel_5: 'A magia tem duração de 3 rodadas.',
                 nivel_9: 'A magia tem duração de 5 rodadas.' };

  it('lê as rodadas do nível, não a coluna', () => {
    expect(M.duracaoNoNivel(MEDO, 1)).toMatchObject({ rodadas: 1, concentracao: false });
    expect(M.duracaoNoNivel(MEDO, 9)).toMatchObject({ rodadas: 5, concentracao: false });
  });

  it('marca que veio do nível', () => {
    expect(M.duracaoNoNivel(MEDO, 1).doNivel).toBe(true);
  });

  it('REGRESSÃO: duracaoEmRodadas sozinha diria concentração', () => {
    // É exatamente o erro que duracaoNoNivel evita.
    expect(M.duracaoEmRodadas(MEDO)).toEqual({ rodadas: null, concentracao: true });
  });

  it('tempo mais longo que a batalha vira "até o fim"', () => {
    const m = { duracao: 'Variável', nivel_1: 'A magia tem duração de 1 dia.' };
    expect(M.duracaoNoNivel(m, 1)).toMatchObject({ rodadas: null, concentracao: false });
  });

  it('"A magia é permanente" também', () => {
    const m = { duracao: 'Variável', nivel_9: 'A magia é permanente.' };
    expect(M.duracaoNoNivel(m, 9)).toMatchObject({ rodadas: null, concentracao: false });
  });

  it('nível SEM frase de duração cai na coluna — e aí Variável é concentração', () => {
    // Sono: 'Variável' na coluna e "Altera N condições do sono" no nível.
    const sono = { key: 'sono', duracao: 'Variável', nivel_1: 'Altera uma condição do sono.' };
    expect(M.duracaoNoNivel(sono, 1)).toMatchObject({ concentracao: true, doNivel: false });
  });

  it('as 25 da Fase 1 não mudam de leitura', () => {
    expect(M.duracaoNoNivel(BENCAO, 1)).toMatchObject({ rodadas: 10, doNivel: false });
    expect(M.duracaoNoNivel(AURA, 1)).toMatchObject({ rodadas: null, concentracao: false });
  });
});

describe('magias de CONTROLE — sem_acoes pela Fase 2', () => {
  const MEDO = { key: 'medo', nome: 'Medo', duracao: 'Variável',
                 nivel_1: 'A magia tem duração de 1 rodada.',
                 nivel_9: 'A magia tem duração de 5 rodadas.' };
  const SONO = { key: 'sono', nome: 'Sono', duracao: 'Variável',
                 nivel_1: 'Altera uma condição do sono.' };

  it('Medo grava sem_acoes com a duração do nível', () => {
    const r = M.aplicarEfeitoMagia(alvo(), MEDO, 1);
    expect(r.status_temp[0].efeito).toEqual({ tipo: 'sem_acoes', valor: true });
    expect(r.status_temp[0].rodadas_rest).toBe(1);
  });

  it('a duração escala com o nível', () => {
    expect(M.aplicarEfeitoMagia(alvo(), MEDO, 9).status_temp[0].rodadas_rest).toBe(5);
  });

  it('o alvo sob Medo perde a ação, e o motor JÁ sabia disso', () => {
    // sem_acoes não é primitiva nova: a Falha Crítica já a produzia, e
    // temAcaoRestante/proximoAtivo já a respeitavam. A Fase 2 só acrescenta
    // um produtor.
    const r = M.aplicarEfeitoMagia(alvo({ pa_rest: 2 }), MEDO, 1);
    expect(window.MotorBatalha.statusTemEfeito
      ? window.MotorBatalha.statusTemEfeito(r, 'sem_acoes')
      : r.status_temp.some((s) => s.efeito.tipo === 'sem_acoes')).toBe(true);
  });

  it('Sono é concentração: o conjurador sustenta e a âncora fica no status', () => {
    const r = M.aplicarEfeitoMagia(alvo(), SONO, 1, { fonteInstId: 'c1' });
    expect(r.status_temp[0].rodadas_rest).toBeNull();
    expect(r.status_temp[0].concentracao).toEqual({ ator: 'c1', magia_key: 'sono' });
  });

  it('acordar o alvo: quebrar a concentração do conjurador tira o sono', () => {
    const dormindo = M.aplicarEfeitoMagia(alvo(), SONO, 1, { fonteInstId: 'c1' });
    const r = M.quebrarConcentracao([dormindo], 'c1');
    expect(r[0].status_temp).toHaveLength(0);
  });

  it('reaplicar Medo renova em vez de empilhar', () => {
    let p = M.aplicarEfeitoMagia(alvo(), MEDO, 9);
    p = M.aplicarEfeitoMagia(p, MEDO, 9);
    expect(p.status_temp.filter((s) => s.id === 'mag_medo')).toHaveLength(1);
  });
});

describe('Esconjuração — raça E teto de estágio', () => {
  const ESC = { key: 'esconjuracao', nome: 'Esconjuração', duracao: '10 rodadas',
                nivel_1: 'Afeta criaturas de estágio 1.',
                nivel_5: 'Afeta criaturas de até estágio 9.' };
  const cri = (raca, estagio) => ({ inst_id: 'x', tipo: 'criatura', raca, estagio, status: 'ativo' });

  it('aceita morto-vivo dentro do teto', () => {
    expect(M.alvoPermitidoParaMagia(cri('Morto', 1), 'esconjuracao', ESC, 1).pode).toBe(true);
  });

  it('recusa criatura ACIMA do teto, com motivo próprio', () => {
    expect(M.alvoPermitidoParaMagia(cri('Morto', 5), 'esconjuracao', ESC, 1))
      .toEqual({ pode: false, motivo: 'estagio' });
  });

  it('o teto sobe com o nível', () => {
    expect(M.alvoPermitidoParaMagia(cri('Demônio', 9), 'esconjuracao', ESC, 5).pode).toBe(true);
  });

  it('raça errada é recusada antes do estágio', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal', 1), 'esconjuracao', ESC, 1).motivo).toBe('raca');
  });

  it('snapshot ANTIGO sem estagio não bloqueia — o Mestre arbitra', () => {
    // Recusar um alvo que talvez fosse válido é pior que deixar passar e
    // marcar. O campo entrou no snapshot em 12/09/2026.
    expect(M.alvoPermitidoParaMagia(cri('Morto', null), 'esconjuracao', ESC, 1).pode).toBe(true);
  });

  it('sem magia/nivel na chamada, só a raça é conferida', () => {
    // As chamadas de UI que só filtram raça continuam valendo.
    expect(M.alvoPermitidoParaMagia(cri('Morto', 99), 'esconjuracao').pode).toBe(true);
  });
});

describe('Aura Divina é AURA, não projétil de área', () => {
  /* Correção de 12/09/2026, apontada pelo usuário: "25 metros a partir de quem
     evoca a magia é o seu alcance". O texto confirma — "envolve seu corpo em
     uma aura que repele demônios e mortos-vivos A PARTIR DE SI".

     O centro é o conjurador e o raio é o próprio `alcance`, que o catálogo já
     traz. Ela estava marcada como área MANUAL esperando a coluna `raio`, e
     nunca precisou dela: quem precisa é o projétil de área (Bola de Fogo,
     Meteoros), cujo centro é uma célula escolhida. */
  const AURA_CAT = { key: 'aura_divina', nome: 'Aura Divina', alcance: '25 metros',
                     duracao: '1 hora', nivel_1: 'A área reduz 1 coluna de ataque.' };
  const noTab = (x, over = {}) => ({
    inst_id: 'p' + x, tipo: 'criatura', raca: 'Morto', estagio: 1,
    status: 'ativo', pos: { x, y: 1 }, status_temp: [], ...over,
  });
  const conjurador = { inst_id: 'c1', tipo: 'pj', raca: 'Humano', nome: 'Clériga',
                       pos: { x: 1, y: 1 }, status: 'ativo', status_temp: [] };

  it('pega todos os válidos no raio do ALCANCE, sem pedir raio nenhum', () => {
    const r = M.alvosDeAura(AURA_CAT, conjurador, [conjurador, noTab(5), noTab(60)], 1);
    expect(r.map((p) => p.inst_id)).toEqual(['p5']);
  });

  it('NÃO pega o próprio conjurador', () => {
    const r = M.alvosDeAura(AURA_CAT, conjurador, [conjurador, noTab(5)], 1);
    expect(r.find((p) => p.inst_id === 'c1')).toBeUndefined();
  });

  it('respeita a restrição de raça', () => {
    const r = M.alvosDeAura(AURA_CAT, conjurador,
      [conjurador, noTab(5, { raca: 'Animal' }), noTab(6, { raca: 'Demônio' })], 1);
    expect(r.map((p) => p.raca)).toEqual(['Demônio']);
  });

  it('sem posição no tabuleiro devolve null — a UI cai em alvo único', () => {
    expect(M.alvosDeAura(AURA_CAT, { ...conjurador, pos: null }, [conjurador], 1)).toBeNull();
  });

  it('o registro marca `area: aura`, e não `parcial: area`', () => {
    const reg = window.MAGIA_EFEITO_MAP.aura_divina;
    expect(reg.area).toBe('aura');
    expect(reg.parcial).toBeUndefined();
  });

  it('Bola de Fogo e Meteoros CONTINUAM parciais — o raio delas não existe', () => {
    // O centro delas é uma célula escolhida, não o conjurador; o raio virá da
    // coluna que o usuário vai criar.
    expect(window.MAGIA_EFEITO_MAP.bola_de_fogo.parcial).toBe('area');
    expect(window.MAGIA_EFEITO_MAP.meteoros.parcial).toBe('area');
    expect(window.MAGIA_EFEITO_MAP.bola_de_fogo.area).toBeUndefined();
  });

  it('REGRESSÃO: "sem direito a resistência mágica" NÃO pede rolagem', () => {
    /* O texto diz que as criaturas "sofrem penalidades … sem direito a
       resistência mágica, pois não são afetadas diretamente pela magia".
       exigeResistencia ancora na frase "teste de resistência mágica", que não
       aparece aqui — então devolve null. Se alguém alargar o padrão, Aura
       Divina passa a exigir um dado que a magia não tem. */
    expect(M.exigeResistencia({ descricao:
      'Esta magia envolve seu corpo em uma aura que repele demônios e mortos-vivos a partir de si. Essas criaturas sofrem penalidades ao atacar (mesmo à distância) qualquer um dentro da área protegida, sem direito a resistência mágica, pois não são afetadas diretamente pela magia.' }))
      .toBeNull();
  });
});

describe('passoDeApoio aplica a aura em TODOS os atingidos', () => {
  const AURA = { key: 'aura_divina', nome: 'Aura Divina', alcance: '25 metros',
                 duracao: '1 hora', evocacao: 'Instantânea',
                 nivel_1: 'A área reduz 1 coluna de ataque.' };
  const apoio = { key: 'aura_divina', nome: 'Aura Divina', nivel: 1, catalogo: AURA };
  const morto = (x) => ({ inst_id: 'm' + x, tipo: 'criatura', raca: 'Morto', estagio: 1,
                          pos: { x, y: 1 }, status: 'ativo', status_temp: [] });
  const clerigo = { inst_id: 'c1', tipo: 'pj', nome: 'Clériga', raca: 'Humano',
                    pos: { x: 1, y: 1 }, karma: 9, pa_rest: 1, status: 'ativo', status_temp: [] };

  it('dois mortos-vivos no raio recebem o debuff de uma vez', () => {
    const r = M.passoDeApoio([clerigo, morto(5), morto(8)], 0, 1, apoio, 1, false);
    expect(r.fase).toBe('resolveu');
    expect(r.participantes[1].status_temp[0].efeito).toMatchObject({ tipo: 'mod_ataque', valor: -1 });
    expect(r.participantes[2].status_temp[0].efeito).toMatchObject({ tipo: 'mod_ataque', valor: -1 });
  });

  it('o log registra quem foi atingido', () => {
    const r = M.passoDeApoio([clerigo, morto(5), morto(8)], 0, 1, apoio, 1, false);
    expect(r.atingidos).toHaveLength(2);
  });

  it('quem está FORA do raio não é afetado', () => {
    const r = M.passoDeApoio([clerigo, morto(5), morto(60)], 0, 1, apoio, 1, false);
    expect(r.participantes[2].status_temp).toHaveLength(0);
  });

  it('a clériga não se debuffa', () => {
    const r = M.passoDeApoio([clerigo, morto(5)], 0, 1, apoio, 1, false);
    expect(r.participantes[0].status_temp).toHaveLength(0);
  });

  it('ninguém válido no raio: a magia sai e não pega em ninguém', () => {
    const r = M.passoDeApoio([clerigo, morto(60)], 0, 1, apoio, 1, false);
    expect(r.fase).toBe('perdeu');
  });
});

describe('Oferenda — a magia seguinte sai ampliada', () => {
  /* ERRO QUE ESTE BLOCO EXISTE PARA NÃO DEIXAR VOLTAR.

     Oferenda entrou no registro com mod_nivel_magia, sem_cura_ef e o custo de
     EF — e NADA consumia o primeiro. O status era criado e a próxima magia
     saía no nível de sempre: a magia gastava sangue e não fazia nada.

     É o mesmo padrão de falha registrado no plano ("funções corretas que nada
     chamava"), repetido. Daí os testes serem de ponta a ponta, e não só da
     função pura. */
  const OFERENDA = { key: 'oferenda', nome: 'Oferenda', duracao: '10 rodadas',
                     evocacao: 'Instantânea', alcance: 'Pessoal',
                     nivel_1: 'Aumenta 2 níveis da magia e reduz 1 de energia física.' };
  const CAT = {
    pjById: { 7: { id: 7, magias: { oferenda: 1, bola_de_fogo: 1 } } },
    magiasByKey: {
      oferenda: OFERENDA,
      bola_de_fogo: { key: 'bola_de_fogo', nome: 'Bola de Fogo', duracao: 'Instantânea',
                      evocacao: 'Instantânea', alcance: '20 metros',
                      nivel_1: 'Causa 12 de dano elemental de fogo.',
                      nivel_3: 'Causa 20 de dano elemental de fogo.' },
    },
    catalogoBySlug: {},
  };
  const ator = (over = {}) => ({ tipo: 'pj', ref_id: 7, inst_id: 'p7', nome: 'Clérigo',
    status_temp: [], ef: 20, ef_max: 20, eh: 10, eh_max: 10, karma: 9, ...over });

  it('sem Oferenda, a magia sai no nível comprado', () => {
    const lista = M.magiasOfensivasDoAtor(ator(), CAT);
    expect(lista.find((m) => m.key === 'bola_de_fogo').nivel).toBe(1);
  });

  it('COM Oferenda ativa, a próxima magia sobe de nível', () => {
    const comBonus = ator({ status_temp: [
      { id: 'mag_oferenda', rodadas_rest: 10, consome_em: 'magia_evocada',
        efeito: { tipo: 'mod_nivel_magia', valor: 2 } },
    ] });
    const bola = M.magiasOfensivasDoAtor(comBonus, CAT).find((m) => m.key === 'bola_de_fogo');
    expect(bola.nivel).toBe(3);
    expect(bola.dano).toBe(20);   // lê o nivel_3, não o nivel_1
  });

  it('o karma continua custando o nível COMPRADO, não o ampliado', () => {
    // A Oferenda paga em sangue (EF); cobrar karma pelo bônus seria cobrar
    // duas vezes pela mesma coisa.
    const comBonus = ator({ status_temp: [
      { id: 'mag_oferenda', efeito: { tipo: 'mod_nivel_magia', valor: 2 } },
    ] });
    expect(M.magiasOfensivasDoAtor(comBonus, CAT)
      .find((m) => m.key === 'bola_de_fogo').custo_karma).toBe(1);
  });

  it('o teto é 9 — o topo da escala', () => {
    expect(M.nivelComOferenda({ status_temp: [
      { efeito: { tipo: 'mod_nivel_magia', valor: 6 } }] }, 7)).toBe(9);
  });

  it('lançar a magia QUEIMA a Oferenda', () => {
    const p = ator({ status_temp: [
      { id: 'mag_oferenda', consome_em: 'magia_evocada',
        efeito: { tipo: 'mod_nivel_magia', valor: 2 } },
    ] });
    expect(M.consumirOferenda(p).status_temp).toHaveLength(0);
  });

  it('a queima NÃO leva junto o bloqueio de cura de EF', () => {
    /* Oferenda deixa três status e só um morre na próxima magia: "enquanto
       este efeito durar, você não poderá recuperar sua energia física" vale
       as 10 rodadas inteiras. Por isso consome_em desce POR EFEITO. */
    const p = ator({ status_temp: [
      { id: 'mag_oferenda', consome_em: 'magia_evocada',
        efeito: { tipo: 'mod_nivel_magia', valor: 2 } },
      { id: 'mag_oferenda', rodadas_rest: 10, efeito: { tipo: 'sem_cura_ef', valor: true } },
    ] });
    const r = M.consumirOferenda(p);
    expect(r.status_temp).toHaveLength(1);
    expect(r.status_temp[0].efeito.tipo).toBe('sem_cura_ef');
  });

  it('sem Oferenda, consumir não muda nada', () => {
    const p = ator();
    expect(M.consumirOferenda(p)).toBe(p);
  });

  it('aplicarEfeitoMagia grava consome_em no status, vindo do EFEITO', () => {
    // O defeito original: aplicarEfeitoMagia lia reg.consome_em (nível da
    // entrada) e o campo nunca chegava ao status.
    const r = M.aplicarEfeitoMagia(ator(), OFERENDA, 1, { fonteInstId: 'p7' });
    const nivelSt = r.status_temp.find((s) => s.efeito.tipo === 'mod_nivel_magia');
    expect(nivelSt.consome_em).toBe('magia_evocada');
    const curaSt = r.status_temp.find((s) => s.efeito.tipo === 'sem_cura_ef');
    expect(curaSt.consome_em).toBeUndefined();
  });

  it('sem_cura_ef bloqueia recuperação de EF, mas não o custo', () => {
    const p = ator({ ef: 5, status_temp: [
      { id: 'mag_oferenda', rodadas_rest: 10, efeito: { tipo: 'sem_cura_ef', valor: true } },
    ] });
    expect(M.aplicarCuraPool(p, 'ef', 8).ef).toBe(5);                        // não cura
    expect(M.aplicarCuraPool(p, 'ef', 3, { inverter: true }).ef).toBe(2);    // custo passa
    expect(M.aplicarCuraPool(p, 'eh', 5).eh).toBe(10);                       // EH não é afetada
  });
});

describe('toda primitiva do registro tem CONSUMIDOR no motor', () => {
  /* O PONTO CEGO QUE ESTE BLOCO FECHA.

     O verificador do catálogo (auditarMagias) confere se o TEXTO é legível.
     Ele não tem como saber se a primitiva declarada é lida por alguém — e por
     isso diz "ok" para uma magia que escreve um status que ninguém consulta.

     Aconteceu duas vezes nesta sessão:
       Oferenda      declarou mod_nivel_magia e nada o consumia; a magia
                     gastava EF e a próxima saía no nível de sempre.
       Fase 1        deixou proteção elemental, cura, dreno e a evocação
                     inteira como funções corretas que nada chamava.

     Aqui a lista é explícita: acrescentar primitiva ao registro sem ligá-la
     quebra o teste na hora. */

  // Primitivas com consumidor de verdade, e onde ele mora.
  const LIGADAS = {
    dano:            'aplicarGolpeEmAlvo → aplicarDanoCascata',
    dano_por_rodada: 'processarDanoPorRodada',
    reducao_dano:    'danoFinal → danoAposReducao',
    cura_pool:       'aplicarCurasDaMagia → aplicarCuraPool',
    dreno_eh:        'aplicarGolpeEmAlvo → aplicarDrenoEh',
    mod_ataque:      'somaModAtaque',
    mod_coluna:      'somaEfeitosStatus na coluna de toda ação',
    mod_defesa:      'defesa efetiva do alvo',
    mod_vb:          'vbEfetivo',
    mod_rf:          'resolução de resistência',
    mod_rm:          'resolução de resistência',
    mod_eh_temp:     'aplicarEfeitoMagia + expirarEhTemp',
    mod_dano_max:    'danoFinal',
    mod_condicao:    'aplicarCondicoesDaMagia',
    visao_escuridao: 'enxergaNaEscuridao + penalidadeDeVisibilidade',
    sem_acoes:       'temAcaoRestante + proximoAtivo',
    mod_nivel_magia: 'nivelComOferenda + consumirOferenda',
    sem_cura_ef:     'aplicarCuraPool',
    // 12/09/2026: a dificuldade de habilidade, na aba Habilidade e na ficha.
    mod_dificuldade: 'somaDificuldadeDoStatus + consumirDificuldadeDoTeste',
  };

  /* Primitivas DECLARADAS e ainda SEM consumidor. A lista existe para o
     estado ser explícito em vez de surpresa — e para encolher, nunca crescer.

     mod_atributo — Licantropia Lupina. O atributo chega ao combate pela
     coluna de ataque (gerarAtaques aplica o `ajuste_atributo` da arma), e
     ligá-lo exige passar modificadores por calcularFicha. Os poços derivados
     (EF, defesa, RF) ficam congelados no snapshot e NÃO acompanhariam, o que
     é uma inconsistência que precisa de decisão de regra antes de código.
     O usuário avisou em 12/09/2026 que vai alterar a magia. */
  const PENDENTES = { mod_atributo: 'Licantropia — ver comentário acima' };

  it('nenhuma primitiva do registro ficou sem consumidor por acidente', () => {
    const tipos = new Set();
    Object.values(window.MAGIA_EFEITO_MAP).forEach((reg) => {
      reg.efeitos.forEach((ef) => tipos.add(ef.tipo));
    });
    const semConsumidor = [...tipos].filter((t) => !LIGADAS[t] && !PENDENTES[t]);
    expect(semConsumidor,
      `primitiva(s) no registro sem consumidor e sem justificativa: ${semConsumidor.join(', ')}`)
      .toEqual([]);
  });

  it('a lista de pendentes não cresceu', () => {
    // Ela só deve encolher. Se precisar crescer, é decisão consciente — e o
    // motivo vai no comentário, como o do mod_atributo.
    expect(Object.keys(PENDENTES)).toEqual(['mod_atributo']);
  });

  it('as primitivas LIGADAS realmente existem no motor', () => {
    // Guarda contra a lista virar ficção: se alguém remover uma função, o
    // nome some do arquivo e o teste acusa.
    ['aplicarCuraPool', 'aplicarDrenoEh', 'danoAposReducao', 'nivelComOferenda',
     'consumirOferenda', 'aplicarCurasDaMagia', 'evocacaoPrendeAcao',
     'somaDificuldadeDoStatus', 'consumirDificuldadeDoTeste',
    ].forEach((fn) => expect(M[fn], fn).toBeTypeOf('function'));
  });
});

describe('ignora_eh — Garras crava na carne', () => {
  /* "Causa 4 de dano, ignora a energia heroica." A cascata normal come a EH
     primeiro; a garra pula direto para armadura→EF. É a mesma chave que Golpe
     Letal acende nas técnicas — o que faltava era a magia poder acendê-la. */
  const atacante = () => ({ inst_id: 'c1', eh: 10, eh_max: 10, status_temp: [] });
  const vitima = (over = {}) => ({
    inst_id: 'v1', eh: 30, eh_max: 30, ar: 0, ar_max: 0, res: 0,
    ef: 40, ef_max: 40, status: 'ativo', status_temp: [], ...over,
  });

  it('com a flag, a EH inteira do alvo é ignorada', () => {
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima()], 0, 1, 12, false, null, false, true);
    expect(r[1].eh).toBe(30);      // intacta
    expect(r[1].ef).toBe(28);      // levou os 12
  });

  it('sem a flag, a EH segura o golpe (é a cascata de sempre)', () => {
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima()], 0, 1, 12, false, null, false, false);
    expect(r[1].eh).toBe(18);
    expect(r[1].ef).toBe(40);
  });

  it('a armadura ainda segura: ignora a EH, não a proteção', () => {
    const r = M.aplicarGolpeEmAlvo([atacante(), vitima({ ar: 20, ar_max: 20, res: 3 })],
                                   0, 1, 12, false, null, false, true);
    expect(r[1].ef).toBe(40);      // golpe abaixo do limiar: bloqueado inteiro
  });

  it('o registro de Garras é quem declara a flag', () => {
    const reg = window.MAGIA_EFEITO_MAP.garras;
    expect(reg.efeitos.some((e) => e.tipo === 'dano' && e.ignora_eh)).toBe(true);
  });

  it('e OS DOIS handlers de ação acendem a flag — Mestre e Jogador', async () => {
    /* Sem este elo a flag existiria no mapa e não chegaria na cascata — foi
       exatamente o que aconteceu com `pool: 'eh'` de Covardia, que está
       declarado e ninguém lê. E são dois caminhos: o ataque do Mestre e o do
       Jogador são handlers separados que precisam ficar idênticos. */
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const fonte = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    const derivacoes = fonte.match(/const furaEhGolpe =/g) || [];
    expect(derivacoes.length, 'Mestre e Jogador').toBe(2);
    const passagens = fonte.match(/aplicarGolpeEmAlvo\([^)]*furaEhGolpe\)/g) || [];
    expect(passagens.length, 'alvo principal e alvos extras, nos dois').toBe(4);
  });
});

describe('redução que alcança dano BASE — Parede de Cristal', () => {
  /* A regra tinha uma generalização escondida: `if (!elemento) return d` no
     topo de danoAposReducao, isto é, redução nenhuma vale contra dano sem
     elemento. Está certo para proteção ELEMENTAL — Piroproteção não segura
     porrada de maça — e estava errado para a Parede de Cristal, que barra
     "qualquer objeto ou criatura com corpo físico". `base: true` no efeito é
     quem separa os dois casos. */
  const comStatus = (efeito) => ({ inst_id: 'v1', ef: 40, status_temp: [{ nome: 'x', efeito }] });
  const PAREDE = { tipo: 'reducao_dano', valor: 8, elemento: null, base: true };
  const PIRO   = { tipo: 'reducao_dano', valor: 8, elemento: 'fogo' };
  const GENERICA = { tipo: 'reducao_dano', valor: 8, elemento: null };

  it('a parede corta golpe SEM elemento', () => {
    expect(M.danoAposReducao(20, comStatus(PAREDE), null)).toBe(12);
  });

  it('e corta golpe elemental também', () => {
    expect(M.danoAposReducao(20, comStatus(PAREDE), 'fogo')).toBe(12);
  });

  it('REGRESSÃO: proteção elemental NÃO alcança dano base', () => {
    expect(M.danoAposReducao(20, comStatus(PIRO), null)).toBe(20);
  });

  it('REGRESSÃO: Armadura Elemental (elemento null, sem base) segue elemental-only', () => {
    // "elemento null" ali quer dizer QUALQUER elemento, não "também sem elemento".
    expect(M.danoAposReducao(20, comStatus(GENERICA), null)).toBe(20);
    expect(M.danoAposReducao(20, comStatus(GENERICA), 'ar')).toBe(12);
  });

  it('REGRESSÃO: proteção do elemento errado não corta', () => {
    expect(M.danoAposReducao(20, comStatus(PIRO), 'ar')).toBe(20);
  });
});

describe('aura hostil exclui o conjurador; aura protetora não', () => {
  /* Aura Divina pune quem está em volta — quem lançou não se pune. Parede de
     Cristal e Tensão nascem "a partir de você", então quem lançou está dentro.
     O filtro era incondicional e deixava o conjurador de fora da própria
     parede, que é o oposto do que a magia diz. */
  const p = (id, x, extra = {}) => ({ inst_id: id, nome: id, pos: { x, y: 0 },
                                      status: 'ativo', status_temp: [], ...extra });
  const conj = p('c1', 0);
  const perto = p('a1', 1);
  const cat = (key, alcance) => ({ key, nome: key, alcance, nivel_1: 'Reduz 8 de dano.' });

  it('Parede de Cristal: o conjurador está DENTRO', () => {
    const r = M.alvosDeAura(cat('parede_de_cristal', '5 metros'), conj, [conj, perto], 1);
    expect(r.map((x) => x.inst_id)).toContain('c1');
  });

  it('Aura Divina: o conjurador fica FORA', () => {
    const alvo = p('d1', 1, { raca: 'Demônio' });
    const r = M.alvosDeAura(cat('aura_divina', '25 metros'), conj, [conj, alvo], 1);
    expect(r.map((x) => x.inst_id)).not.toContain('c1');
    expect(r.map((x) => x.inst_id)).toContain('d1');
  });

  it('Tensão pega todo mundo no raio — "todos devem fazer um teste"', () => {
    const longe = p('f1', 40);
    const r = M.alvosDeAura(cat('tensao', '10 metros'), conj, [conj, perto, longe], 1);
    expect(r.map((x) => x.inst_id).sort()).toEqual(['a1', 'c1']);
  });
});

describe('Doenças — as duas peças novas', () => {
  /* Doenças era a última magia a precisar de SISTEMA, não de decisão. Depois
     de o usuário reescrever os cinco níveis com doenças nomeadas, as peças
     que faltavam ficaram concretas:

       mod_condicao  "Reduz 25 de Saúde" — Saúde é uma das 8 condições da
                     ficha (escala −50..+50), não poço de combate;
       escala        "a cada rodada a penalidade aumenta 2 pontos" — o valor
                     do status CRESCE, e até aqui todo status era fixo. */
  const N1 = 'Cause conjuntivite: Esta doença afeta os olhos, embaçando a visão e causando um pouco de dor. Reduz 25 de Saúde e o tempo de cura é de 3 dias.';
  const N9 = 'Cause febre amarela: Cause febre, tremores e coloração amarela pela pele. Reduz 7 colunas de ataque. Além disso, a cada rodada a penalidade aumenta 2 pontos (menos 9, menos 11, menos 13..). O tempo de cura é de duas semanas.';
  const DOENCAS = { key: 'doencas', nome: 'Doenças', duracao: 'Instantânea',
                    nivel_1: N1, nivel_9: N9 };
  const vitima = (over = {}) => ({ ...alvo(), condicoes: { vitalidade: 0 }, ...over });

  describe('a ponte com a condição Saúde', () => {
    it('"Reduz 25 de Saúde" desce a condição', () => {
      const r = M.aplicarCondicoesDaMagia(vitima(), DOENCAS, 1);
      expect(r.condicoes.vitalidade).toBe(-25);
    });

    it('parte de onde a ficha estava, não de zero', () => {
      const r = M.aplicarCondicoesDaMagia(vitima({ condicoes: { vitalidade: 10 } }), DOENCAS, 1);
      expect(r.condicoes.vitalidade).toBe(-15);
    });

    it('respeita o piso da escala de condição', () => {
      // aplicarDeltaCondicao é a MESMA função dos itens: o clamp é um só.
      const r = M.aplicarCondicoesDaMagia(vitima({ condicoes: { vitalidade: -40 } }), DOENCAS, 1);
      expect(r.condicoes.vitalidade).toBeGreaterThanOrEqual(-50);
    });

    it('não vira status_temp — condição acontece e acaba', () => {
      const r = M.aplicarEfeitoMagia(vitima(), DOENCAS, 1);
      expect(r.status_temp.some((s) => s.efeito.tipo === 'mod_condicao')).toBe(false);
    });

    it('nível que não fala de Saúde não mexe nela', () => {
      // O 9 troca para coluna de ataque: não inventa zero nem carrega o 25.
      const r = M.aplicarCondicoesDaMagia(vitima(), DOENCAS, 9);
      expect(r.condicoes.vitalidade).toBe(0);
    });

    it('e o caminho de apoio aplica as duas coisas juntas', () => {
      // aplicarEfeitoApoio é quem os dois handlers chamam — se a ponte não
      // estiver encadeada ali, Doenças não faz nada na mesa.
      const r = M.aplicarEfeitoApoio(vitima(),
        { key: 'doencas', nome: 'Doenças', nivel: 1, catalogo: DOENCAS }, 'c1');
      expect(r.condicoes.vitalidade).toBe(-25);
    });
  });

  describe('a penalidade que cresce por rodada', () => {
    const col = (p) => {
      const s = p.status_temp.find((x) => x.efeito.tipo === 'mod_ataque');
      return s ? s.efeito.valor : null;
    };

    it('entra em −7, como o texto diz', () => {
      expect(col(M.aplicarEfeitoMagia(vitima(), DOENCAS, 9))).toBe(-7);
    });

    it('o passo vem do TEXTO e nasce com o sinal do efeito', () => {
      const s = M.aplicarEfeitoMagia(vitima(), DOENCAS, 9).status_temp
        .find((x) => x.efeito.tipo === 'mod_ataque');
      expect(s.efeito.escalada).toBe(-2);
    });

    it('−7 → −9 → −11 → −13, a sequência do texto', () => {
      let p = M.aplicarEfeitoMagia(vitima(), DOENCAS, 9);
      const serie = [col(p)];
      for (let i = 0; i < 3; i++) {
        p = M.processarViradaDeRodada(p).participante;
        serie.push(col(p));
      }
      expect(serie).toEqual([-7, -9, -11, -13]);
    });

    it('a penalidade que cresceu chega no golpe', () => {
      let p = M.aplicarEfeitoMagia(vitima(), DOENCAS, 9);
      p = M.processarViradaDeRodada(p).participante;
      expect(M.somaModAtaque(p, 'CM')).toBe(-9);
    });

    it('status SEM escalada não muda — e volta a MESMA referência', () => {
      const lista = [{ id: 'x', nome: 'x', rodadas_rest: 3,
                       efeito: { tipo: 'mod_ataque', valor: 3 } }];
      expect(M.escalarStatusTemp(lista)).toBe(lista);
    });

    it('nível sem a frase da escalada não escala', () => {
      // O texto do nível 1 não promete crescimento nenhum.
      const p = M.aplicarEfeitoMagia(vitima(), DOENCAS, 1);
      expect(p.status_temp.some((s) => s.efeito.escalada)).toBe(false);
    });
  });
});

describe('os SEIS elementos', () => {
  /* Decisão do usuário, 12/09/2026: Celestial, Ar, Fogo, Água, Terra,
     Infernal. "Luz" era o nome antigo do Celestial e virou sinônimo; Infernal
     era lido como dano SEM elemento, e agora é elemento de verdade. */
  it('a lista tem exatamente seis', () => {
    expect(window.MAGIA_ELEMENTOS_VALIDOS).toHaveLength(6);
  });

  it('proteção celestial corta a Lâmina de Luz — o que o nome antigo impedia', () => {
    // Enquanto "luz" e "celestial" eram elementos distintos, uma proteção
    // celestial não cortava nada que dissesse "de luz".
    const p = { inst_id: 'v1', ef: 40, status_temp: [
      { nome: 'x', efeito: { tipo: 'reducao_dano', valor: 8, elemento: 'celestial' } }] };
    const lamina = { key: 'lamina_de_luz', nome: 'Lâmina de Luz',
                     nivel_1: 'Causa 24 de dano elemental de luz.' };
    expect(window.elementoDoNivel(lamina, 1)).toBe('celestial');
    expect(M.danoAposReducao(24, p, 'celestial')).toBe(16);
  });

  it('proteção infernal corta Manipulação Infernal', () => {
    const p = { inst_id: 'v1', ef: 40, status_temp: [
      { nome: 'x', efeito: { tipo: 'reducao_dano', valor: 8, elemento: 'infernal' } }] };
    expect(M.danoAposReducao(28, p, 'infernal')).toBe(20);
  });

  it('e infernal NÃO é cortado por proteção de fogo', () => {
    const p = { inst_id: 'v1', ef: 40, status_temp: [
      { nome: 'x', efeito: { tipo: 'reducao_dano', valor: 8, elemento: 'fogo' } }] };
    expect(M.danoAposReducao(28, p, 'infernal')).toBe(28);
  });
});

describe('a cura natural da doença tem DATA', () => {
  /* Pedido do usuário: "na magia Doenças busque a data atual do jogo, e conte
     a partir disso a quantidade de dias para a cura natural".

     Duas pontas: o prazo está no texto do nível, a data atual em
     historias.data_jogo_atual. O calendário tem 361 dias — 12 meses de 30
     mais o Dia de Cruine —, então contar na mão erraria a virada. */
  const N1 = 'Cause conjuntivite: Esta doença afeta os olhos. Reduz 25 de Saúde e o tempo de cura é de 3 dias.';
  const N9 = 'Cause febre amarela: Reduz 7 colunas de ataque. Além disso, a cada rodada a penalidade aumenta 2 pontos (menos 9, menos 11, menos 13..). O tempo de cura é de duas semanas.';
  const DOENCAS = { key: 'doencas', nome: 'Doenças', nivel_1: N1, nivel_9: N9 };

  it('3 dias a partir de 10/Mês do Ouro', () => {
    const r = M.curaNaturalDaMagia(DOENCAS, 1, { dia: 10, mes: 5, ano: 12 });
    expect(r).toMatchObject({ dias: 3, data: { dia: 13, mes: 5, ano: 12 } });
  });

  it('"duas semanas" por extenso = 14 dias', () => {
    // O catálogo manda usar dígito para EFEITO; prazo aceita por extenso,
    // porque prazo não lido some da tela em vez de virar efeito zero.
    expect(window.curaEmDiasNoNivel(DOENCAS, 9)).toBe(14);
  });

  it('vira o mês corretamente', () => {
    const r = M.curaNaturalDaMagia(DOENCAS, 1, { dia: 29, mes: 5, ano: 12 });
    expect(r.data).toEqual({ dia: 2, mes: 6, ano: 12 });
  });

  it('atravessa o Dia de Cruine e o ano novo', () => {
    // Mês 12 tem 30 dias, e depois vem o mês 13 (Dia de Cruine, 1 dia só).
    // 29/12 + 3 = 30/12, Cruine, 1/1 do ano seguinte.
    const r = M.curaNaturalDaMagia(DOENCAS, 1, { dia: 29, mes: 12, ano: 12 });
    expect(r.data).toEqual({ dia: 1, mes: 1, ano: 13 });
  });

  it('sem data de jogo definida: sem data, mas o prazo continua', () => {
    expect(M.curaNaturalDaMagia(DOENCAS, 1, null)).toBeNull();
    expect(M.textoCuraNatural(DOENCAS, 1, null, 'pt')).toBe('sara em 3 dias');
  });

  it('o texto do log junta prazo e data', () => {
    const t = M.textoCuraNatural(DOENCAS, 1, { dia: 10, mes: 5, ano: 12 }, 'pt');
    expect(t).toBe('sara em 3 dias — 13 de Mês do Ouro, ano 12');
  });

  it('magia sem prazo não inventa texto', () => {
    expect(M.textoCuraNatural({ key: 'bencao', nivel_1: 'Aumenta 1 coluna de ataque.' },
                              1, { dia: 1, mes: 1, ano: 0 }, 'pt')).toBe('');
  });

  it('e o ida-e-volta do calendário fecha em qualquer data', () => {
    // Se somar e subtrair não voltarem ao mesmo dia, a conta está errada em
    // algum lugar do Cruine.
    [{ dia: 1, mes: 1, ano: 0 }, { dia: 30, mes: 12, ano: 7 },
     { dia: 1, mes: 13, ano: 3 }, { dia: 15, mes: 6, ano: 100 }].forEach((d) => {
      const ida = window.somarDiasFantasy(d, 47);
      expect(window.somarDiasFantasy(ida, -47)).toEqual(d);
    });
  });
});

describe('o motor rola HABILIDADE, não só resistência', () => {
  /* Decisão do usuário, 12/09/2026: "o motor deve rolar habilidade também".
     Era o que segurava Proteção Natural, a última órfã que não era ritual.

     A diferença entre os dois testes é DE QUEM ROLA:
       • resistência — rola o ALVO, para escapar da magia;
       • habilidade  — rola o CONJURADOR, para a magia sair.

     A escala de aprovação é a MESMA da ficha (D20_QUALIDADE_MINIMA). Se
     divergissem, o mesmo Sentidos (Absurdo) passaria num lugar e falharia no
     outro. */
  const PROT = { key: 'protecao_natural', nome: 'Proteção Natural', duracao: '2 rodadas',
                 alcance: 'Pessoal',
                 nivel_1: 'Com um teste da habilidade Sentidos (Absurdo), reduz 4 de dano.',
                 nivel_9: 'Com um teste da habilidade Sentidos (Fácil), reduz 20 de dano.' };

  describe('lendo a exigência do texto', () => {
    it('nome da habilidade e dificuldade', () => {
      expect(window.testeHabilidadeNoNivel(PROT, 1))
        .toEqual({ habilidade: 'Sentidos', dificuldade: 'absurdo' });
    });

    it('a dificuldade AFROUXA com o nível — por isso é lida, não registrada', () => {
      expect(window.testeHabilidadeNoNivel(PROT, 9).dificuldade).toBe('facil');
    });

    it('"Muito Difícil" vira a chave com underscore que o motor usa', () => {
      const m = { nivel_1: 'Com um teste da habilidade Sentidos (Muito Difícil), reduz 8 de dano.' };
      expect(window.testeHabilidadeNoNivel(m, 1).dificuldade).toBe('muito_dificil');
    });

    it('magia sem teste devolve null', () => {
      expect(window.testeHabilidadeNoNivel({ nivel_1: 'Aumenta 1 coluna de ataque.' }, 1)).toBeNull();
    });

    it('dificuldade que não existe na escala não vira teste', () => {
      const m = { nivel_1: 'Com um teste da habilidade Sentidos (Impossível), reduz 4 de dano.' };
      expect(window.testeHabilidadeNoNivel(m, 1)).toBeNull();
    });
  });

  describe('a aprovação usa a MESMA escala da ficha', () => {
    it.each([
      ['absurdo', 7, true], ['absurdo', 6, false],
      ['facil', 2, true], ['facil', 1, false],
      ['muito_dificil', 5, true], ['muito_dificil', 4, false],
    ])('%s com qualidade %i → %s', (dif, q, esperado) => {
      expect(M.passouNoTesteDeHabilidade(q, dif)).toBe(esperado);
    });

    it('dificuldade desconhecida não barra ninguém', () => {
      // Prefere deixar passar a travar a mesa por uma palavra nova no texto.
      expect(M.passouNoTesteDeHabilidade(1, 'impossivel')).toBe(true);
    });
  });

  describe('falhar no teste faz a magia sair sem pegar', () => {
    const conj = () => ({ ...alvo(), inst_id: 'c1', karma: 10, pa_rest: 2 });
    const magia = { key: 'protecao_natural', nome: 'Proteção Natural', nivel: 1,
                    custo_karma: 1, catalogo: PROT };

    it('reprovado: nenhum status é gravado', () => {
      const r = M.passoDeApoio([conj()], 0, 0, magia, 1, false, true);
      expect(r.fase).toBe('falhou_teste');
      expect(r.participantes[0].status_temp).toHaveLength(0);
    });

    it('mas o karma foi gasto — paga-se pela tentativa', () => {
      const r = M.passoDeApoio([conj()], 0, 0, magia, 1, false, true);
      expect(r.participantes[0].karma).toBe(9);
    });

    it('aprovado: a redução de dano entra', () => {
      const r = M.passoDeApoio([conj()], 0, 0, magia, 1, false, false);
      expect(r.fase).toBe('resolveu');
      const ef = r.participantes[0].status_temp.find((s) => s.efeito.tipo === 'reducao_dano');
      expect(ef.efeito).toMatchObject({ valor: 4, base: true });
    });

    it('e a redução alcança dano SEM elemento — é queda, não fogo', () => {
      const r = M.passoDeApoio([conj()], 0, 0, magia, 1, false, false);
      expect(M.danoAposReducao(10, r.participantes[0], null)).toBe(6);
    });

    it('o log diz em QUE teste se falhou', () => {
      expect(M.textoPassoDeApoio('falhou_teste', 'Mago', magia, 'Mago', false))
        .toMatch(/falhou no teste de Sentidos/);
    });
  });
});
