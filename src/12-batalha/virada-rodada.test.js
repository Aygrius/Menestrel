/* ============================================================
   virada-rodada.test.js — a rodada vira sozinha no fim da ordem
   ============================================================
   Antes de 30/08/2026 só o botão "Nova Rodada" virava a rodada. Todo
   caminho que encerrava o turno do ÚLTIMO da ordem — atacar, testar,
   usar item, morrer, mudar de status — caía num `else` que zerava o
   `atual` de TODOS e parava por ali; o código dizia isso com todas as
   letras: "nova rodada via clique manual". A batalha ficava sem ninguém
   na vez até alguém perceber e clicar.

   Aqui fica travada a peça pura dessa correção: `proximoAtivo` é quem
   devolve null nesse ponto, e `montarNovaRodada` é quem reconstrói a
   rodada seguinte. Os call sites (aplicarAcao/aplicarTeste/aplicarItem/
   aplicarDano/mudarStatus e o autoPassarSeNecessario do Jogador) usam
   exatamente esse par.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const lutador = (nome, ordem, extra) => ({
  tipo: 'pj', ref_id: nome, inst_id: nome, nome, ordem,
  status: 'ativo', atual: false, vb: 20,
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], ...extra,
});

describe('proximoAtivo — o gatilho da virada', () => {
  it('devolve o próximo da ordem quando ainda há quem agir', () => {
    const arr = [lutador('A', 1), lutador('B', 2)];
    expect(M.proximoAtivo(arr, 1).nome).toBe('B');
  });

  it('devolve null quando o turno acabou no último da ordem', () => {
    // Sem PA não é critério de proximoAtivo — quem barra é o status.
    const arr = [lutador('A', 1, { status: 'morto' }), lutador('B', 2)];
    expect(M.proximoAtivo(arr, 2)).toBeFalsy();
  });

  it('null também quando todos os outros estão fora', () => {
    const arr = [lutador('A', 1, { status: 'desistiu' }), lutador('B', 2, { status: 'morto' })];
    expect(M.proximoAtivo(arr, 2)).toBeFalsy();
  });
});

describe('montarNovaRodada — o que a virada automática aplica', () => {
  it('devolve PA, movimento e o direito de mover a quem está ativo', () => {
    const arr = [lutador('A', 1, { pa_rest: 0, mov_rest: 0, moveu_na_rodada: true, atual: true })];
    const { participantes } = M.montarNovaRodada(arr);
    const a = participantes[0];
    expect(a.pa_rest).toBe(a.pa_max);
    expect(a.mov_rest).toBe(5);
    expect(a.moveu_na_rodada).toBe(false);
  });

  it('elege um novo atual — a batalha nunca fica sem ninguém na vez', () => {
    const arr = [lutador('A', 1, { pa_rest: 0 }), lutador('B', 2, { pa_rest: 0, atual: true })];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes.filter((p) => p.atual)).toHaveLength(1);
  });

  it('morto não volta a agir nem recupera nada', () => {
    const arr = [lutador('A', 1, { status: 'morto', pa_rest: 0, mov_rest: 0, moveu_na_rodada: true })];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes[0].pa_rest).toBe(0);
    expect(participantes[0].moveu_na_rodada).toBe(true);
    expect(participantes[0].atual).toBe(false);
  });

  it('ninguém elegível → ninguém atual, sem estourar', () => {
    const arr = [lutador('A', 1, { status: 'morto' }), lutador('B', 2, { status: 'desistiu' })];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes.some((p) => p.atual)).toBe(false);
  });

  it('a virada é pura: não muta o array recebido', () => {
    const arr = [lutador('A', 1, { pa_rest: 0, moveu_na_rodada: true })];
    M.montarNovaRodada(arr);
    expect(arr[0].pa_rest).toBe(0);
    expect(arr[0].moveu_na_rodada).toBe(true);
  });
});

describe('rolagem pendente do Jogador não atravessa a virada', () => {
  // O campo é do lado Jogador (participantes[].rolagem_pendente): ele não
  // escreve em `batalhas`, só passa pela RPC atualizar_batalha_jogador, que
  // recebe participantes/log/rodada. Rodada nova invalida o d20 da anterior
  // mesmo quando quem virou a rodada foi OUTRA pessoa — o Mestre no botão
  // "Nova Rodada", por exemplo.
  const comRolagem = { coluna: 'M', d20: 17, ator: { tipo: 'pj', ref_id: 'A' } };

  it('processarViradaDeRodada limpa a rolagem do participante', () => {
    const p = lutador('A', 1, { rolagem_pendente: comRolagem });
    expect(M.processarViradaDeRodada(p).participante.rolagem_pendente).toBeNull();
  });

  it('limpa mesmo em quem não está ativo (morto não guarda d20 pra depois)', () => {
    const p = lutador('A', 1, { status: 'morto', rolagem_pendente: comRolagem });
    expect(M.processarViradaDeRodada(p).participante.rolagem_pendente).toBeNull();
  });

  it('montarNovaRodada limpa a rolagem de TODOS de uma vez', () => {
    const arr = [
      lutador('A', 1, { atual: true, rolagem_pendente: comRolagem }),
      lutador('B', 2, { rolagem_pendente: comRolagem }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes.every((p) => p.rolagem_pendente == null)).toBe(true);
  });

  it('quem não tinha rolagem não ganha a chave à toa', () => {
    const p = lutador('A', 1);
    expect(M.processarViradaDeRodada(p).participante.rolagem_pendente).toBeUndefined();
  });
});

describe('entradaLogViradaRodada — o dano por rodada sempre vira log', () => {
  // Antes, os quatro handle* do Jogador (ação/teste/item/apoio) chamavam
  // autoPassarSeNecessario e DESCARTAVAM os eventos: quando o turno do
  // jogador virava a rodada, o veneno mordia as pools de verdade mas não
  // aparecia no log nem na Central de Mensagens — a EF caía sozinha, sem
  // nada explicando. O texto agora sai desta função só, usada pelo Mestre
  // (novaRodada) e pelo Jogador (registrarViradaNoLog).
  const eventos = [
    { nome: 'Victor', total: 5, eventos: [{ nome: 'Envenenado', valor: 5 }] },
    { nome: 'Cão',    total: 3, eventos: [{ nome: 'Sangramento', valor: 1 }, { nome: 'Veneno', valor: 2 }] },
  ];

  it('sem eventos não há entrada — o log fica intocado', () => {
    expect(M.entradaLogViradaRodada([], 4)).toBeNull();
    expect(M.entradaLogViradaRodada(undefined, 4)).toBeNull();
  });

  it('nomeia quem sangrou, o total e a origem de cada mordida', () => {
    const e = M.entradaLogViradaRodada(eventos, 4);
    expect(e.texto).toBe('Victor sofreu 5 de dano (Envenenado 5); Cão sofreu 3 de dano (Sangramento 1 + Veneno 2)');
  });

  it('a entrada é do tipo sistema e carrega a rodada NOVA', () => {
    const e = M.entradaLogViradaRodada(eventos, 4);
    expect(e.acao).toBe('sistema');
    expect(e.rodada).toBe(4);
    expect(typeof e.ts).toBe('number');
  });

  it('o dano que a entrada descreve é o mesmo que montarNovaRodada cobrou', () => {
    const envenenado = lutador('A', 1, {
      ef: 10,
      status_temp: [{ id: 'v1', nome: 'Envenenado', rodadas_rest: 3, efeito: { tipo: 'dano_por_rodada', valor: 4 } }],
    });
    const { participantes, eventos: ev } = M.montarNovaRodada([envenenado]);
    expect(participantes[0].ef).toBe(6);
    expect(M.entradaLogViradaRodada(ev, 2).texto).toBe('A sofreu 4 de dano (Envenenado 4)');
  });
});
