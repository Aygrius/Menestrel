/* ============================================================
   motor-batalha.test.js — funções PURAS do motor de combate
   ============================================================
   Objetivo: CONGELAR o comportamento atual (regras confirmadas em
   06/07/2026) antes das mudanças da Fase 1 (autodano, status_temp
   mecânico, técnica, críticos). Cada mudança de regra deve alterar
   um teste daqui DE PROPÓSITO, nunca por acidente.

   Regras documentadas nos comentários do batalha.jsx:
   • Cascata EH→AR→EF; crítico pula EH; EF fica NEGATIVA até o piso
     EF_MORTE (−15). EF entre 0 e −14 = caído (desmaiado); ≤ −15 = morto.
   • EH chegar a 0 desmaia SEMPRE (guarda eh_max > 0).
   • Tiers de ARMA arredondam pra CIMA (ceil, espelho do Arsenal da
     Ficha); MAGIA arredonda pra baixo (floor — decisão em aberto);
     CRIATURA usa campos dano_25/50/75/100 e floor nos tiers E/A.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './batalha.jsx';

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M).toBeDefined();
});

/* ────────────────────────── pontosAcaoPJ ────────────────────────── */
describe('pontosAcaoPJ', () => {
  it('Guerreiro e Ladino têm 2 PA', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Guerreiro' })).toBe(2);
    expect(M.pontosAcaoPJ({ profissao: 'Ladino' })).toBe(2);
  });
  it('Guerreiro/Ladino ESPECIALIZADO tem 4 PA', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Guerreiro', especializacao: 'Cavaleiro' })).toBe(4);
    expect(M.pontosAcaoPJ({ profissao: 'Ladino', especializacao: 'Assassino' })).toBe(4);
  });
  it('casters têm 1 PA — especialização NÃO muda', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Mago' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Sacerdote' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Bardo', especializacao: 'Menestrel' })).toBe(1);
  });
});

/* ──────────────────────── aplicarDanoCascata ─────────────────────── */
describe('aplicarDanoCascata', () => {
  const pj = (over = {}) => ({
    eh: 10, ar: 5, ef: 10, eh_max: 10, status: 'ativo', ...over,
  });

  it('EF_MORTE é −15 (piso de morte documentado)', () => {
    expect(M.EF_MORTE).toBe(-15);
  });

  it('dano comum consome EH primeiro, sem transbordo', () => {
    const r = M.aplicarDanoCascata(5, pj());
    expect(r).toMatchObject({ eh: 5, ar: 5, ef: 10, status: 'ativo', sobra: 0 });
  });

  it('transborda EH→AR→EF na ordem', () => {
    const r = M.aplicarDanoCascata(7, pj({ eh: 3, ar: 2, eh_max: 3 }));
    expect(r).toMatchObject({ eh: 0, ar: 0, ef: 8, sobra: 0 });
  });

  it('EH chegar a 0 desmaia SEMPRE (com eh_max > 0)', () => {
    const r = M.aplicarDanoCascata(7, pj({ eh: 3, ar: 2, eh_max: 3 }));
    expect(r.status).toBe('desmaiado');
  });

  it('criatura sem pool de EH (eh_max 0) NÃO vive desmaiada por eh===0', () => {
    const r = M.aplicarDanoCascata(2, pj({ eh: 0, eh_max: 0, ar: 5, ef: 10 }));
    expect(r).toMatchObject({ ar: 3, ef: 10, status: 'ativo' });
  });

  it('CRÍTICO pula a EH e começa na AR', () => {
    const r = M.aplicarDanoCascata(6, pj(), true);
    expect(r).toMatchObject({ eh: 10, ar: 0, ef: 9, status: 'ativo', sobra: 0 });
  });

  it('EF fica NEGATIVA: 0 a −14 = caído (desmaiado), não morto', () => {
    const r = M.aplicarDanoCascata(10, pj({ eh: 0, ar: 0, ef: 2, eh_max: 0 }));
    expect(r).toMatchObject({ ef: -8, status: 'desmaiado', sobra: 0 });
  });

  it('EF ≤ −15 mata (transição de ativo OU desmaiado)', () => {
    const r = M.aplicarDanoCascata(15, pj({ eh: 0, ar: 0, ef: 0, eh_max: 0, status: 'desmaiado' }));
    expect(r).toMatchObject({ ef: -15, status: 'morto', sobra: 0 });
  });

  it('overkill: EF trava no piso −15 e o excedente vira sobra', () => {
    const r = M.aplicarDanoCascata(20, pj({ eh: 0, ar: 0, ef: 0, eh_max: 0 }));
    expect(r).toMatchObject({ ef: -15, status: 'morto', sobra: 5 });
  });

  it('quem já está morto continua morto e não absorve nada (tudo vira sobra)', () => {
    const r = M.aplicarDanoCascata(9, pj({ eh: 0, ar: 0, ef: -15, eh_max: 0, status: 'morto' }));
    expect(r).toMatchObject({ ef: -15, status: 'morto', sobra: 9 });
  });

  it('dano negativo/nulo não faz nada; dano fracionário arredonda pra baixo', () => {
    expect(M.aplicarDanoCascata(-5, pj())).toMatchObject({ eh: 10, sobra: 0 });
    expect(M.aplicarDanoCascata(null, pj())).toMatchObject({ eh: 10, sobra: 0 });
    expect(M.aplicarDanoCascata(4.9, pj())).toMatchObject({ eh: 6 });
  });

  it('não muta o participante original', () => {
    const original = pj();
    M.aplicarDanoCascata(8, original);
    expect(original).toMatchObject({ eh: 10, ar: 5, ef: 10, status: 'ativo' });
  });
});

/* ─────────────────────────── colunaAtaque ────────────────────────── */
describe('colunaAtaque', () => {
  const arma = { dano_l: 5, dano_m: 3, dano_p: 1, bonus_ga: 2 };

  it('guarda de nulos → 0', () => {
    expect(M.colunaAtaque(null, {})).toBe(0);
    expect(M.colunaAtaque(arma, null)).toBe(0);
  });

  it('mapeia defesa L/M/P pro campo de dano certo e subtrai defesa_valor', () => {
    expect(M.colunaAtaque(arma, { defesa_sigla: 'L', defesa_valor: 4 })).toBe(3);  // 5+2−4
    expect(M.colunaAtaque(arma, { defesa_sigla: 'M', defesa_valor: 4 })).toBe(1);  // 3+2−4
    expect(M.colunaAtaque(arma, { defesa_sigla: 'P', defesa_valor: 4 })).toBe(-1); // 1+2−4
  });

  it("sigla 'T' e sigla ausente caem no dano_l (comportamento atual)", () => {
    expect(M.colunaAtaque(arma, { defesa_sigla: 'T', defesa_valor: 0 })).toBe(7);
    expect(M.colunaAtaque(arma, { defesa_valor: 0 })).toBe(7);
  });

  it('sigla minúscula é normalizada; campo de dano ausente vale 0', () => {
    expect(M.colunaAtaque(arma, { defesa_sigla: 'm', defesa_valor: 0 })).toBe(5);
    expect(M.colunaAtaque({ bonus_ga: 2 }, { defesa_sigla: 'M', defesa_valor: 4 })).toBe(-2);
  });
});

/* ──────────────────────────── danoNoTier ─────────────────────────── */
describe('danoNoTier', () => {
  it('FC, R, código nulo e arma nula → 0', () => {
    expect(M.danoNoTier({ dano: 10 }, 'FC')).toBe(0);
    expect(M.danoNoTier({ dano: 10 }, 'R')).toBe(0);
    expect(M.danoNoTier({ dano: 10 }, null)).toBe(0);
    expect(M.danoNoTier(null, 'MD')).toBe(0);
  });

  it('ARMA arredonda pra CIMA (ceil — espelho do Arsenal da Ficha)', () => {
    const arma = { dano: 7 };
    expect(M.danoNoTier(arma, 'F')).toBe(2);   // ceil(1.75)
    expect(M.danoNoTier(arma, 'M')).toBe(4);   // ceil(3.5)
    expect(M.danoNoTier(arma, 'D')).toBe(6);   // ceil(5.25)
    expect(M.danoNoTier(arma, 'MD')).toBe(7);
    expect(M.danoNoTier(arma, 'E')).toBe(9);   // ceil(8.75)
    expect(M.danoNoTier(arma, 'A')).toBe(11);  // ceil(10.5)
  });

  it('MAGIA arredonda pra BAIXO (floor — decisão em aberto registrada)', () => {
    const magia = { dano: 7, fonte: 'magia' };
    expect(M.danoNoTier(magia, 'F')).toBe(1);   // floor(1.75)
    expect(M.danoNoTier(magia, 'M')).toBe(3);   // floor(3.5)
    expect(M.danoNoTier(magia, 'D')).toBe(5);   // floor(5.25)
    expect(M.danoNoTier(magia, 'MD')).toBe(7);
    expect(M.danoNoTier(magia, 'E')).toBe(8);   // floor(8.75)
    expect(M.danoNoTier(magia, 'A')).toBe(10);  // floor(10.5)
  });

  it('CRIATURA usa campos próprios; E/A derivam do dano_100 com floor', () => {
    const cri = { fonte: 'criatura', dano_25: 2, dano_50: 4, dano_75: 6, dano_100: 9 };
    expect(M.danoNoTier(cri, 'F')).toBe(2);
    expect(M.danoNoTier(cri, 'M')).toBe(4);
    expect(M.danoNoTier(cri, 'D')).toBe(6);
    expect(M.danoNoTier(cri, 'MD')).toBe(9);
    expect(M.danoNoTier(cri, 'E')).toBe(11);  // floor(11.25)
    expect(M.danoNoTier(cri, 'A')).toBe(13);  // floor(13.5)
    expect(M.danoNoTier(cri, 'X')).toBe(0);
  });
});

/* ───────────────────────── ordenarIniciativa ─────────────────────── */
describe('ordenarIniciativa', () => {
  const snaps = [
    { nome: 'Zeca',  tipo: 'pj',       vb: 5 },
    { nome: 'Cão',   tipo: 'criatura', vb: 9 },
    { nome: 'Ana',   tipo: 'criatura', vb: 5 },
    { nome: 'Bruxo', tipo: 'pj',       vb: 5 },
  ];

  it('ordena por VB desc; empate: PJ antes de criatura; depois alfabético', () => {
    const r = M.ordenarIniciativa(snaps);
    expect(r.map((p) => p.nome)).toEqual(['Cão', 'Bruxo', 'Zeca', 'Ana']);
  });

  it('atribui ordem 1..n e não muta a lista original', () => {
    const r = M.ordenarIniciativa(snaps);
    expect(r.map((p) => p.ordem)).toEqual([1, 2, 3, 4]);
    expect(snaps.map((p) => p.nome)).toEqual(['Zeca', 'Cão', 'Ana', 'Bruxo']);
    expect(snaps[0].ordem).toBeUndefined();
  });
});

/* ───────────────────────── interpolarCritico ─────────────────────── */
describe('interpolarCritico', () => {
  const arma = { dano: 10 };

  it('interpola tiers com a mesma regra da arma (ceil) e d175 = ceil(base×1.75)', () => {
    const msg = 'Sofre ${danos.d50} de dano, ou ${d175} se falhar (${danos.d50}).';
    expect(M.interpolarCritico(msg, arma)).toBe('Sofre 5 de dano, ou 18 se falhar (5).');
  });

  it('interpola todos os tokens', () => {
    const msg = '${danos.d25}/${danos.d50}/${danos.d75}/${danos.d100}/${d125}/${d150}';
    expect(M.interpolarCritico(msg, arma)).toBe('3/5/8/10/13/15');
  });

  it('guardas: msg nula → string vazia; arma nula → msg intacta', () => {
    expect(M.interpolarCritico(null, arma)).toBe('');
    expect(M.interpolarCritico('${d125}', null)).toBe('${d125}');
  });

  it('CRITICOS_TABELA tem os 5 tipos × 8 severidades', () => {
    const tipos = Object.keys(M.CRITICOS_TABELA);
    expect(tipos.length).toBe(5);
    for (const t of tipos) expect(Object.keys(M.CRITICOS_TABELA[t]).length).toBe(8);
  });
});

/* ═══════════════════════ FASE 1.1 — Falha Crítica ═══════════════════════ */

describe('FALHA_CRITICA_TABELA (segundo dado do q=0)', () => {
  it('mesmos 5 tipos da CRITICOS_TABELA × 8 qualidades', () => {
    expect(Object.keys(M.FALHA_CRITICA_TABELA).sort())
      .toEqual(Object.keys(M.CRITICOS_TABELA).sort());
    for (const t of Object.keys(M.FALHA_CRITICA_TABELA)) {
      expect(Object.keys(M.FALHA_CRITICA_TABELA[t]).length).toBe(8);
    }
  });

  it('interpola com os MESMOS tokens do crítico (arma dano 10 → q0 = 10)', () => {
    const msg = M.interpolarCritico(M.FALHA_CRITICA_TABELA.CORTE[0], { dano: 10 });
    expect(msg).toContain('10 de dano na EF');
    expect(msg).toContain('desmaia');
    expect(msg).not.toContain('${');
  });

  it('lógica invertida: q3 tem dano leve, q7 não tem consequência mecânica', () => {
    expect(M.FALHA_CRITICA_TABELA.MAGIA[3]).toContain('${danos.d25}');
    expect(M.FALHA_CRITICA_TABELA.MAGIA[7]).not.toContain('dano');
  });
});

describe('FC_EFEITOS (mecânica por qualidade do segundo dado)', () => {
  it('tiers de dano: q0=100% (MD), q1=75% (D), q2=50% (M), q3=25% (F); q4+ sem dano', () => {
    expect(M.FC_EFEITOS[0].danoTier).toBe('MD');
    expect(M.FC_EFEITOS[1].danoTier).toBe('D');
    expect(M.FC_EFEITOS[2].danoTier).toBe('M');
    expect(M.FC_EFEITOS[3].danoTier).toBe('F');
    for (const q of [4, 5, 6, 7]) expect(M.FC_EFEITOS[q].danoTier).toBeUndefined();
  });

  it('q0 desmaia; q2/q4 = sem_acoes (2 e 1 rodadas); q1/q5/q6 duram até o fim da batalha (null)', () => {
    expect(M.FC_EFEITOS[0].desmaia).toBe(true);
    expect(M.FC_EFEITOS[2].status).toMatchObject({ rodadas_rest: 2, efeito: { tipo: 'sem_acoes' } });
    expect(M.FC_EFEITOS[4].status).toMatchObject({ rodadas_rest: 1, efeito: { tipo: 'sem_acoes' } });
    expect(M.FC_EFEITOS[1].status).toMatchObject({ rodadas_rest: null, efeito: { tipo: 'mod_coluna', valor: -7 } });
    expect(M.FC_EFEITOS[5].status).toMatchObject({ rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } });
    expect(M.FC_EFEITOS[6].status).toMatchObject({ rodadas_rest: null, efeito: { tipo: 'mod_vb', valor: -5 } });
    expect(M.FC_EFEITOS[7]).toEqual({});
  });
});

describe('aplicarFalhaCritica', () => {
  const atacante = (over = {}) => ({
    eh: 10, ar: 3, ef: 10, eh_max: 10, status: 'ativo', status_temp: [], ...over,
  });
  const arma = { dano: 10 };

  it('q0: 100% de dano PULANDO a EH (AR→EF) + desmaia forçado mesmo com EF > 0', () => {
    const { participante: p, dano } = M.aplicarFalhaCritica(atacante(), arma, 0);
    expect(dano).toBe(10);
    expect(p.eh).toBe(10);          // EH intacta — regra confirmada
    expect(p.ar).toBe(0);           // AR absorveu 3
    expect(p.ef).toBe(3);           // EF levou 7
    expect(p.status).toBe('desmaiado'); // forçado pelo "e você desmaia"
  });

  it('q0 que mata na cascata: morto tem precedência sobre o desmaio', () => {
    const { participante: p } = M.aplicarFalhaCritica(
      atacante({ ar: 0, ef: -10, eh_max: 0, status: 'desmaiado' }), { dano: 10 }, 0);
    expect(p.status).toBe('morto'); // −10 − 10 = −20 ≤ EF_MORTE
  });

  it('q1: 75% de dano + status Ações −7 até o fim da batalha; q3: só 25% de dano', () => {
    const r1 = M.aplicarFalhaCritica(atacante(), arma, 1);
    expect(r1.dano).toBe(8);        // ceil(7.5) — regra de arma
    expect(r1.participante.status_temp).toHaveLength(1);
    expect(r1.participante.status_temp[0]).toMatchObject({ rodadas_rest: null, efeito: { tipo: 'mod_coluna', valor: -7 } });
    const r3 = M.aplicarFalhaCritica(atacante(), arma, 3);
    expect(r3.dano).toBe(3);        // ceil(2.5)
    expect(r3.participante.status_temp).toHaveLength(0);
  });

  it('magia usa floor no tier (q3 com dano 10 → 2)', () => {
    const r = M.aplicarFalhaCritica(atacante(), { dano: 10, fonte: 'magia' }, 3);
    expect(r.dano).toBe(2);         // floor(2.5)
  });

  it('q4: sem dano, ganha Caído (sem_acoes, 1 rodada); q7: no-op absoluto', () => {
    const a = atacante();
    const r4 = M.aplicarFalhaCritica(a, arma, 4);
    expect(r4.dano).toBe(0);
    expect(r4.participante.ef).toBe(10);
    expect(M.statusTemEfeito(r4.participante, 'sem_acoes')).toBe(true);
    const r7 = M.aplicarFalhaCritica(a, arma, 7);
    expect(r7.participante).toBe(a); // mesma referência — nada mudou
    expect(r7.dano).toBe(0);
  });

  it('ids de status aplicados são únicos (dois FC q4 no mesmo participante)', () => {
    const r1 = M.aplicarFalhaCritica(atacante(), arma, 4);
    const r2 = M.aplicarFalhaCritica(r1.participante, arma, 4);
    const ids = r2.participante.status_temp.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('efeitos de status — helpers puros', () => {
  const st = (tipo, valor, rodadas = null) => ({ id: 'x' + Math.random(), nome: tipo, rodadas_rest: rodadas, efeito: valor === undefined ? { tipo } : { tipo, valor } });

  it('somaEfeitosStatus soma só o tipo pedido; ignora status narrativos (sem efeito)', () => {
    const p = { status_temp: [st('mod_coluna', -7), st('mod_coluna', -2), st('mod_defesa', -5), { id: 'n', nome: 'Envenenado', rodadas_rest: 3 }] };
    expect(M.somaEfeitosStatus(p, 'mod_coluna')).toBe(-9);
    expect(M.somaEfeitosStatus(p, 'mod_defesa')).toBe(-5);
    expect(M.somaEfeitosStatus(p, 'mod_vb')).toBe(0);
    expect(M.somaEfeitosStatus(null, 'mod_vb')).toBe(0);
  });

  it('statusTemEfeito e vbEfetivo', () => {
    const p = { vb: 12, status_temp: [st('sem_acoes', undefined, 2), st('mod_vb', -5)] };
    expect(M.statusTemEfeito(p, 'sem_acoes')).toBe(true);
    expect(M.statusTemEfeito({ status_temp: [] }, 'sem_acoes')).toBe(false);
    expect(M.vbEfetivo(p)).toBe(7);
    expect(M.vbEfetivo({ vb: 12 })).toBe(12);
  });

  it('decrementarStatusTemp: null persiste (fim da batalha); numérico decrementa e expira', () => {
    const arr = [st('mod_defesa', -5, null), st('sem_acoes', undefined, 2), st('sem_acoes', undefined, 1)];
    const d1 = M.decrementarStatusTemp(arr);
    expect(d1).toHaveLength(2);
    expect(d1[0].rodadas_rest).toBe(null);
    expect(d1[1].rodadas_rest).toBe(1);
    const d2 = M.decrementarStatusTemp(d1);
    expect(d2).toHaveLength(1);
    expect(d2[0].efeito.tipo).toBe('mod_defesa');
    expect(M.decrementarStatusTemp(null)).toEqual([]);
  });

  it('ordenarIniciativaEfetiva: mod_vb muda a ordem sem alterar o vb real', () => {
    const a = { nome: 'Ana',  tipo: 'pj', vb: 10, status_temp: [st('mod_vb', -5)] };
    const b = { nome: 'Beto', tipo: 'pj', vb: 8 };
    const r = M.ordenarIniciativaEfetiva([a, b]);
    expect(r.map((p) => p.nome)).toEqual(['Beto', 'Ana']); // 8 > (10−5)
    expect(r.find((p) => p.nome === 'Ana').vb).toBe(10);   // vb real preservado
    expect(r.map((p) => p.ordem)).toEqual([1, 2]);
  });
});

/* ═══════════════════ FASE 1.2 — Dano por rodada (Envenenado) ═══════════════════ */

describe('aplicarDanoDiretoEF (veneno: ignora EH e AR)', () => {
  const pj = (over = {}) => ({ eh: 10, ar: 5, ef: 10, eh_max: 10, status: 'ativo', ...over });

  it('atinge SÓ a EF — EH e AR ficam intactas', () => {
    const r = M.aplicarDanoDiretoEF(4, pj());
    expect(r).toMatchObject({ eh: 10, ar: 5, ef: 6, status: 'ativo', sobra: 0 });
  });

  it('EF ≤ 0 derruba; ≤ −15 mata; overkill vira sobra', () => {
    expect(M.aplicarDanoDiretoEF(12, pj())).toMatchObject({ ef: -2, status: 'desmaiado' });
    expect(M.aplicarDanoDiretoEF(25, pj())).toMatchObject({ ef: -15, status: 'morto', sobra: 0 });
    expect(M.aplicarDanoDiretoEF(30, pj())).toMatchObject({ ef: -15, status: 'morto', sobra: 5 });
  });

  it('desmaiado continua sofrendo veneno; morto não absorve nada', () => {
    const caido = M.aplicarDanoDiretoEF(3, pj({ ef: -5, status: 'desmaiado' }));
    expect(caido).toMatchObject({ ef: -8, status: 'desmaiado' });
    const morto = M.aplicarDanoDiretoEF(9, pj({ ef: -15, status: 'morto' }));
    expect(morto).toMatchObject({ ef: -15, status: 'morto', sobra: 9 });
  });
});

describe('processarDanoPorRodada', () => {
  const veneno = (valor) => ({ id: 'v' + valor, nome: 'Envenenado', rodadas_rest: 3, efeito: { tipo: 'dano_por_rodada', valor } });

  it('soma múltiplos venenos e detalha os eventos pro log', () => {
    const p = { eh: 10, ar: 5, ef: 10, eh_max: 10, status: 'ativo', status_temp: [veneno(2), veneno(3), { id: 'n', nome: 'Cego', rodadas_rest: 2 }] };
    const r = M.processarDanoPorRodada(p);
    expect(r.total).toBe(5);
    expect(r.participante.ef).toBe(5);
    expect(r.participante.eh).toBe(10);
    expect(r.eventos).toEqual([{ nome: 'Envenenado', valor: 2 }, { nome: 'Envenenado', valor: 3 }]);
  });

  it('sem efeito de dano → mesma referência, zero eventos', () => {
    const p = { ef: 10, status: 'ativo', status_temp: [{ id: 'n', nome: 'Cego', rodadas_rest: 2 }] };
    const r = M.processarDanoPorRodada(p);
    expect(r.participante).toBe(p);
    expect(r.eventos).toEqual([]);
  });
});

describe('processarViradaDeRodada / montarNovaRodada', () => {
  const veneno = (valor, rodadas) => ({ id: 'v', nome: 'Envenenado', rodadas_rest: rodadas, efeito: { tipo: 'dano_por_rodada', valor } });

  it('veneno MORDE ANTES do decremento: 1 rodada restante causa dano e expira', () => {
    const p = { nome: 'A', tipo: 'pj', eh: 10, ar: 0, ef: 10, eh_max: 10, pa_max: 2, pa_rest: 0, status: 'ativo', status_temp: [veneno(3, 1)] };
    const r = M.processarViradaDeRodada(p);
    expect(r.participante.ef).toBe(7);              // mordeu
    expect(r.participante.status_temp).toHaveLength(0); // e expirou
    expect(r.participante.pa_rest).toBe(2);         // PA resetado
    expect(r.total).toBe(3);
  });

  it('morto e desistente não sofrem veneno (status decrementa mesmo assim)', () => {
    const m = M.processarViradaDeRodada({ nome: 'M', status: 'morto', ef: -15, status_temp: [veneno(5, 2)] });
    expect(m.participante.ef).toBe(-15);
    expect(m.eventos).toEqual([]);
    expect(m.participante.status_temp[0].rodadas_rest).toBe(1);
    const d = M.processarViradaDeRodada({ nome: 'D', status: 'desistiu', ef: 8, status_temp: [veneno(5, 2)] });
    expect(d.participante.ef).toBe(8);
  });

  it('montarNovaRodada: veneno que derruba tira o participante da elegibilidade de "atual"', () => {
    const a = { inst_id: 'i-ana',  nome: 'Ana',  tipo: 'pj', vb: 10, eh: 0, ar: 0, ef: 2, eh_max: 0, pa_max: 2, status: 'ativo', status_temp: [veneno(5, 2)], ordem: 1, atual: false };
    const b = { inst_id: 'i-beto', nome: 'Beto', tipo: 'pj', vb: 8,  eh: 5, ar: 0, ef: 9, eh_max: 5, pa_max: 2, status: 'ativo', status_temp: [], ordem: 2, atual: false };
    const { participantes: r, eventos } = M.montarNovaRodada([a, b]);
    const ana = r.find((p) => p.nome === 'Ana');
    expect(ana.status).toBe('desmaiado');           // 2 − 5 = −3
    expect(ana.atual).toBe(false);
    expect(r.find((p) => p.nome === 'Beto').atual).toBe(true);
    expect(eventos).toEqual([{ nome: 'Ana', eventos: [{ nome: 'Envenenado', valor: 5 }], total: 5 }]);
  });

  it('montarNovaRodada sem venenos: eventos vazio e primeiro elegível por vb efetiva', () => {
    const semAcao = { id: 's', nome: 'Caído', rodadas_rest: 2, efeito: { tipo: 'sem_acoes' } };
    const a = { inst_id: 'i-ana',  nome: 'Ana',  tipo: 'pj', vb: 10, ef: 9, pa_max: 2, status: 'ativo', status_temp: [semAcao], ordem: 1 };
    const b = { inst_id: 'i-beto', nome: 'Beto', tipo: 'pj', vb: 8,  ef: 9, pa_max: 2, status: 'ativo', status_temp: [], ordem: 2 };
    const { participantes: r, eventos } = M.montarNovaRodada([a, b]);
    expect(eventos).toEqual([]);
    expect(r.find((p) => p.nome === 'Ana').atual).toBe(false);  // sem_acoes pula
    expect(r.find((p) => p.nome === 'Beto').atual).toBe(true);
  });
});
