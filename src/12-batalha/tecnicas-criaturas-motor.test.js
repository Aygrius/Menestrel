/* ============================================================
   tecnicas-criaturas-motor.test.js — as 7 técnicas novas entram no motor
   ============================================================
   "As novas técnicas de combate podem ser adicionadas ao motor." (usuário,
   15/09/2026). O painel de verificação acusava 7 fora do motor — todas de
   criatura (permissao vazia), cadastradas pelo editor depois de 14/09/2026:

     Ataques Múltiplos    teste Muito Difícil → ataca 3 vezes (ataque_extra 2)
     Bote Venenoso        total no ataque; SE ACERTAR a EF, envenena 1 × 5
     Bote Selvagem        total no ataque; SE ACERTAR a EF, sem ações × 5
     Carga de Quadrúpede  teste Médio → ignora a EH do alvo por 2 rodadas
     Carga Selvagem       total na coluna de ataque por 4 rodadas
     Hipnose              teste Difícil → sem ações e 2 de dano na EF × 5
     Prender              teste Médio → sem ações × 3

   Os dois Botes pedem uma peça que o motor não tinha: um efeito que fica no
   ATACANTE e dispara no alvo quando o golpe chega à energia física
   (`ao_acertar_ef`). É gasto no golpe, acerte ou não — o bote é aquele golpe.

   Os textos abaixo são cópias literais do banco em 15/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, MAP;
beforeAll(() => { M = window.MotorBatalha; MAP = window.TECNICA_EFEITO_MAP; });

const NO_BANCO = [
  { key: 'ataques_multiplos', nome: 'Ataques Múltiplos',
    efeito: 'Um teste de Ataques Múltiplos (Muito Difícil) permite atacar 3 vezes na mesma rodada por 1 rodada.' },
  { key: 'bote', nome: 'Bote Venenoso',
    efeito: 'Seu total de Bote Venenoso é adicionado à sua coluna de ataque por 1 rodada, se acertar a energia física do alvo, ele será envenenado e sofrerá 1 de dano na energia física por 5 rodadas.' },
  { key: 'bote_selvagem', nome: 'Bote Selvagem',
    efeito: 'Seu total de Bote Selvagem é adicionado à sua coluna de ataque por 1 rodada, se acertar a energia física do alvo, ele ficará sem ações por 5 rodadas.' },
  { key: 'carga_de_quadrupede', nome: 'Carga de Quadrúpede',
    efeito: 'Um teste de Carga Selvagem (Médio) ignora a energia heroica do alvo por 2 rodadas.' },
  { key: 'carga_selvagem', nome: 'Carga Selvagem',
    efeito: 'Seu total de Carga Selvagem é adicionado à sua coluna de ataque por 4 rodadas.' },
  { key: 'hipnose', nome: 'Hipnose',
    efeito: 'Um teste de Hipnose (Difícil) impede o alvo de agir e causa 2 de dano na energia física por 5 rodadas.' },
  { key: 'prender', nome: 'Prender',
    efeito: 'Um teste de Prender (Médio) impede o alvo de realizar ações por 3 rodadas.' },
];

const lutador = (over = {}) => ({
  inst_id: 'p1', nome: 'Lutador', tipo: 'pj', status: 'ativo',
  eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 30, ef_max: 30, res: 0,
  status_temp: [], ...over,
});
const serpente = (over = {}) => lutador({ inst_id: 'c1', nome: 'Serpente', tipo: 'criatura', ...over });

describe('as 7 estão no registro, e a verificação concorda com o texto', () => {
  it('nenhuma fora do motor, nenhuma divergente', () => {
    const r = window.auditarTecnicas(NO_BANCO);
    expect(r.fora.map((x) => x.key)).toEqual([]);
    expect(r.divergente).toEqual([]);
    expect(r.ok).toHaveLength(7);
  });

  it('cada uma com a forma que o texto pede', () => {
    expect(MAP.ataques_multiplos).toMatchObject({ modo: 'teste', alvo: 'self', rodadas: 1, dificuldade: 'muito_dificil',
      efeitos: [{ tipo: 'ataque_extra', valor: 2 }] });
    expect(MAP.carga_de_quadrupede).toMatchObject({ modo: 'teste', alvo: 'inimigo', rodadas: 2, dificuldade: 'medio',
      efeitos: [{ tipo: 'ignora_eh', valor: true }] });
    expect(MAP.carga_selvagem).toMatchObject({ modo: 'total', alvo: 'self', rodadas: 4,
      efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] });
    expect(MAP.hipnose).toMatchObject({ modo: 'teste', alvo: 'inimigo', rodadas: 5, dificuldade: 'dificil' });
    expect(MAP.hipnose.efeitos.map((e) => e.tipo).sort()).toEqual(['dano_por_rodada', 'sem_acoes']);
    expect(MAP.hipnose.efeitos.find((e) => e.tipo === 'dano_por_rodada').valor).toBe(2);
    expect(MAP.prender).toMatchObject({ modo: 'teste', alvo: 'inimigo', rodadas: 3, dificuldade: 'medio',
      efeitos: [{ tipo: 'sem_acoes', valor: true }] });
  });
});

describe('Ataques Múltiplos — três ataques na rodada', () => {
  it('dá 2 ataques extras além do normal', () => {
    const p = M.aplicarEfeitoTecnica(serpente(), NO_BANCO[0], 0);
    expect(p.pa_ataque_extra).toBe(2);
  });
});

describe('Hipnose e Prender — o alvo fica sem ações', () => {
  it('Prender: sem ações por 3 rodadas', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), NO_BANCO[6], 0);
    expect(M.statusTemEfeito(alvo, 'sem_acoes')).toBe(true);
    expect(alvo.status_temp[0].rodadas_rest).toBe(3);
  });

  it('Hipnose: sem ações E 2 de dano na EF a cada virada', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), NO_BANCO[5], 0);
    expect(M.statusTemEfeito(alvo, 'sem_acoes')).toBe(true);
    expect(M.processarDanoPorRodada(alvo).total).toBe(2);
  });
});

describe('os Botes — o efeito dispara SE o golpe chegar à energia física', () => {
  const comBote = (tec) => M.aplicarEfeitoTecnica(serpente(), tec, 6);

  it('o total vai na coluna de ataque por 1 rodada, como a Mira', () => {
    const s = comBote(NO_BANCO[1]);
    expect(M.somaEfeitosStatus(s, 'mod_ataque')).toBe(6);
  });

  it('Bote Venenoso: golpe que chega à EF envenena o alvo — 1 de dano por 5 rodadas', () => {
    let arr = [comBote(NO_BANCO[1]), lutador()];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 8, false);
    expect(arr[1].ef).toBe(22);
    const veneno = arr[1].status_temp.find((s) => s.efeito && s.efeito.tipo === 'dano_por_rodada');
    expect(veneno).toMatchObject({ rodadas_rest: 5, efeito: { tipo: 'dano_por_rodada', valor: 1 } });
    expect(M.processarDanoPorRodada(arr[1]).total).toBe(1);
  });

  it('Bote Selvagem: golpe que chega à EF deixa o alvo sem ações por 5 rodadas', () => {
    let arr = [comBote(NO_BANCO[2]), lutador()];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 8, false);
    expect(M.statusTemEfeito(arr[1], 'sem_acoes')).toBe(true);
    expect(arr[1].status_temp.find((s) => s.efeito.tipo === 'sem_acoes').rodadas_rest).toBe(5);
  });

  it('golpe que a energia heroica segura inteiro NÃO envenena', () => {
    let arr = [comBote(NO_BANCO[1]), lutador({ eh: 20, eh_max: 20 })];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 8, false);
    expect(arr[1].ef).toBe(30);
    expect(arr[1].status_temp).toEqual([]);
  });

  it('golpe que a armadura segura NÃO envenena', () => {
    let arr = [comBote(NO_BANCO[1]), lutador({ ar: 10, ar_max: 10, res: 5 })];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 8, false);
    expect(arr[1].status_temp).toEqual([]);
  });

  it('o bote é gasto no golpe — acertando ou não — e o bônus de ataque fica até a rodada virar', () => {
    const s = M.consumirEfeitosDoGolpe(comBote(NO_BANCO[1]));
    expect(s.status_temp.some((x) => x.efeito.tipo === 'ao_acertar_ef')).toBe(false);
    expect(M.somaEfeitosStatus(s, 'mod_ataque')).toBe(6);
    let arr = [s, lutador()];
    arr = M.aplicarGolpeEmAlvo(arr, 0, 1, 8, false);
    expect(arr[1].status_temp).toEqual([]);
  });
});
