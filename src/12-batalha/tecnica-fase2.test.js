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
  const escolta = { inst_id: 'e', nome: 'Escolta', status: 'ativo', defesa_valor: 12, status_temp: [] };
  const comStatus = (fonteInstId) => ({
    inst_id: 'b', nome: 'Protegido', status: 'ativo', defesa_valor: 3,
    status_temp: [{ id: 'tec_escolta', nome: 'Escolta', icone: '🫂', rodadas_rest: 3,
                    efeito: { tipo: 'usa_defesa_de', valor: true, fonte_inst_id: fonteInstId } }],
  });

  it('aplicarEfeitoTecnica grava fonte_inst_id no ALIADO', () => {
    const aliado = { inst_id: 'b', status: 'ativo', status_temp: [] };
    const r = M.aplicarEfeitoTecnica(aliado, { key: 'escolta', nome: 'Escolta' }, 0, { fonteInstId: 'e' });
    const ef = r.status_temp.find((s) => s.efeito.tipo === 'usa_defesa_de').efeito;
    expect(ef.fonte_inst_id).toBe('e');
  });

  it('o protegido defende com a defesa da fonte, não com a sua', () => {
    expect(M.defesaBaseComEscolta(comStatus('e'), [escolta, comStatus('e')])).toBe(12);
  });

  it('fonte fora de campo: a defesa própria volta a valer', () => {
    const morto = { ...escolta, status: 'morto' };
    expect(M.defesaBaseComEscolta(comStatus('e'), [morto, comStatus('e')])).toBe(3);
    expect(M.defesaBaseComEscolta(comStatus('sumiu'), [escolta]), 'fonte inexistente').toBe(3);
  });

  it('sem o status, nada muda', () => {
    expect(M.defesaBaseComEscolta({ inst_id: 'b', defesa_valor: 3, status_temp: [] }, [escolta])).toBe(3);
  });

  it('outros tipos de efeito não ganham fonte_inst_id', () => {
    const p = { inst_id: 'b', status: 'ativo', status_temp: [] };
    const r = M.aplicarEfeitoTecnica(p, { key: 'desequilibrar', nome: 'Desequilibrar' }, 0, { fonteInstId: 'e' });
    expect(r.status_temp.find((s) => s.efeito.tipo === 'derrubado').efeito.fonte_inst_id).toBeUndefined();
  });
});
