/* ============================================================
   tempo-da-batalha.test.js — 14/11/2026 (auditoria, item 6)
   ============================================================
   Usuário: "Considere que cada ação é 30 segundos no jogo para cada
   combatente, e a rodada será calculada com base nesse tempo. Inclusive esse
   cálculo pode ser usado para passar o tempo de forma automática depois da
   batalha." Decidido com ele:
     • rodada = 30 s × combatentes que agem nela;
     • o relógio guarda minutos por dentro;
     • status com prazo: o tempo que falta vira rodadas na entrada, e as
       rodadas que sobram viram tempo na saída;
     • o Mestre confirma o avanço do relógio no encerramento.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.segundosDaRodada).toBeTypeOf('function'); });

const HOJE = { dia: 11, mes: 11, ano: 1500, hora: 14, minuto: 0 };

describe('o instante em minutos (helpers)', () => {
  it('soma minutos e vira a hora e o dia', () => {
    expect(window.somarMinutosAoInstante(HOJE, 25)).toEqual({ dia: 11, mes: 11, ano: 1500, hora: 14, minuto: 25 });
    expect(window.somarMinutosAoInstante({ ...HOJE, hora: 23, minuto: 50 }, 20))
      .toEqual({ dia: 12, mes: 11, ano: 1500, hora: 0, minuto: 10 });
  });
  it('sem hora nem minuto vale meia-noite: o vence_em antigo não muda de sentido', () => {
    expect(window.instanteEmMinutos({ dia: 12, mes: 11, ano: 1500 }))
      .toBe(window.instanteEmMinutos({ dia: 11, mes: 11, ano: 1500, hora: 24 }));
  });
  it('sem data, null', () => {
    expect(window.somarMinutosAoInstante({ hora: 3 }, 10)).toBeNull();
  });
});

describe('a rodada: 30 s × quem age', () => {
  const p = (status, extra) => ({ inst_id: Math.random().toString(36), status, ...extra });
  it('conta só quem está de pé', () => {
    const lista = [p('ativo'), p('ativo'), p('desmaiado'), p('morto'), p('ativo', { ausente: true })];
    expect(M.combatentesQueAgem(lista)).toBe(2);
    expect(M.segundosDaRodada(lista)).toBe(60);
  });
  it('a montaria em uso não tem vez própria', () => {
    const cav = { inst_id: 'c', status: 'ativo', montaria: { inst_id: 'm' } };
    const cavalo = { inst_id: 'm', status: 'ativo', montado_por: 'c' };
    expect(M.combatentesQueAgem([cav, cavalo])).toBe(1);
  });
  it('ninguém de pé ainda conta uma ação', () => {
    expect(M.segundosDaRodada([p('morto')])).toBe(30);
  });
  it('a virada soma uma rodada em quem agiu nela', () => {
    const lista = [p('ativo', { ordem: 1, pa_max: 1 }), p('desmaiado', { ordem: 2 })];
    const { participantes } = M.montarNovaRodada(lista);
    expect(participantes.find((q) => q.inst_id === lista[0].inst_id).rodadas_de_pe).toBe(1);
    expect(participantes.find((q) => q.inst_id === lista[1].inst_id).rodadas_de_pe).toBeUndefined();
  });
  it('duração = rodadas viradas + a rodada em curso; minutos arredondam para cima', () => {
    // 5 combatentes, 3 rodadas viradas, a 4ª em curso: 4 × 5 × 30 s = 10 min.
    const lista = Array.from({ length: 5 }, () => p('ativo', { rodadas_de_pe: 3 }));
    expect(M.duracaoDaBatalhaSegundos(lista)).toBe(600);
    expect(M.minutosDaBatalha(lista)).toBe(10);
    expect(M.minutosDaBatalha([p('ativo')])).toBe(1);   // 30 s andam 1 min
  });
});

describe('status com prazo ↔ rodadas', () => {
  const veneno = (extra) => ({ id: 'veneno:a', nome: 'Envenenado', rodadas_rest: null,
    efeito: { tipo: 'dano_por_rodada', valor: 2 }, ...extra });

  it('na entrada, o tempo que falta vira rodadas (arredonda para cima)', () => {
    // vence às 14h02; rodada de 60 s → 2 rodadas.
    const r = window.prazoEmRodadas(veneno({ vence_em: { ...HOJE, minuto: 2 } }), HOJE, 60);
    expect(r.rodadas_rest).toBe(2);
    expect(r.vence_em, 'agora conta rodadas, sem a data').toBeUndefined();
  });
  it('prazo em dias (vence à meia-noite) vale muitas rodadas', () => {
    const r = window.prazoEmRodadas(veneno({ vence_em: { dia: 12, mes: 11, ano: 1500 } }), HOJE, 60);
    expect(r.rodadas_rest).toBe(10 * 60);   // 10 h até a meia-noite
  });
  it('sem prazo segue sem rodadas e com vence_em null', () => {
    const r = window.prazoEmRodadas(veneno({ vence_em: null }), HOJE, 60);
    expect(r.rodadas_rest).toBeNull();
    expect(r.vence_em).toBeNull();
  });
  it('na saída, as rodadas que sobram viram minutos a partir do fim da luta', () => {
    const fim = { ...HOJE, hora: 14, minuto: 25 };
    const [st] = window.statusAoEncerrarBatalha([veneno({ rodadas_rest: 3 })], fim, 150);
    // 3 × 150 s = 7,5 min → 8 min → 14h33.
    expect(st.vence_em).toEqual({ dia: 11, mes: 11, ano: 1500, hora: 14, minuto: 33 });
  });
  it('o sem prazo volta intacto; o "até o fim da batalha" não atravessa', () => {
    const fora = window.statusAoEncerrarBatalha([veneno({ vence_em: null }), veneno({ id: 'x:b' })], HOJE, 60);
    expect(fora).toHaveLength(1);
    expect(fora[0].vence_em).toBeNull();
  });
  it('vence na hora e no minuto', () => {
    const st = veneno({ vence_em: { ...HOJE, minuto: 33 } });
    expect(window.statusVigentes([st], { ...HOJE, minuto: 32 })).toHaveLength(1);
    expect(window.statusVigentes([st], { ...HOJE, minuto: 33 })).toHaveLength(0);
  });
  it('a largada converte o status_temp de cada combatente', () => {
    const [p] = M.prazosDaFichaEmRodadas([{ status: 'ativo', status_temp: [veneno({ vence_em: { ...HOJE, minuto: 1 } })] }], HOJE, 30);
    expect(p.status_temp[0].rodadas_rest).toBe(2);
  });
});

describe('o encerramento (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  const i = fonte.indexOf('const finalizarEncerramento');
  const trecho = fonte.slice(i, fonte.indexOf('// ── SETUP ──', i));
  it('o fim da luta é o relógio + a duração, só com o "Avançar" ligado', () => {
    expect(trecho).toMatch(/const avanca = !treino && avancarRelogio && minutosDaLuta > 0/);
    expect(trecho).toMatch(/window\.relogioDepoisDe\(dataJogoAgora, minutosDaLuta\)\) \|\| dataJogoAgora/);
  });
  it('o relógio anda DEPOIS do encerrar_batalha (a cobrança relê os PJs)', () => {
    const rpc = trecho.indexOf("rpc('encerrar_batalha'");
    const relogio = trecho.indexOf('window.avancarRelogioDaMesa(historia.id, minutosDaLuta');
    expect(rpc).toBeGreaterThan(0);
    expect(relogio).toBeGreaterThan(rpc);
  });
  it('a largada converte os prazos com a rodada da mesa inteira', () => {
    expect(fonte).toMatch(/prazosDaFichaEmRodadas\(snaps0, dataJogo, segundosDaRodada\(snaps0\)\)/);
  });
});
