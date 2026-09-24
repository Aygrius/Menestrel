/* ============================================================
   status-atravessa-batalha.test.js — o status entra e sai do combate
   ============================================================
   "Lembrando que o status da batalha também persiste depois que a luta acaba,
    mas o mestre pode remover e adicionar fora da batalha também."
    (usuário, 17/09/2026)

   O ciclo do sistema é: a ficha guarda o estado → o personagem ENTRA em
   combate com ele → ao SAIR, a ficha é atualizada. O status era o único que
   não fazia a volta: estadoAoEncerrar devolvia só vitalidade e condições, e
   montarSnapshots entrava com status_temp vazio. Este arquivo trava as duas
   pontas.

   `estadoAoEncerrar` é puro e já tinha cobertura em ciclo-ficha-batalha.test.js
   — aqui vai só o que mudou.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/game-data.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import './batalha.jsx';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');

let estadoAoEncerrar;
beforeAll(() => {
  estadoAoEncerrar = window.MotorBatalha.estadoAoEncerrar;
  expect(estadoAoEncerrar).toBeTypeOf('function');
});

const HOJE = { dia: 11, mes: 11, ano: 1500 };
const PARTICIPANTE = {
  tipo: 'pj', ref_id: 7, status: 'ativo',
  ef: 12, eh: 6, ar: 0, karma: 3,
  condicoes: { hidratacao: -10 },
  status_temp: [
    { id: 'veneno:a', nome: 'Envenenado', icone: '☠', rodadas_rest: 2, efeito: { tipo: 'dano_por_rodada', valor: 2 } },
    { id: 'fc_defesa', nome: 'Defesa −5', icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } },
  ],
};

describe('a volta: o que o combate deixa na ficha', () => {
  it('o status temporário vira estado_atual.status', () => {
    const novo = estadoAoEncerrar({}, PARTICIPANTE, HOJE);
    expect(novo.status.map((s) => s.id)).toEqual(['veneno:a']);
  });

  /* rodadas_rest null é "até o fim da batalha" — e o fim chegou. */
  it('o que durava até o fim da batalha não atravessa', () => {
    const novo = estadoAoEncerrar({}, PARTICIPANTE, HOJE);
    expect(novo.status.find((s) => s.id === 'fc_defesa')).toBeUndefined();
  });

  it('o que atravessa ganha vencimento no calendário da mesa', () => {
    const novo = estadoAoEncerrar({}, PARTICIPANTE, HOJE);
    expect(novo.status[0].vence_em).toEqual({ dia: 12, mes: 11, ano: 1500 });
  });

  it('e o efeito mecânico vai junto — senão ele volta decorativo', () => {
    const novo = estadoAoEncerrar({}, PARTICIPANTE, HOJE);
    expect(novo.status[0].efeito).toEqual({ tipo: 'dano_por_rodada', valor: 2 });
  });

  it('vitalidade e condições continuam voltando como antes', () => {
    const novo = estadoAoEncerrar({}, PARTICIPANTE, HOJE);
    expect(novo.vitalidade).toMatchObject({ ef: 12, eh: 6, ka: 3 });
    expect(novo.condicoes).toEqual({ hidratacao: -10 });
  });

  /* As duas guardas antigas não podem ter sido afrouxadas por esta mudança. */
  it('PJ ausente continua não escrevendo nada', () => {
    expect(estadoAoEncerrar({}, { ...PARTICIPANTE, ausente: true }, HOJE)).toBeNull();
  });

  /* Morto já sobrevive pela EF no piso, que montarSnapshots relê — não
     precisa de uma segunda fonte que possa discordar dela. */
  it('morto continua voltando pela EF no piso', () => {
    const novo = estadoAoEncerrar({}, { ...PARTICIPANTE, status: 'morto' }, HOJE);
    expect(novo.vitalidade.ef).toBe(window.MotorBatalha.EF_MORTE);
  });
});

/* A ida (montarSnapshots) lê o banco e monta o PJ inteiro — não dá para
   chamá-la aqui sem rede. O que se afirma é o contrato no fonte: mesmo caminho
   de log-eventos.test.jsx. */
describe('a ida: o que a ficha entrega ao combate', () => {
  it('o snapshot do PJ nasce com o status guardado, não vazio', () => {
    const i = fonte.indexOf('status_temp: (typeof statusVigentes');
    expect(i, 'o snapshot do PJ tem que semear status_temp da ficha').toBeGreaterThan(0);
    const trecho = fonte.slice(i, i + 220);
    expect(trecho).toMatch(/estado_atual && pj\.estado_atual\.status/);
  });

  /* Sem o filtro, um veneno vencido há três dias de jogo reapareceria na
     próxima luta. */
  it('e os vencidos ficam de fora, pela data da mesa', () => {
    const i = fonte.indexOf('status_temp: (typeof statusVigentes');
    expect(fonte.slice(i, i + 220)).toMatch(/statusVigentes\([\s\S]*?dataJogo\)/);
  });

  it('a data usada no encerramento é buscada na hora, não a da largada', () => {
    const i = fonte.indexOf('const finalizarEncerramento');
    const trecho = fonte.slice(i, i + 2200);
    expect(trecho).toMatch(/const dataJogoFim/);
    expect(trecho).toMatch(/estadoAoEncerrar\(estadoAtual, p, dataJogoFim\)/);
  });
});
