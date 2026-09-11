/* ============================================================
   tecnica-fase2.test.js — as 26 entradas da Fase 2 no registro
   ============================================================
   Mesma disciplina do teste da Fase 1: o texto do banco é a fonte
   human-readable, o registro é a mecânica, e este arquivo trava o acordo
   entre os dois — em especial a duração e a dificuldade.

   Dados lidos do banco em 10/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let MAP, M;
beforeAll(() => {
  MAP = window.TECNICA_EFEITO_MAP;
  expect(MAP).toBeDefined();
  M = window.MotorBatalha;
});

// key | dificuldade | rodadas — cópia do banco.
const FASE2 = {
  ambidestria:         ['medio', 1],  aparar:            ['muito_dificil', 1],
  aprimorar:           ['muito_dificil', 3], ataque_oportuno: ['medio', 1],
  atravessar_oponente: ['medio', 1],  brutalizar:        ['dificil', 1],
  carga:               ['dificil', 1], carga_de_arremesso: ['medio', 1],
  carga_montada:       ['medio', 2],  combate_com_escudo: ['medio', 2],
  combate_nao_letal:   ['medio', 2],  contra_ataque:     ['dificil', 1],
  dano_agravado:       ['muito_dificil', 1], desequilibrar: ['muito_dificil', 1],
  desviar:             ['muito_dificil', 3], disparo_certeiro: ['medio', 3],
  escolta:             ['medio', 3],  esquiva:           ['muito_dificil', 1],
  flechadas_multiplas: ['muito_dificil', 1], forca_interior: ['medio', 2],
  golpe_duplo:         ['muito_dificil', 1], golpe_giratorio: ['dificil', 1],
  golpe_letal:         ['muito_dificil', 1], inibir_ataque: ['dificil', 1],
  intimidar:           ['muito_dificil', 1], leitura_de_batalha: ['medio', 2],
};

const TIPOS_FASE2 = ['ignora_eh','ignora_armadura','dano_pct','dano_recebido_pct',
  'ataque_extra','alvos_extras','sem_atacar','sem_tecnicas','sem_critico',
  'derrubado','evita_golpe','usa_defesa_de'];

describe('as 26 entradas', () => {
  it('todas existem no registro', () => {
    for (const key of Object.keys(FASE2)) {
      expect(MAP[key], `${key} faltando`).toBeDefined();
    }
  });

  it('todas são modo teste, com a dificuldade do banco', () => {
    for (const [key, [dif]] of Object.entries(FASE2)) {
      expect(MAP[key].modo, key).toBe('teste');
      expect(MAP[key].dificuldade, key).toBe(dif);
    }
  });

  it('a duração bate com o número de rodadas do banco', () => {
    for (const [key, [, rodadas]] of Object.entries(FASE2)) {
      expect(MAP[key].rodadas, key).toBe(rodadas);
    }
  });

  it('todo efeito usa um tipo da Fase 2 e traz valor fixo', () => {
    for (const key of Object.keys(FASE2)) {
      for (const ef of MAP[key].efeitos) {
        expect(TIPOS_FASE2, `${key}/${ef.tipo}`).toContain(ef.tipo);
        expect(Number.isFinite(ef.valor) || ef.valor === true, `${key}/${ef.tipo}`).toBe(true);
      }
    }
  });
});

describe('as primitivas caíram nas técnicas certas', () => {
  const tipos = (k) => MAP[k].efeitos.map((e) => e.tipo).sort();

  it('as 6 de ignora_eh', () => {
    for (const k of ['ataque_oportuno','atravessar_oponente','carga','carga_de_arremesso','carga_montada','golpe_letal']) {
      expect(tipos(k), k).toContain('ignora_eh');
    }
  });

  it('os percentuais de dano causado', () => {
    expect(MAP.brutalizar.efeitos.find((e) => e.tipo === 'dano_pct').valor).toBe(50);
    for (const k of ['ambidestria','aprimorar','dano_agravado','forca_interior']) {
      expect(MAP[k].efeitos.find((e) => e.tipo === 'dano_pct').valor, k).toBe(25);
    }
  });

  it('os percentuais de dano recebido são NEGATIVOS', () => {
    expect(MAP.aparar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-75);
    expect(MAP.desviar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-50);
    expect(MAP.combate_com_escudo.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-25);
  });

  it('as 3 de ataque extra', () => {
    for (const k of ['contra_ataque','golpe_duplo','flechadas_multiplas']) {
      expect(tipos(k), k).toContain('ataque_extra');
    }
  });

  // O nome deste teste prometia "+25%" e o corpo nunca verificava o valor —
  // só os tipos e o teto de alvos. Teste que anuncia mais do que confere é o
  // pior tipo, porque dá falsa segurança. Agora afirma os dois números.
  it('Golpe Giratório tem os DOIS: +25% de dano e até 3 alvos', () => {
    expect(tipos('golpe_giratorio')).toEqual(['alvos_extras','dano_pct']);
    expect(MAP.golpe_giratorio.efeitos.find((e) => e.tipo === 'alvos_extras').valor).toBe(3);
    expect(MAP.golpe_giratorio.efeitos.find((e) => e.tipo === 'dano_pct').valor).toBe(25);
  });

  it('as que atuam no alvo miram inimigo', () => {
    for (const k of ['ataque_oportuno','golpe_letal','inibir_ataque','intimidar','leitura_de_batalha','desequilibrar']) {
      expect(MAP[k].alvo, k).toBe('inimigo');
    }
  });

  it('as defensivas e as de auto-buff miram self', () => {
    for (const k of ['aparar','desviar','combate_com_escudo','esquiva','combate_nao_letal','ambidestria','aprimorar','brutalizar']) {
      expect(MAP[k].alvo, k).toBe('self');
    }
  });

  it('Escolta mira aliado e carrega usa_defesa_de', () => {
    expect(MAP.escolta.alvo).toBe('aliados');
    expect(tipos('escolta')).toContain('usa_defesa_de');
  });

  it('Esquiva é consumida por evento, não só por tempo', () => {
    expect(MAP.esquiva.consome_em).toBe('golpe_recebido');
  });
});

describe('o total do sistema', () => {
  it('o registro passa a cobrir 50 das 58 técnicas', () => {
    expect(Object.keys(MAP).length).toBe(50);
  });
});

describe('modsDoGolpe — quem fura o quê', () => {
  const comEfeito = (efeito, over = {}) => ({
    inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito }], ...over,
  });
  const vazio = (inst_id = 'b') => ({ inst_id, status_temp: [] });

  it('sem status, não fura nada', () => {
    expect(M.modsDoGolpe(vazio('a'), vazio('b'))).toEqual({ ignoraEh: false, ignoraArmadura: false });
  });

  // ignora_eh é ancorado no ATACANTE e mira UM alvo — Golpe Letal deixa VOCÊ
  // furar a EH daquele inimigo, não abre ele pro grupo inteiro.
  it('ignora_eh do atacante vale só contra o alvo declarado', () => {
    const atacante = comEfeito({ tipo: 'ignora_eh', valor: true, alvo_inst_id: 'b' });
    expect(M.modsDoGolpe(atacante, vazio('b')).ignoraEh).toBe(true);
    expect(M.modsDoGolpe(atacante, vazio('c')).ignoraEh).toBe(false);
  });

  // Derrubado é o contrário: condição NO ALVO, vale pra qualquer atacante.
  it('derrubado no alvo vale pra qualquer atacante', () => {
    const alvo = comEfeito({ tipo: 'derrubado', valor: true }, { inst_id: 'b' });
    expect(M.modsDoGolpe(vazio('a'), alvo).ignoraEh).toBe(true);
    expect(M.modsDoGolpe(vazio('z'), alvo).ignoraEh).toBe(true);
  });

  it('ignora_armadura do atacante, também por alvo', () => {
    const atacante = comEfeito({ tipo: 'ignora_armadura', valor: true, alvo_inst_id: 'b' });
    expect(M.modsDoGolpe(atacante, vazio('b')).ignoraArmadura).toBe(true);
    expect(M.modsDoGolpe(atacante, vazio('c')).ignoraArmadura).toBe(false);
  });
});

describe('bloqueios de turno', () => {
  const com = (tipo) => ({ inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito: { tipo, valor: true } }] });
  const sem = () => ({ inst_id: 'a', status_temp: [] });

  it('sem_atacar impede atacar, e só isso', () => {
    expect(M.podeAtacarAgora(com('sem_atacar'))).toBe(false);
    expect(M.podeUsarTecnicaAgora(com('sem_atacar'))).toBe(true);
  });

  it('sem_tecnicas impede técnica, e só isso', () => {
    expect(M.podeUsarTecnicaAgora(com('sem_tecnicas'))).toBe(false);
    expect(M.podeAtacarAgora(com('sem_tecnicas'))).toBe(true);
  });

  it('sem status, pode tudo', () => {
    expect(M.podeAtacarAgora(sem())).toBe(true);
    expect(M.podeUsarTecnicaAgora(sem())).toBe(true);
  });
});

describe('pa_ataque_extra', () => {
  const base = () => ({ inst_id: 'a', status: 'ativo', vb: 10, pa_max: 1, pa_rest: 1,
    mov_rest: 5, moveu_na_rodada: true, tecnica_livre_usada: true, pa_ataque_extra: 2, status_temp: [] });

  it('a virada de rodada zera o ataque extra, como zera o resto', () => {
    const { participante } = M.processarViradaDeRodada(base());
    expect(participante.pa_ataque_extra).toBe(0);
    expect(participante.tecnica_livre_usada).toBe(false);
    expect(participante.moveu_na_rodada).toBe(false);
  });
});

describe('aplicarEfeitoTecnica escreve pa_ataque_extra', () => {
  it('Golpe Duplo dá +1 ataque extra ao ator, além do status na mesa', () => {
    const p = { inst_id: 'a', status: 'ativo', pa_ataque_extra: 0, status_temp: [] };
    const r = M.aplicarEfeitoTecnica(p, { key: 'golpe_duplo', nome: 'Golpe Duplo' }, 0);
    expect(r.pa_ataque_extra).toBe(1);
    expect(r.status_temp.some((s) => s.efeito && s.efeito.tipo === 'ataque_extra')).toBe(true);
  });

  it('efeito que não é ataque_extra não mexe no contador', () => {
    const p = { inst_id: 'a', status: 'ativo', pa_ataque_extra: 0, status_temp: [] };
    const r = M.aplicarEfeitoTecnica(p, { key: 'brutalizar', nome: 'Brutalizar' }, 0);
    expect(r.pa_ataque_extra || 0).toBe(0);
  });
});

describe('temAcaoRestante — o ataque extra segura o turno', () => {
  it('PA zerado mas com ataque extra: o turno NÃO acabou', () => {
    expect(M.temAcaoRestante({ pa_rest: 0, pa_ataque_extra: 1 })).toBe(true);
  });
  it('PA zerado e sem ataque extra: acabou', () => {
    expect(M.temAcaoRestante({ pa_rest: 0, pa_ataque_extra: 0 })).toBe(false);
  });
  it('participante antigo, sem o campo, se comporta como antes', () => {
    expect(M.temAcaoRestante({ pa_rest: 1 })).toBe(true);
    expect(M.temAcaoRestante({ pa_rest: 0 })).toBe(false);
  });
});

/* Guarda de invariante, não teste de comportamento — e declarado como tal.
   O botão "Ação" do token do Mestre vive dentro da view grande, que não é
   exportada e não dá para montar isolada. Ele era a ÚLTIMA porta ainda
   decidindo fim de turno por PA cru: quem bancava um ataque extra chegava
   com pa_rest 0, temAcaoRestante segurava a vez corretamente, e o botão
   aparecia apagado — o Mestre só podia passar a vez e perder o golpe.
   Este teste não prova que a UI funciona; prova que ninguém reintroduziu a
   checagem crua de PA numa decisão de "pode agir". */
describe('nenhuma porta de ação decide por PA cru', () => {
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  // Comentários citam a regra antiga de propósito (é assim que se explica o
  // que mudou); só o código vivo é que não pode voltar a usá-la. Tira os
  // DOIS formatos: /* ... */, cujas linhas de continuação não têm marcador
  // nenhum (foi o que me escapou na primeira versão deste teste), e // até
  // o fim da linha.
  const codigoVivo = () => fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  it('nenhum código vivo compara pa_rest com zero', () => {
    expect(codigoVivo()).not.toMatch(/pa_rest\s*(===|==|<=|<)\s*0\b/);
  });

  it('o botão Ação do token usa temAcaoRestante', () => {
    expect(fonte).toMatch(/disabled=\{salvando \|\| !catalogos \|\| !temAcaoRestante\(p\)/);
  });
});

/* ============================================================
   Task 7 — ativação livre para qualquer modo, sem_critico, Escolta
   ============================================================ */
describe('ativação livre vale para QUALQUER modo (mudança da Fase 2)', () => {
  const ator = (over = {}) => ({ inst_id: 'a', pa_rest: 1, tecnica_livre_usada: false, status_temp: [], tecnicas_usadas: [], ...over });

  it('técnica de modo teste também é ativação livre', () => {
    const p = M.debitarCustoTecnica(ator(), 'golpe_letal');
    expect(p.pa_rest, 'não debita PA').toBe(1);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('técnica de modo total continua livre', () => {
    const p = M.debitarCustoTecnica(ator(), 'mira');
    expect(p.pa_rest).toBe(1);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('a SEGUNDA da rodada é bloqueada, seja qual for o modo', () => {
    const usado = ator({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(usado, { key: 'golpe_letal' }).pode).toBe(false);
    expect(M.podeAtivarTecnicaLivre(usado, { key: 'mira' }).pode).toBe(false);
  });

  it('técnica SEM entrada no registro continua debitando PA', () => {
    const p = M.debitarCustoTecnica(ator(), 'concentracao');
    expect(p.pa_rest).toBe(0);
    expect(p.tecnica_livre_usada, 'não consome a cota livre').toBe(false);
  });

  it('sem entrada no registro, a cota livre não bloqueia', () => {
    const usado = ator({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(usado, { key: 'concentracao' }).pode).toBe(true);
  });
});

describe('sem_critico', () => {
  it('o resultado Absurdo não vira crítico enquanto durar', () => {
    const com = { inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito: { tipo: 'sem_critico', valor: true } }] };
    expect(M.criticoPermitido(com)).toBe(false);
    expect(M.criticoPermitido({ inst_id: 'a', status_temp: [] })).toBe(true);
  });
});

/* Escolta — Ruling T7-A. O comentário do registro dizia o INVERSO ("quem
   ativa passa a defender com a defesa do aliado"). O texto da técnica no
   banco é inequívoco: "Um teste de Escolta (Médio) permite que 1 alvo use
   SUA defesa por 3 rodadas." Quem escolta EMPRESTA a própria defesa; o
   status fica no aliado escoltado e aponta de volta para a fonte. */
describe('Escolta empresta a defesa de quem escolta', () => {
  // O escolta é o tanque: armadura Pesada, defesa 12. O protegido é o mago:
  // armadura Leve, defesa 3.
  const escolta = { inst_id: 'e', nome: 'Escolta', status: 'ativo',
    defesa_valor: 12, defesa_sigla: 'P', status_temp: [] };
  const comStatus = (fonteInstId) => ({
    inst_id: 'b', nome: 'Protegido', status: 'ativo', defesa_valor: 3, defesa_sigla: 'L',
    status_temp: [{ id: 'tec_escolta', nome: 'Escolta', icone: '🫂', rodadas_rest: 3,
                    efeito: { tipo: 'usa_defesa_de', valor: true, fonte_inst_id: fonteInstId } }],
  });

  it('aplicarEfeitoTecnica grava fonte_inst_id no ALIADO', () => {
    const aliado = { inst_id: 'b', status: 'ativo', status_temp: [] };
    const r = M.aplicarEfeitoTecnica(aliado, { key: 'escolta', nome: 'Escolta' }, 0, { fonteInstId: 'e' });
    const ef = r.status_temp.find((s) => s.efeito.tipo === 'usa_defesa_de').efeito;
    expect(ef.fonte_inst_id).toBe('e');
  });

  /* Decisão do usuário (11/09/2026): empresta o VALOR e a CLASSE.

     Defesa neste sistema é sigla + valor, e colunaAtaque escolhe
     dano_l/dano_m/dano_p pela sigla. Emprestar só o número — como estava
     até a revisão final — produzia uma combinação melhor que os dois
     combatentes sozinhos: o atacante ficava na coluna L (a mais generosa,
     do mago) com o valor 12 (do guerreiro). */
  it('o protegido defende com a defesa da fonte: valor E classe', () => {
    const d = M.defesaComEscolta(comStatus('e'), [escolta, comStatus('e')]);
    expect(d.defesa_valor).toBe(12);
    expect(d.defesa_sigla, 'a classe vem junto, senão sobra o melhor dos dois').toBe('P');
  });

  it('fonte fora de campo: a defesa própria volta a valer, inteira', () => {
    const morto = { ...escolta, status: 'morto' };
    expect(M.defesaComEscolta(comStatus('e'), [morto, comStatus('e')]))
      .toEqual({ defesa_valor: 3, defesa_sigla: 'L' });
    expect(M.defesaComEscolta(comStatus('sumiu'), [escolta]), 'fonte inexistente')
      .toEqual({ defesa_valor: 3, defesa_sigla: 'L' });
  });

  it('sem o status, nada muda', () => {
    expect(M.defesaComEscolta({ inst_id: 'b', defesa_valor: 3, defesa_sigla: 'L', status_temp: [] }, [escolta]))
      .toEqual({ defesa_valor: 3, defesa_sigla: 'L' });
  });

  it('sem sigla no snapshot, assume L — é o default do resto do motor', () => {
    expect(M.defesaComEscolta({ inst_id: 'b', defesa_valor: 3, status_temp: [] }, []).defesa_sigla).toBe('L');
  });

  // A consequência prática: a coluna do atacante muda de verdade.
  it('a coluna do ataque muda de dano_l para dano_p quando o mago é escoltado', () => {
    const arma = { dano_l: 20, dano_m: 14, dano_p: 8, bonus_ga: 0 };
    const sozinho = M.defesaComEscolta({ inst_id: 'b', defesa_valor: 3, defesa_sigla: 'L', status_temp: [] }, []);
    const protegido = M.defesaComEscolta(comStatus('e'), [escolta, comStatus('e')]);
    expect(M.colunaAtaque(arma, sozinho), 'mago sozinho: 20 - 3').toBe(17);
    expect(M.colunaAtaque(arma, protegido), 'escoltado: 8 - 12').toBe(-4);
  });

  it('outros tipos de efeito não ganham fonte_inst_id', () => {
    const p = { inst_id: 'b', status: 'ativo', status_temp: [] };
    const r = M.aplicarEfeitoTecnica(p, { key: 'desequilibrar', nome: 'Desequilibrar' }, 0, { fonteInstId: 'e' });
    expect(r.status_temp.find((s) => s.efeito.tipo === 'derrubado').efeito.fonte_inst_id).toBeUndefined();
  });
});

/* Task 8 — o efeito de ignora_eh/ignora_armadura mora no ATACANTE, mas só
   vale contra o alvo declarado (Golpe Letal não abre a EH de todo mundo,
   só a de quem foi atacado). aplicarEfeitoTecnica grava alvo_inst_id
   quando opcoes.alvoInstId vem preenchido; modsDoGolpe (já coberto acima)
   é quem lê esse campo na hora de resolver o golpe. */
describe('efeitos ancorados no atacante gravam o alvo', () => {
  const lutador = () => ({ inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20,
    status: 'ativo', status_temp: [], tecnicas_usadas: [] });

  it('Golpe Letal grava alvo_inst_id no efeito do ATACANTE', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'golpe_letal', nome: 'Golpe Letal' }, 0, { alvoInstId: 'b' });
    const ef = p.status_temp.find((s) => s.efeito.tipo === 'ignora_eh').efeito;
    expect(ef.alvo_inst_id).toBe('b');
  });

  it('Disparo Certeiro (ignora_armadura) grava alvo_inst_id no efeito do ATACANTE', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'disparo_certeiro', nome: 'Disparo Certeiro' }, 0, { alvoInstId: 'b' });
    const ef = p.status_temp.find((s) => s.efeito.tipo === 'ignora_armadura').efeito;
    expect(ef.alvo_inst_id).toBe('b');
  });

  it('Desequilibrar grava derrubado no ALVO, sem alvo_inst_id', () => {
    const alvo = M.aplicarEfeitoTecnica({ ...lutador(), inst_id: 'b' }, { key: 'desequilibrar', nome: 'Desequilibrar' }, 0);
    const ef = alvo.status_temp.find((s) => s.efeito.tipo === 'derrubado').efeito;
    expect(ef.alvo_inst_id).toBeUndefined();
  });

  it('sem opcoes.alvoInstId, ignora_eh não grava âncora (auto-buff self, ex. Explorar Fraqueza)', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'golpe_letal', nome: 'Golpe Letal' }, 0);
    const ef = p.status_temp.find((s) => s.efeito.tipo === 'ignora_eh').efeito;
    expect(ef.alvo_inst_id).toBeUndefined();
  });

  it('outros tipos de efeito não ganham alvo_inst_id mesmo com opcoes.alvoInstId', () => {
    const alvo = M.aplicarEfeitoTecnica({ ...lutador(), inst_id: 'b' }, { key: 'desequilibrar', nome: 'Desequilibrar' }, 0, { alvoInstId: 'z' });
    const ef = alvo.status_temp.find((s) => s.efeito.tipo === 'derrubado').efeito;
    expect(ef.alvo_inst_id).toBeUndefined();
  });
});

/* Achado da revisão da Task 8: a regra de ancoragem vivia embutida nas duas
   cópias de aplicarTeste, sem teste nenhum. Derrubar a checagem de `alvo`
   quebraria Explorar Fraqueza em silêncio — ela carrega ignora_armadura mas
   é auto-buff, o destino dela já é o próprio testador, e ancorar estamparia
   o inst_id do ator nele mesmo: o match exato de modsDoGolpe nunca mais
   bateria e a técnica ficaria permanentemente sem efeito, com a suíte
   inteira verde. Extraída pra função pura e trancada aqui. */
describe('efeitoAncoraNoAtacante — quem vai no ator com âncora', () => {
  const reg = (k) => window.TECNICA_EFEITO_MAP[k];

  it('as 7 de alvo inimigo que furam EH ou armadura ancoram', () => {
    for (const k of ['ataque_oportuno', 'atravessar_oponente', 'carga',
      'carga_de_arremesso', 'carga_montada', 'golpe_letal', 'disparo_certeiro']) {
      expect(M.efeitoAncoraNoAtacante(reg(k)), k).toBe(true);
    }
  });

  // O caso que motivou a extração.
  it('Explorar Fraqueza fura armadura mas é self — NÃO ancora', () => {
    expect(reg('explorar_fraqueza').alvo, 'premissa do teste').toBe('self');
    expect(reg('explorar_fraqueza').efeitos.some((e) => e.tipo === 'ignora_armadura')).toBe(true);
    expect(M.efeitoAncoraNoAtacante(reg('explorar_fraqueza'))).toBe(false);
  });

  it('nenhuma entrada do registro sem ignora_* ancora', () => {
    for (const [k, r] of Object.entries(window.TECNICA_EFEITO_MAP)) {
      const fura = r.efeitos.some((e) => e.tipo === 'ignora_eh' || e.tipo === 'ignora_armadura');
      if (!fura) expect(M.efeitoAncoraNoAtacante(r), k + ' não fura nada').toBe(false);
    }
  });

  it('as duas condições são necessárias — nenhuma sozinha basta', () => {
    expect(M.efeitoAncoraNoAtacante({ alvo: 'inimigo', efeitos: [{ tipo: 'derrubado' }] }),
      'inimigo sem ignora_*').toBe(false);
    expect(M.efeitoAncoraNoAtacante({ alvo: 'self', efeitos: [{ tipo: 'ignora_eh' }] }),
      'ignora_* sem inimigo').toBe(false);
    expect(M.efeitoAncoraNoAtacante({ alvo: 'aliados', efeitos: [{ tipo: 'ignora_eh' }] }),
      'aliados também não').toBe(false);
    expect(M.efeitoAncoraNoAtacante({ alvo: 'inimigo', efeitos: [{ tipo: 'ignora_eh' }] })).toBe(true);
  });

  it('entrada malformada não explode', () => {
    for (const v of [null, undefined, {}, { alvo: 'inimigo' }, { alvo: 'inimigo', efeitos: null }]) {
      expect(M.efeitoAncoraNoAtacante(v), JSON.stringify(v)).toBe(false);
    }
  });
});

/* ============================================================
   Task 6b — Golpe Giratório: um giro, até 3 alvos
   ============================================================
   Ruling T6b-A: o alvo extra leva o MESMO golpe (mesmo d20, mesmo tier,
   mesmo dano base). Golpe Giratório é UM giro que alcança até 3 inimigos,
   não três ataques separados. O que continua sendo por alvo é o que é do
   alvo: esquiva, armadura, EH e o que modsDoGolpe resolve contra ele.
   ============================================================ */
describe('tetoDeAlvos', () => {
  const comAlvos = (...valores) => ({
    inst_id: 'a',
    status_temp: valores.map((v, i) => ({
      id: 's' + i, nome: 's', icone: '·', rodadas_rest: 1,
      efeito: { tipo: 'alvos_extras', valor: v },
    })),
  });

  it('sem status, um golpe atinge um alvo', () => {
    expect(M.tetoDeAlvos({ inst_id: 'a', status_temp: [] })).toBe(1);
    expect(M.tetoDeAlvos(null)).toBe(1);
    expect(M.tetoDeAlvos({})).toBe(1);
  });

  it('Golpe Giratório dá 3', () => {
    expect(M.tetoDeAlvos(comAlvos(3))).toBe(3);
  });

  // Somar seria transformar duas técnicas de 3 alvos num golpe de 6, que
  // nenhuma das duas promete.
  it('dois status não SOMAM os tetos — o maior manda', () => {
    expect(M.tetoDeAlvos(comAlvos(3, 2))).toBe(3);
    expect(M.tetoDeAlvos(comAlvos(2, 3))).toBe(3);
  });

  it('status de outro tipo não conta', () => {
    expect(M.tetoDeAlvos({ inst_id: 'a', status_temp: [
      { id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito: { tipo: 'dano_pct', valor: 25 } },
    ] })).toBe(1);
  });

  it('valor lixo não derruba o piso', () => {
    expect(M.tetoDeAlvos(comAlvos(null))).toBe(1);
    expect(M.tetoDeAlvos(comAlvos('três'))).toBe(1);
  });
});

describe('aplicarGolpeEmAlvo', () => {
  const lutador = (inst_id, extra) => ({
    tipo: 'pj', ref_id: inst_id, inst_id, nome: inst_id, ordem: 1,
    status: 'ativo', atual: false, vb: 20, pa_max: 2, pa_rest: 2,
    ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 3, ar_max: 3,
    karma: 0, karma_max: 0, status_temp: [], ...extra,
  });

  it('o dano entra pela cascata EH → AR → EF', () => {
    const arr = [lutador('atacante'), lutador('alvo')];
    const r = M.aplicarGolpeEmAlvo(arr, 0, 1, 6, false);
    expect(r[1].eh, 'EH absorve 5').toBe(0);
    expect(r[1].ar, 'AR absorve 1').toBe(2);
    expect(r[1].ef, 'nada sobra pra EF').toBe(10);
  });

  it('dano zero não mexe em nada e devolve o mesmo array', () => {
    const arr = [lutador('atacante'), lutador('alvo')];
    expect(M.aplicarGolpeEmAlvo(arr, 0, 1, 0, false)).toBe(arr);
  });

  it('índice inválido não explode nem altera nada', () => {
    const arr = [lutador('atacante'), lutador('alvo')];
    expect(M.aplicarGolpeEmAlvo(arr, 0, -1, 5, false)).toBe(arr);
    expect(M.aplicarGolpeEmAlvo(arr, 0, 99, 5, false)).toBe(arr);
    expect(M.aplicarGolpeEmAlvo(null, 0, 1, 5, false)).toBeNull();
  });

  // A razão de o helper existir: cada alvo resolve a PRÓPRIA esquiva.
  it('cada alvo gasta a própria Esquiva — um giro não esgota a do outro', () => {
    // consome_em mora no STATUS, nao dentro de efeito — e o que
    // consumirEvitaGolpe procura. Errei isso na primeira versao do teste e
    // ele passou reto pelo caminho da esquiva sem ninguem notar.
    const esquiva = {
      id: 'tec_esquiva', nome: 'Esquiva', icone: '🙅', rodadas_rest: 1,
      consome_em: 'golpe_recebido',
      efeito: { tipo: 'evita_golpe', valor: true },
    };
    const arr = [lutador('atacante'), lutador('b', { status_temp: [esquiva] }), lutador('c', { status_temp: [esquiva] })];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 6, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 6, false);
    expect(r[1].eh, 'b esquivou').toBe(5);
    expect(r[2].eh, 'c esquivou também').toBe(5);
    expect(r[1].status_temp, 'a esquiva de b foi consumida').toHaveLength(0);
    expect(r[2].status_temp, 'a de c também').toHaveLength(0);
  });

  it('crítico fura a EH do alvo extra igual ao do principal', () => {
    const arr = [lutador('atacante'), lutador('alvo')];
    const r = M.aplicarGolpeEmAlvo(arr, 0, 1, 4, true);
    expect(r[1].eh, 'crítico pula a EH').toBe(5);
    expect(r[1].ar).toBe(0);
    expect(r[1].ef).toBe(9);
  });

  // Cada alvo aplica os SEUS modificadores: a âncora do ignora_eh vale só
  // contra o alvo declarado, mesmo quando o giro alcança vários.
  it('ignora_eh ancorado vale só no alvo ancorado, não no extra', () => {
    const atacante = lutador('atacante', { status_temp: [{
      id: 'tec_golpe_letal', nome: 'Golpe Letal', icone: '💀', rodadas_rest: 1,
      efeito: { tipo: 'ignora_eh', valor: true, alvo_inst_id: 'b' },
    }] });
    const arr = [atacante, lutador('b'), lutador('c')];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 4, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 4, false);
    expect(r[1].eh, 'b: furou a EH').toBe(5);
    expect(r[1].ar).toBe(0);
    expect(r[2].eh, 'c: a EH segurou, não estava ancorado').toBe(1);
    expect(r[2].ar, 'c: a AR nem foi tocada').toBe(3);
  });

  it('derruba a concentração de quem sustentava magia e levou dano na EF', () => {
    const arr = [
      lutador('atacante'),
      lutador('alvo', { eh: 0, ar: 0 }),
      lutador('conjurador', { status_temp: [{
        id: 'sust_x', nome: 'Sustentando', icone: '✨', rodadas_rest: 99,
        sustentada_por: 'alvo',
      }] }),
    ];
    const r = M.aplicarGolpeEmAlvo(arr, 0, 1, 4, false);
    expect(r[1].ef, 'o dano chegou na EF').toBe(6);
  });
});

/* ============================================================
   O que a revisão final da Fase 2 encontrou
   ============================================================ */

/* F1 (Critical) — a Esquiva estava MORTA em produção.

   `consome_em` mora na entrada do registro; aplicarEfeitoTecnica montava o
   status sem copiar o campo, e consumirEvitaGolpe procura por
   `s.consome_em`. Na mesa: o jogador passava num teste Muito Difícil,
   gastava a ativação livre da rodada, via o chip 🙅 — e levava o golpe
   inteiro.

   Passou da Task 5 até 11/09/2026 com a suíte verde porque TODOS os testes
   de evita_golpe montavam o status À MÃO, já com o campo. Testar o
   consumidor com uma fixture que o produtor nunca produziria é o buraco
   exato: as duas metades estavam certas isoladamente e nunca se falavam.
   Estes testes usam o que a PRODUÇÃO monta, de ponta a ponta. */
describe('F1 — o status que a PRODUÇÃO monta é consumível', () => {
  const alvo = () => ({
    inst_id: 'a', status: 'ativo', eh: 10, eh_max: 10,
    ar: 0, ar_max: 0, ef: 20, ef_max: 20, status_temp: [],
  });

  it('aplicarEfeitoTecnica copia consome_em do registro pro status', () => {
    const r = M.aplicarEfeitoTecnica(alvo(), { key: 'esquiva', nome: 'Esquiva' }, 0);
    expect(r.status_temp[0].consome_em).toBe('golpe_recebido');
  });

  it('e o status que ela monta É consumido por consumirEvitaGolpe', () => {
    const r = M.aplicarEfeitoTecnica(alvo(), { key: 'esquiva', nome: 'Esquiva' }, 0);
    expect(M.consumirEvitaGolpe(r).evitou, 'o elo que faltava').toBe(true);
  });

  it('ponta a ponta: ativou Esquiva pela produção, o golpe não entra', () => {
    const esquivando = M.aplicarEfeitoTecnica(alvo(), { key: 'esquiva', nome: 'Esquiva' }, 0);
    const arr = [{ ...alvo(), inst_id: 'atacante' }, esquivando];
    const r = M.aplicarGolpeEmAlvo(arr, 0, 1, 6, false);
    expect(r[1].eh, 'esquivou: EH intacta').toBe(10);
    expect(r[1].status_temp, 'e a esquiva foi gasta').toHaveLength(0);
  });

  it('técnica SEM consome_em não ganha o campo à toa', () => {
    const r = M.aplicarEfeitoTecnica(alvo(), { key: 'brutalizar', nome: 'Brutalizar' }, 0);
    expect('consome_em' in r.status_temp[0]).toBe(false);
  });

  // Guarda geral: qualquer entrada do registro que declare consome_em tem
  // de chegar no status. Hoje só a Esquiva declara; a próxima entra coberta.
  it('vale para TODA entrada do registro que declare consome_em', () => {
    for (const [key, reg] of Object.entries(window.TECNICA_EFEITO_MAP)) {
      if (!reg.consome_em) continue;
      const r = M.aplicarEfeitoTecnica(alvo(), { key, nome: key }, 0);
      expect(r.status_temp[0].consome_em, key).toBe(reg.consome_em);
    }
  });
});

/* F2 (Critical) — o alvo extra do Golpe Giratório perdia a PRÓPRIA redução.

   O dano vinha finalizado contra o alvo PRINCIPAL e era reusado tal e qual
   nos extras, então eles perdiam dano_recebido_pct (Aparar −75%, Desviar
   −50%, Combate com Escudo −25%) e mod_dano_max — nenhum dos dois mora na
   cascata, que era o que a Ruling T6b-A tinha assumido cobrir.

   O custo declarado na ruling estava subestimado, e o pior é que a fase
   fazia as PRÓPRIAS técnicas defensivas não funcionarem contra o próprio
   giro dela. aplicarGolpeEmAlvo passou a receber o dano BRUTO e chamar
   danoFinal contra cada alvo. */
describe('F2 — cada alvo aplica a própria redução de dano', () => {
  const lutador = (inst_id, extra) => ({
    tipo: 'pj', ref_id: inst_id, inst_id, nome: inst_id, ordem: 1,
    status: 'ativo', atual: false, vb: 20, pa_max: 2, pa_rest: 2,
    ef: 100, ef_max: 100, eh: 0, eh_max: 0, ar: 0, ar_max: 0,
    karma: 0, karma_max: 0, status_temp: [], ...extra,
  });
  const comReducao = (inst_id, pct) => lutador(inst_id, { status_temp: [{
    id: 'tec_aparar', nome: 'Aparar', icone: '🛡️', rodadas_rest: 1,
    efeito: { tipo: 'dano_recebido_pct', valor: pct },
  }] });

  it('quem aparou leva menos, mesmo sendo alvo EXTRA', () => {
    // A é o principal e não aparou; B é extra e aparou 75%.
    const arr = [lutador('atacante'), lutador('A'), comReducao('B', -75)];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 20, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 20, false);
    expect(r[1].ef, 'A levou os 20').toBe(80);
    expect(r[2].ef, 'B levou 5, não 20').toBe(95);
  });

  it('e o contrário: a redução de um NÃO protege o outro', () => {
    const arr = [lutador('atacante'), comReducao('A', -75), lutador('B')];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 20, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 20, false);
    expect(r[1].ef, 'A aparou').toBe(95);
    expect(r[2].ef, 'B não aparou e leva cheio').toBe(80);
  });

  it('o bônus de dano do ATACANTE vale em todos os alvos', () => {
    const atacante = lutador('atacante', { status_temp: [{
      id: 'tec_brutalizar', nome: 'Brutalizar', icone: '💢', rodadas_rest: 1,
      efeito: { tipo: 'dano_pct', valor: 50 },
    }] });
    const arr = [atacante, lutador('A'), lutador('B')];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 20, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 20, false);
    expect(r[1].ef).toBe(70);
    expect(r[2].ef, 'o mesmo giro, o mesmo +50%').toBe(70);
  });

  it('mod_dano_max do alvo também entra por alvo', () => {
    const arr = [lutador('atacante'), lutador('A'), lutador('B', { status_temp: [{
      id: 'tec_posicionamento', nome: 'Posicionamento', icone: '🎯', rodadas_rest: 1,
      efeito: { tipo: 'mod_dano_max', valor: -8 },
    }] })];
    let r = M.aplicarGolpeEmAlvo(arr, 0, 1, 20, false);
    r = M.aplicarGolpeEmAlvo(r, 0, 2, 20, false);
    expect(r[1].ef).toBe(80);
    expect(r[2].ef, 'B tirou 8 do dano máximo').toBe(88);
  });

  it('a redução não vira cura nem dano negativo', () => {
    const arr = [lutador('atacante'), comReducao('A', -200)];
    const r = M.aplicarGolpeEmAlvo(arr, 0, 1, 20, false);
    expect(r[1].ef).toBe(100);
  });
});

/* F3 (Important) — o log da mesa dizia "+true".

   textoEfeitoTecnica usava `primeiro.valor || 0` para todo modo 'teste'.
   Como `true > 0` é verdadeiro, 15 das 26 técnicas da Fase 2 escreviam
   "+true" no log COMPARTILHADO, que todo jogador da mesa lê. E Aparar, que
   é −75%, escrevia "−75", que se lê como 75 de dano fixo.

   Ninguém foi dono do texto das primitivas booleanas: a Task 8 só dizia
   que a mensagem "já nomeia o alvo", o que era verdade e insuficiente. */
describe('F3 — o texto do efeito no log', () => {
  const aplicado = (alvos, valor) => ({ alvos, valor });

  it('efeito liga/desliga não imprime número nenhum', () => {
    const t = M.textoEfeitoTecnica('golpe_letal', aplicado(['Grok']), 'Eu');
    expect(t).toContain('Grok');
    expect(t, 'nada de "+true"').not.toMatch(/true/);
    expect(t, 'nem um número solto').not.toMatch(/[+-]\d/);
  });

  it('as 15 booleanas da Fase 2 estão todas limpas', () => {
    const booleanas = Object.entries(window.TECNICA_EFEITO_MAP)
      .filter(([, r]) => r.efeitos.some((e) => e.valor === true))
      .map(([k]) => k);
    expect(booleanas.length, 'premissa: existem booleanas').toBeGreaterThan(10);
    for (const key of booleanas) {
      expect(M.textoEfeitoTecnica(key, aplicado(['Grok']), 'Eu'), key).not.toMatch(/true/);
    }
  });

  it('percentual aparece COM o símbolo de porcentagem', () => {
    expect(M.textoEfeitoTecnica('brutalizar', aplicado([]), 'Eu')).toMatch(/\+50%/);
    expect(M.textoEfeitoTecnica('aparar', aplicado([]), 'Eu'), 'não é 75 de dano').toMatch(/-75%/);
  });

  it('o valor que escala com o total continua sem %', () => {
    const t = M.textoEfeitoTecnica('mira', aplicado([], 7), 'Eu');
    expect(t).toMatch(/\+7\b/);
    expect(t).not.toMatch(/%/);
  });

  it('postura defensiva continua mostrando o sinal negativo do total', () => {
    expect(M.textoEfeitoTecnica('postura_defensiva', aplicado([], 5), 'Eu')).toMatch(/\+5\b/);
  });

  it('teste que falhou continua dizendo que falhou', () => {
    expect(M.textoEfeitoTecnica('golpe_letal', null, 'Eu')).toMatch(/não aplicado/);
  });

  it('técnica sem registro continua narrativa', () => {
    expect(M.textoEfeitoTecnica('concentracao', aplicado(['Grok']), 'Eu')).toMatch(/narrativ/);
  });
});

// Traduz os índices que alvosExtrasEfetivos devolve para nomes, que é o que
// os testes abaixo querem afirmar.
const alvosNomes = (arr, atacante, alvoIdx, ids) =>
  M.alvosExtrasEfetivos(arr, atacante, alvoIdx, ids).map((i) => arr[i].nome);

/* F7 (Minor) — o ataque extra prendia o turno de quem não podia atacar. */
describe('F7 — ataque extra sob sem_atacar não segura o turno', () => {
  const inibido = (extra) => ({
    inst_id: 'a', pa_rest: 0, pa_ataque_extra: 1,
    status_temp: [{ id: 'tec_inibir_ataque', nome: 'Inibir Ataque', icone: '🚫',
                    rodadas_rest: 1, efeito: { tipo: 'sem_atacar', valor: true } }],
    ...extra,
  });

  it('com sem_atacar, o extra NÃO conta como ação pendente', () => {
    // A aba Arma é o único consumidor do extra e está desabilitada; contar
    // o extra fazia o auto-passe nunca disparar e o turno ficava preso.
    expect(M.temAcaoRestante(inibido())).toBe(false);
  });

  it('mas PA normal ainda conta, mesmo inibido — sobra magia, item, técnica', () => {
    expect(M.temAcaoRestante(inibido({ pa_rest: 1 }))).toBe(true);
  });

  it('sem a inibição, o extra volta a segurar o turno', () => {
    expect(M.temAcaoRestante({ inst_id: 'a', pa_rest: 0, pa_ataque_extra: 1, status_temp: [] })).toBe(true);
  });
});

/* F10 (Minor) — o teto de alvos e o débito do ataque não tinham teste
   NENHUM. Apagar o slice deixava um payload forjado varrer a mesa; apagar
   o ramo do extra tornava o ataque adicional infinito. Os dois estavam
   embutidos nos handlers, que não são exportados — por isso viraram
   funções puras antes de ganhar teste. */
describe('F10 — alvosExtrasEfetivos', () => {
  const p = (inst_id, extra) => ({ inst_id, nome: inst_id, status_temp: [], ...extra });
  const giro = p('atacante', { status_temp: [{
    id: 'tec_golpe_giratorio', nome: 'Golpe Giratório', icone: '🌪️', rodadas_rest: 1,
    efeito: { tipo: 'alvos_extras', valor: 3 },
  }] });
  const mesa = [giro, p('A'), p('B'), p('C'), p('D')];

  it('teto 3 = alvo principal + 2 extras, não 3 extras', () => {
    expect(alvosNomes(mesa, giro, 1, ['B', 'C', 'D'])).toEqual(['B', 'C']);
  });

  it('sem status de multi-alvo, NENHUM extra passa', () => {
    expect(alvosNomes(mesa, p('atacante'), 1, ['B', 'C'])).toEqual([]);
  });

  it('o alvo principal não é atingido duas vezes', () => {
    expect(alvosNomes(mesa, giro, 1, ['A', 'B'])).toEqual(['B']);
  });

  it('id repetido não gasta duas vagas nem bate duas vezes', () => {
    expect(alvosNomes(mesa, giro, 1, ['B', 'B', 'C'])).toEqual(['B', 'C']);
  });

  it('quem não está na mesa é ignorado sem consumir vaga', () => {
    expect(alvosNomes(mesa, giro, 1, ['fantasma', 'B', 'C'])).toEqual(['B', 'C']);
  });

  it('payload forjado com a mesa inteira ainda respeita o teto', () => {
    expect(alvosNomes(mesa, giro, 1, ['A', 'B', 'C', 'D']).length).toBe(2);
  });

  it('entrada inválida devolve lista vazia', () => {
    expect(M.alvosExtrasEfetivos(null, giro, 1, ['B'])).toEqual([]);
    expect(M.alvosExtrasEfetivos(mesa, giro, 1, null)).toEqual([]);
    expect(M.alvosExtrasEfetivos(mesa, giro, 1, [])).toEqual([]);
  });
});

describe('F10 — debitarCustoAtaque', () => {
  const ator = (extra) => ({ inst_id: 'a', pa_rest: 2, pa_ataque_extra: 0, karma: 10, ...extra });

  it('sem ataque extra, paga pa_rest', () => {
    const r = M.debitarCustoAtaque(ator(), 'arma', 0);
    expect(r.pa_rest).toBe(1);
    expect(r.pa_ataque_extra).toBe(0);
  });

  it('com ataque extra, gasta o EXTRA e preserva o PA', () => {
    const r = M.debitarCustoAtaque(ator({ pa_ataque_extra: 1 }), 'arma', 0);
    expect(r.pa_ataque_extra, 'o extra foi gasto').toBe(0);
    expect(r.pa_rest, 'o PA normal fica intacto').toBe(2);
  });

  it('o extra NÃO paga magia — só a aba Arma', () => {
    const r = M.debitarCustoAtaque(ator({ pa_ataque_extra: 1 }), 'magia', 3);
    expect(r.pa_ataque_extra, 'intocado').toBe(1);
    expect(r.pa_rest).toBe(1);
    expect(r.karma).toBe(7);
  });

  // Sem esta regra o ataque extra seria infinito.
  it('dois ataques seguidos com 1 extra: o segundo já paga PA', () => {
    let r = M.debitarCustoAtaque(ator({ pa_rest: 1, pa_ataque_extra: 1 }), 'arma', 0);
    expect(r.pa_ataque_extra).toBe(0);
    expect(r.pa_rest).toBe(1);
    r = M.debitarCustoAtaque(r, 'arma', 0);
    expect(r.pa_rest).toBe(0);
  });

  it('nada fica negativo', () => {
    const r = M.debitarCustoAtaque(ator({ pa_rest: 0, karma: 0 }), 'arma', 5);
    expect(r.pa_rest).toBe(0);
    expect(r.karma).toBe(0);
  });
});
