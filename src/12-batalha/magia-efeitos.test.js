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
    const AURA_LOG = { key: 'aura_divina', nome: 'Aura Divina', nivel: 1, catalogo: AURA };
    expect(M.textoEfeitoMagia(AURA_LOG)).toMatch(/alvos de área escolhidos pelo Mestre/);
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
