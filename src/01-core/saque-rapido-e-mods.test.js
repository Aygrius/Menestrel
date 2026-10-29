/* ============================================================
   saque-rapido-e-mods.test.js — a proposta de 26/10/2026 nas regras
   ============================================================
   Modelo aprovado pelo usuário (artifact c6dbd3d6):
   1. 17 regiões de equipamento (REGIOES_EQUIP) com vocabulário novo e
      aliases do antigo (instâncias gravadas antes da migração).
   2. SAQUE RÁPIDO: cada mão tem uma casa de reserva (saque_e/saque_d).
      A peça ali NÃO está equipada — nenhum efeito — e o ⇄
      (trocarSaqueRapido) troca mão ↔ saque sem passar pelo inventário.
   3. Mods passivos das peças: mod_vel soma na Velocidade, mod_kar no
      Karma máximo, defesa no DEF numérico (derivadas.defesaNum).
   4. VEL 30 dobra os pontos de ação (derivadas.pontosAcaoDobrados).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

const CAT = {
  machado: { slug: 'machado', nome: 'Machado', categoria_equip: 'arma', slot_equip: 'mao',
             grupo_armas: 'CP', maos_outras: 1, mod_vel: -2, mod_kar: -10, resistencia: 10, dano: 4 },
  arco:    { slug: 'arco', nome: 'Arco', categoria_equip: 'arma', slot_equip: 'mao',
             grupo_armas: 'PL', maos_outras: 2, mod_vel: 0, mod_kar: 0, resistencia: 3, dano: 2 },
  peitoral:{ slug: 'peitoral', nome: 'Peitoral de Aço', categoria_equip: 'armadura', slot_equip: 'dorso',
             tipo_armadura: 'P', defesa: 1, absorcao: 3, resistencia: 3, mod_vel: -2, mod_kar: -15 },
  anel_ouro: { slug: 'anel_ouro', nome: 'Anel Dourado', slot_equip: 'dedo', grupo: 'Vestimentas',
             tipo_equip: 'adorno', mod_kar: 3, mod_vel: 0 },
  bota:    { slug: 'bota', nome: 'Bota', grupo: 'Vestimentas', slot_equip: 'pe', mod_vel: 7, mod_kar: 0 },
};

const PJ_BASE = {
  raca: 'Humano', profissao: 'Guerreiro', experiencia: 0,
  forca_base: 2, fisico_base: 1, agilidade_base: 0, percepcao_base: 0,
  intelecto_base: 0, aura_base: 1, carisma_base: 0,
};
const comItens = (itens) => ({ ...PJ_BASE, inventario: { itens } });

describe('getSlotsState — vocabulário novo, aliases e saque rápido', () => {
  it('a instância antiga (slot "peito") aparece na casa nova (dorso) e no espelho antigo', () => {
    const s = G.getSlotsState([{ instanceId: 'p1', slug: 'peitoral', equipado: true, slot: 'peito' }], CAT);
    expect(s.dorso).toBe('p1');
    expect(s.peito).toBe('p1');   // espelho para leitores antigos
  });

  it('a peça no saque rápido ocupa a casa saque_X sem estar equipada', () => {
    const s = G.getSlotsState([{ instanceId: 'a1', slug: 'arco', equipado: false, slot: 'saque_e' }], CAT);
    expect(s.saque_e).toBe('a1');
    expect(s.mao_e).toBe(null);
  });

  /* ── O ESPELHO É O CAMINHO DE VOLTA (29/10/2026) ─────────────────────────
     Quem pergunta se a casa está livre usa o nome do CATÁLOGO
     (`slots[cat.slot_equip]`, em 07-inventario/inventario.jsx). Faltavam dois
     espelhos no vocabulário antigo — `braco` e `mao` —, e chave sem espelho
     responde `undefined`: ou seja, "casa livre". Duas braçadeiras entravam na
     mesma região sem recusa.

     E `maos` ia para `mao_d`, a casa da ARMA: a manopla de uma instância
     antiga ocupava a mão direita, a ficha contava uma mão a menos e recusava
     a arma de duas mãos. A região das mãos é `mao`, como em SLOT_CANONICO. */
  it('a manopla antiga (slot "maos") fica na região das mãos, não na mão da arma', () => {
    const CAT_M = { manopla: { slug: 'manopla', categoria_equip: 'armadura', slot_equip: 'mao' } };
    const s = G.getSlotsState([{ instanceId: 'g1', slug: 'manopla', equipado: true, slot: 'maos' }], CAT_M, 'Humano');
    expect(s.mao).toBe('g1');
    expect(s.maos, 'espelho para quem pergunta pelo nome antigo').toBe('g1');
    expect(s.mao_d, 'a mão da arma segue livre').toBe(null);
    expect(s.mao_e).toBe(null);
  });

  it('a braçadeira antiga (slot "bracos") responde pelos dois nomes', () => {
    const CAT_B = { brac: { slug: 'brac', categoria_equip: 'armadura', slot_equip: 'braco' } };
    const s = G.getSlotsState([{ instanceId: 'b1', slug: 'brac', equipado: true, slot: 'bracos' }], CAT_B, 'Humano');
    expect(s.braco).toBe('b1');
    expect(s.bracos).toBe('b1');
  });

  it('todo alias de equipamento tem espelho de volta', () => {
    /* A regra, e não os casos: alias sem espelho é casa que nunca recusa. */
    const CAT_A = { p: { slug: 'p', categoria_equip: 'armadura' } };
    for (const antigo of ['ombros', 'peito', 'bracos', 'maos', 'pernas', 'pes']) {
      const s = G.getSlotsState([{ instanceId: 'x', slug: 'p', equipado: true, slot: antigo }], CAT_A, 'Humano');
      expect(s[antigo], `slot antigo "${antigo}" sem espelho`).toBe('x');
    }
  });

  it('REGIOES_EQUIP tem as 17 regiões e 45 casas', () => {
    expect(Object.keys(G.REGIOES_EQUIP)).toHaveLength(17);
    const total = Object.values(G.REGIOES_EQUIP).reduce((s, n) => s + n, 0);
    expect(total).toBe(45);
  });
});

describe('trocarSaqueRapido — o ⇄ entre a mão e a reserva', () => {
  const itens = [
    { instanceId: 'm1', slug: 'machado', quantidade: 1, equipado: true, slot: 'mao_e' },
    { instanceId: 'a1', slug: 'arco', quantidade: 1, equipado: false, slot: 'saque_e' },
  ];

  it('troca os lugares e os flags de equipado', () => {
    const depois = G.trocarSaqueRapido(itens, 'e');
    const arco = depois.find((i) => i.instanceId === 'a1');
    const machado = depois.find((i) => i.instanceId === 'm1');
    expect(arco.slot).toBe('mao_e');
    expect(arco.equipado).toBe(true);
    expect(machado.slot).toBe('saque_e');
    expect(machado.equipado).toBe(false);
  });

  it('com a mão vazia, o saque apenas sobe para a mão', () => {
    const depois = G.trocarSaqueRapido([itens[1]], 'e');
    expect(depois[0].slot).toBe('mao_e');
    expect(depois[0].equipado).toBe(true);
  });

  it('sem nada nos dois lados, devolve a lista como está', () => {
    expect(G.trocarSaqueRapido([], 'd')).toEqual([]);
  });

  it('arma de 2 mãos não sobe do saque com a outra mão ocupada', () => {
    const lista = [
      { instanceId: 'm1', slug: 'machado', quantidade: 1, equipado: true, slot: 'mao_e' },
      { instanceId: 'e1', slug: 'escudo', quantidade: 1, equipado: true, slot: 'mao_d' },
      { instanceId: 'a1', slug: 'arco', quantidade: 1, equipado: false, slot: 'saque_e' },
    ];
    const cat = { ...CAT, escudo: { slug: 'escudo', categoria_equip: 'arma', slot_equip: 'mao', maos_outras: 1, absorcao: 6, resistencia: 4 } };
    // bloqueia: o arco exige as duas mãos e o escudo segue na direita
    expect(G.trocarSaqueRapido(lista, 'e', cat, 'Humano')).toBe(lista);
    // sem o escudo, a troca acontece
    const semEscudo = lista.filter((i) => i.instanceId !== 'e1');
    const depois = G.trocarSaqueRapido(semEscudo, 'e', cat, 'Humano');
    expect(depois.find((i) => i.instanceId === 'a1').slot).toBe('mao_e');
  });

  it('moverParaSaque tira a peça do corpo (sem efeitos) e a põe na reserva', () => {
    const depois = G.moverParaSaque(itens, 'm1', 'e');
    const machado = depois.find((i) => i.instanceId === 'm1');
    expect(machado.slot).toBe('saque_e');
    expect(machado.equipado).toBe(false);
    expect(G.pecaNoCorpo(machado)).toBe(false);
  });
});

describe('calcularFicha — mods passivos das peças (26/10/2026)', () => {
  it('mod_vel e mod_kar da peça equipada entram na Velocidade e no Karma', () => {
    const sem = G.calcularFicha(comItens([]), CAT).derivadas;
    const com = G.calcularFicha(comItens([
      { instanceId: 'p1', slug: 'peitoral', quantidade: 1, equipado: true, slot: 'dorso' },
    ]), CAT).derivadas;
    expect(com.velocidade).toBe(sem.velocidade - 2);
    expect(com.karma).toBe(Math.max(0, sem.karma - 15));
    expect(com.defesaNum).toBe(1);   // defesa da peça + agilidade 0
    expect(com.absorcao).toBe(3);
  });

  it('adorno vestido soma karma; bota soma velocidade', () => {
    const sem = G.calcularFicha(comItens([]), CAT).derivadas;
    const com = G.calcularFicha(comItens([
      { instanceId: 'j1', slug: 'anel_ouro', quantidade: 1, vestido: true, vesteSlot: 'dedo' },
      { instanceId: 'b1', slug: 'bota', quantidade: 1, vestido: true, vesteSlot: 'pe' },
    ]), CAT).derivadas;
    expect(com.karma).toBe(sem.karma + 3);
    expect(com.velocidade).toBe(sem.velocidade + 7);
  });

  it('Sacerdote e Rastreador ignoram a penalidade de karma, mas ganham o bônus', () => {
    for (const profissao of ['Sacerdote', 'Rastreador']) {
      const pj = (itens) => ({ ...PJ_BASE, profissao, inventario: { itens } });
      const sem = G.calcularFicha(pj([]), CAT).derivadas;
      const com = G.calcularFicha(pj([
        { instanceId: 'p1', slug: 'peitoral', quantidade: 1, equipado: true, slot: 'dorso' },
        { instanceId: 'm1', slug: 'machado', quantidade: 1, equipado: true, slot: 'mao_d' },
        { instanceId: 'j1', slug: 'anel_ouro', quantidade: 1, vestido: true, vesteSlot: 'dedo' },
      ]), CAT).derivadas;
      expect(com.karma, profissao).toBe(sem.karma + 3);
      expect(com.velocidade, 'a penalidade de velocidade continua').toBe(sem.velocidade - 4);
    }
  });

  it('a peça no SAQUE RÁPIDO não dá efeito nenhum', () => {
    const sem = G.calcularFicha(comItens([]), CAT).derivadas;
    const com = G.calcularFicha(comItens([
      { instanceId: 'm1', slug: 'machado', quantidade: 1, equipado: false, slot: 'saque_e' },
    ]), CAT).derivadas;
    expect(com.velocidade).toBe(sem.velocidade);
    expect(com.karma).toBe(sem.karma);
    expect(com.absorcao).toBe(sem.absorcao);
  });

  it('VEL 30 liga pontosAcaoDobrados; abaixo disso, não', () => {
    const base = G.calcularFicha(comItens([]), CAT).derivadas;
    expect(base.pontosAcaoDobrados).toBe(base.velocidade >= 30);
    // bota de +7 VEL por cima da base (19 no Humano 1,77m) não chega a 30
    const comBota = G.calcularFicha(comItens([
      { instanceId: 'b1', slug: 'bota', quantidade: 1, vestido: true, vesteSlot: 'pe' },
    ]), CAT).derivadas;
    expect(comBota.pontosAcaoDobrados).toBe(comBota.velocidade >= 30);
    // um PJ ágil de verdade cruza a linha
    const veloz = G.calcularFicha({ ...comItens([
      { instanceId: 'b1', slug: 'bota', quantidade: 1, vestido: true, vesteSlot: 'pe' },
    ]), agilidade_base: 5 }, CAT).derivadas;
    if (veloz.velocidade >= 30) expect(veloz.pontosAcaoDobrados).toBe(true);
  });
});

/* ── A ARMA DE DUAS MÃOS OCUPA OS DOIS SAQUES (26/10/2026) ─────────────────
   "Colocar um arco em saque rápido deve ocupar os dois slots em espera
   também. Armas de duas mãos ocupam dois saques rápidos." (usuário)

   É a regra que as MÃOS já tinham, levada à espera: quem guarda o arco na
   reserva não vai ter mão livre para outra arma na hora de sacar. Vale nos
   dois lados da conta — o estado das casas (o que o inventário lê para saber
   se a casa está livre) e a gravação (guardar no saque). */
describe('a arma de duas mãos na espera', () => {
  const CAT = {
    arco: { slug: 'arco', nome: 'Arco Curto', categoria_equip: 'arma', maos_outras: 2, maos_anao: 2, maos_pequenino: 2 },
    adaga: { slug: 'adaga', nome: 'Adaga', categoria_equip: 'arma', maos_outras: 1, maos_anao: 1, maos_pequenino: 1 },
    escudo: { slug: 'escudo', nome: 'Escudo Médio', categoria_equip: 'arma', maos_outras: 1, maos_anao: 1, maos_pequenino: 1 },
  };

  it('ocupa as DUAS casas de saque no estado', () => {
    const itens = [{ instanceId: 'a1', slug: 'arco', slot: 'saque_e' }];
    const s = G.getSlotsState(itens, CAT, 'Humano');
    expect(s.saque_e).toBe('a1');
    expect(s.saque_d, 'o outro saque também fica ocupado').toBe('a1');
  });

  it('a de uma mão só ocupa a sua', () => {
    const itens = [{ instanceId: 'd1', slug: 'adaga', slot: 'saque_d' }];
    const s = G.getSlotsState(itens, CAT, 'Humano');
    expect(s.saque_d).toBe('d1');
    expect(s.saque_e).toBe(null);
  });

  it('guardar o arco manda a vizinha da espera para a mochila', () => {
    const itens = [
      { instanceId: 'a1', slug: 'arco', slot: null },
      { instanceId: 'e1', slug: 'escudo', slot: 'saque_d' },
    ];
    const depois = G.moverParaSaque(itens, 'a1', 'e', CAT, 'Humano');
    expect(depois.find((i) => i.instanceId === 'a1').slot).toBe('saque_e');
    expect(depois.find((i) => i.instanceId === 'e1').slot, 'o escudo sai da espera').toBe(null);
  });

  it('e guardar ao lado de um arco tira o arco da espera', () => {
    const itens = [
      { instanceId: 'a1', slug: 'arco', slot: 'saque_e' },
      { instanceId: 'd1', slug: 'adaga', slot: null },
    ];
    const depois = G.moverParaSaque(itens, 'd1', 'd', CAT, 'Humano');
    expect(depois.find((i) => i.instanceId === 'd1').slot).toBe('saque_d');
    expect(depois.find((i) => i.instanceId === 'a1').slot, 'o arco sai da espera').toBe(null);
  });

  it('duas peças de uma mão convivem nas duas casas', () => {
    const itens = [
      { instanceId: 'd1', slug: 'adaga', slot: 'saque_d' },
      { instanceId: 'e1', slug: 'escudo', slot: null },
    ];
    const depois = G.moverParaSaque(itens, 'e1', 'e', CAT, 'Humano');
    expect(depois.find((i) => i.instanceId === 'e1').slot).toBe('saque_e');
    expect(depois.find((i) => i.instanceId === 'd1').slot).toBe('saque_d');
  });
});
