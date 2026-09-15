/* ============================================================
   provocar-conduzir.test.jsx — as duas técnicas que saíram da mesa
   ============================================================
   "Melhorando as técnicas de combate:
    Conduzir Oponente: Se o jogador for bem sucedido no teste, ele poderá
    mover o adversário escolhido por 2 rodadas.
    Provocar: Se o jogador for bem sucedido no teste, o inimigo só poderá
    atacar ele." (usuário, 14/09/2026)

   Até aqui as duas eram arbitragem do Mestre (TECNICA_FORA_DO_REGISTRO).
   Agora moram no motor: o status fica no INIMIGO e aponta, por
   fonte_inst_id, para quem provocou / quem conduz — a mesma forma da Escolta.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, T, AcaoPanel;
beforeAll(() => {
  M = window.MotorBatalha;
  T = window.MotorTabuleiro;
  AcaoPanel = window.AcaoPanel;
});
afterEach(cleanup);

const lutador = (id, over = {}) => ({
  inst_id: id, tipo: 'criatura', ref_id: id, nome: id, ordem: 2,
  status: 'ativo', atual: false, vb: 20, pa_max: 2, pa_rest: 2, mov_rest: 5,
  ef: 20, ef_max: 20, eh: 5, eh_max: 5, ar: 0, ar_max: 0,
  status_temp: [], ...over,
});

const PROVOCAR = { key: 'provocar', nome: 'Provocar' };
const CONDUZIR = { key: 'conduzir_oponente', nome: 'Conduzir Oponente' };

describe('o registro', () => {
  it('Provocar: teste Difícil, inimigo, 5 rodadas — o texto do banco', () => {
    const r = window.tecnicaEfeitoDe('provocar');
    expect(r).toMatchObject({ modo: 'teste', alvo: 'inimigo', rodadas: 5, dificuldade: 'dificil' });
    expect(r.efeitos).toEqual([{ tipo: 'provocado', valor: true }]);
  });

  it('Conduzir Oponente: teste Médio, inimigo, 2 rodadas, 5 metros', () => {
    const r = window.tecnicaEfeitoDe('conduzir_oponente');
    expect(r).toMatchObject({ modo: 'teste', alvo: 'inimigo', rodadas: 2, dificuldade: 'medio' });
    expect(r.efeitos).toEqual([{ tipo: 'conduzido', valor: true, casas: 5 }]);
  });

  it('as duas mordem o ALVO, não ficam no atacante', () => {
    expect(M.efeitoAncoraNoAtacante(window.tecnicaEfeitoDe('provocar'))).toBe(false);
    expect(M.efeitoAncoraNoAtacante(window.tecnicaEfeitoDe('conduzir_oponente'))).toBe(false);
  });

  it('o log diz em quem pegou, sem número', () => {
    expect(M.textoEfeitoTecnica('provocar', { alvos: ['Orc'] }, 'Eu')).toBe(' — efeito aplicado em Orc');
  });
});

describe('aplicarEfeitoTecnica ancora em quem ativou', () => {
  it('Provocar grava fonte_inst_id no inimigo', () => {
    const orc = M.aplicarEfeitoTecnica(lutador('orc'), PROVOCAR, 0, { fonteInstId: 'heroi' });
    const st = orc.status_temp.find((s) => s.efeito.tipo === 'provocado');
    expect(st.efeito.fonte_inst_id).toBe('heroi');
    expect(st.rodadas_rest).toBe(5);
  });

  it('Conduzir grava fonte e casas', () => {
    const orc = M.aplicarEfeitoTecnica(lutador('orc'), CONDUZIR, 0, { fonteInstId: 'heroi' });
    const st = orc.status_temp.find((s) => s.efeito.tipo === 'conduzido');
    expect(st.efeito).toMatchObject({ fonte_inst_id: 'heroi', casas: 5 });
    expect(st.rodadas_rest).toBe(2);
  });
});

/* ── PROVOCAR ─────────────────────────────────────────────────── */

const provocadoPor = (fonteId, over = {}) => lutador('orc', {
  status_temp: [{ id: 'tec_provocar', nome: 'Provocar', rodadas_rest: 5,
    efeito: { tipo: 'provocado', valor: true, fonte_inst_id: fonteId } }],
  ...over,
});

describe('Provocar — o provocado só ataca quem provocou', () => {
  const heroi = lutador('heroi', { tipo: 'pj' });
  const mago = lutador('mago', { tipo: 'pj' });

  it('a lista de alvos fica só com o provocador', () => {
    const orc = provocadoPor('heroi');
    const todos = [heroi, mago, orc];
    expect(M.alvosSobProvocacao(orc, [heroi, mago], todos).map((p) => p.inst_id)).toEqual(['heroi']);
    expect(M.podeAtacarSobProvocacao(orc, mago, todos)).toBe(false);
    expect(M.podeAtacarSobProvocacao(orc, heroi, todos)).toBe(true);
  });

  it('sem provocação, a lista volta a mesma (referência)', () => {
    const lista = [heroi, mago];
    expect(M.alvosSobProvocacao(lutador('orc'), lista, [...lista])).toBe(lista);
  });

  it.each(['desmaiado', 'morto', 'desistiu'])('provocador %s solta o provocado', (status) => {
    const caido = { ...heroi, status };
    const orc = provocadoPor('heroi');
    const todos = [caido, mago, orc];
    expect(M.provocadorDe(orc, todos)).toBeNull();
    expect(M.alvosSobProvocacao(orc, [caido, mago], todos)).toHaveLength(2);
  });

  it('provocador que saiu da lista também solta', () => {
    const orc = provocadoPor('heroi');
    expect(M.provocadorDe(orc, [mago, orc])).toBeNull();
  });
});

// Mesmo PJ de alvos-validos.test.jsx: o painel monta a ficha do ator.
const PJ = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42,
  habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {},
  grupos_armas: { CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'machado_pesado', slot: 'mao_d', equipado: true }] },
};
const CATALOGOS = {
  pjById: { 64: PJ }, magiasByKey: {},
  catalogoBySlug: { machado_pesado: { slug: 'machado_pesado', nome: 'Machado Pesado',
    dano: 20, dano_l: -3, dano_m: -1, dano_p: 2, ajuste_atributo: 'FOR', grupo_armas: 'CM', alcance: 0 } },
};
const pjAtor = (over = {}) => lutador('pj:64', { tipo: 'pj', ref_id: 64, nome: 'Yuldrous',
  atual: true, ordem: 1, condicoes: {}, ...over });
function montar(ator, participantes) {
  return render(
    <div className="menestrel-ui">
      <AcaoPanel ator={ator} participantes={participantes} catalogos={CATALOGOS} lang="pt"
        onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onCancel={() => {}} onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}} />
    </div>
  );
}

describe('Provocar — o painel de Ação diz por quê', () => {
  it('o provocado vê o aviso com o nome de quem provocou', () => {
    // Aqui o provocado é o PJ: a Lysandra (criatura) provocou o Yuldrous.
    const lysandra = lutador('lys', { nome: 'Lysandra' });
    const eu = pjAtor({ status_temp: provocadoPor('lys').status_temp });
    montar(eu, [eu, lysandra, lutador('lobo')]);
    expect(screen.getByText('Provocado por Lysandra: só pode atacá-lo.')).toBeTruthy();
  });

  it('sem provocação, nada de aviso', () => {
    const eu = pjAtor();
    montar(eu, [eu, lutador('lobo')]);
    expect(screen.queryByText(/Provocado por/)).toBeNull();
  });
});

/* ── CONDUZIR OPONENTE ────────────────────────────────────────── */

const conduzidoPor = (fonteId, over = {}) => lutador('orc', {
  pos: { x: 10, y: 10 },
  status_temp: [{ id: 'tec_conduzir_oponente', nome: 'Conduzir Oponente', rodadas_rest: 2,
    efeito: { tipo: 'conduzido', valor: true, fonte_inst_id: fonteId, casas: 5 } }],
  ...over,
});

describe('Conduzir Oponente — quem conduz leva o adversário', () => {
  const heroi = lutador('heroi', { tipo: 'pj', atual: true, pos: { x: 0, y: 0 } });

  it('só quem conduz: 5 casas para ele, 0 para os outros', () => {
    const orc = conduzidoPor('heroi');
    expect(T.conducaoDisponivel(orc, heroi)).toBe(5);
    expect(T.conducaoDisponivel(orc, lutador('mago', { pos: { x: 30, y: 0 } }))).toBe(0);
    expect(T.conducaoDisponivel(lutador('orc', { pos: { x: 10, y: 10 } }), heroi)).toBe(0);
  });

  it('move até 5 casas em linha reta, sem gastar movimento nem PA de ninguém', () => {
    const orc = conduzidoPor('heroi');
    const r = T.conduzirParticipante(orc, heroi, { x: 15, y: 10 }, [heroi, orc]);
    expect(r.ok).toBe(true);
    expect(r.participante.pos).toEqual({ x: 15, y: 10 });
    expect(r.participante.mov_rest).toBe(orc.mov_rest);
    expect(r.participante.pa_rest).toBe(orc.pa_rest);
    expect(r.participante.movimentos_na_rodada).toBeUndefined();
  });

  it('mais longe que 5 casas é recusado', () => {
    const r = T.conduzirParticipante(conduzidoPor('heroi'), heroi, { x: 16, y: 10 }, []);
    expect(r).toMatchObject({ ok: false, motivo: 'sem_movimento' });
  });

  it('célula ocupada é recusada', () => {
    const outro = lutador('outro', { pos: { x: 14, y: 10 } });
    const r = T.conduzirParticipante(conduzidoPor('heroi'), heroi, { x: 14, y: 10 }, [outro]);
    expect(r).toMatchObject({ ok: false, motivo: 'celula_ocupada' });
  });

  it('uma condução por rodada; na rodada seguinte, de novo', () => {
    const r1 = T.conduzirParticipante(conduzidoPor('heroi'), heroi, { x: 13, y: 10 }, []);
    expect(T.conducaoDisponivel(r1.participante, heroi)).toBe(0);
    const r2 = T.conduzirParticipante(r1.participante, heroi, { x: 14, y: 10 }, []);
    expect(r2).toMatchObject({ ok: false, motivo: 'sem_conducao' });

    // Virada: a contagem desce, a marca deixa de bater.
    const virado = { ...r1.participante, status_temp: M.decrementarStatusTemp(r1.participante.status_temp) };
    expect(T.conducaoDisponivel(virado, heroi)).toBe(5);
    // E na segunda virada o status acaba: 2 rodadas, contando a da ativação.
    expect(M.decrementarStatusTemp(virado.status_temp)).toEqual([]);
  });

  it('quem conduz fora de combate não conduz; conduzido morto não se move', () => {
    expect(T.conducaoDisponivel(conduzidoPor('heroi'), { ...heroi, status: 'desmaiado' })).toBe(0);
    expect(T.conducaoDisponivel(conduzidoPor('heroi', { status: 'morto' }), heroi)).toBe(0);
    // Desmaiado se arrasta.
    expect(T.conducaoDisponivel(conduzidoPor('heroi', { status: 'desmaiado' }), heroi)).toBe(5);
  });

  it('o clique longe demais anda o que a CONDUÇÃO permite, não o movimento do alvo', () => {
    const orc = conduzidoPor('heroi', { mov_rest: 1 });
    const d = T.destinoAlcancavel(orc, { x: 40, y: 10 }, [orc], 5);
    expect(d).toEqual({ x: 15, y: 10 });
    // Sem o passo explícito, segue o movimento do próprio token.
    expect(T.destinoAlcancavel(orc, { x: 40, y: 10 }, [orc])).toEqual({ x: 11, y: 10 });
  });
});
