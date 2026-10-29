/* ============================================================
   treinos.test.js — a fila de treino (22/10/2026)
   ============================================================
   "ao clicar e 'comprar' [...] a técnica vai aparecer no menu treinando, e só
   vai efetivamente ficar disponível para uso após [o] treinamento" — 3 dias
   de Treinando por nível de técnica; magia, 1 dia da atividade da classe
   (Feitiço estudando, Milagre orando, Transmutação meditando, Encanto
   praticando). Fila em ordem de compra; o relógio da mesa avança só o que
   combina com a atividade ligada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './clima-desgaste.jsx';

let G;
beforeAll(() => { G = window; });

const fila = () => ([
  { id: 'a', tipo: 'magia', key: 'cura', nivel: 1, atividade: 'orando', horas_restantes: 24 },
  { id: 'b', tipo: 'magia', key: 'bencao', nivel: 1, atividade: 'orando', horas_restantes: 24 },
  { id: 't', tipo: 'tecnica', key: 'golpe', nivel: 1, atividade: 'treinando', horas_restantes: 72 },
]);

describe('avancarTreinos', () => {
  it('30 h orando: conclui o primeiro milagre e a sobra vai ao segundo', () => {
    const r = G.avancarTreinos(fila(), 'orando', 30);
    expect(r.concluidos.map((c) => c.id)).toEqual(['a']);
    expect(r.treinos.map((t) => [t.id, t.horas_restantes])).toEqual([['b', 18], ['t', 72]]);
  });
  it('sem atividade, nada anda', () => {
    const r = G.avancarTreinos(fila(), null, 10);
    expect(r.concluidos).toEqual([]);
    expect(r.treinos).toEqual(fila());
  });
  it('72 h treinando conclui a técnica', () => {
    const r = G.avancarTreinos(fila(), 'treinando', 72);
    expect(r.concluidos.map((c) => c.id)).toEqual(['t']);
    expect(r.treinos).toHaveLength(2);
  });
  it('fila vazia ou ausente não quebra', () => {
    expect(G.avancarTreinos(null, 'orando', 5)).toEqual({ treinos: [], concluidos: [] });
  });
});

describe('aplicarTreinoNoPj', () => {
  it('conclui um milagre e grava em magias; nada muda devolve null', () => {
    const pj = { magias: {}, tecnicas: {}, treinos: fila() };
    const r = G.aplicarTreinoNoPj(pj, 'orando', 24);
    expect(r.magias).toEqual({ cura: 1 });
    expect(r.treinos.map((t) => t.id)).toEqual(['b', 't']);
    expect(G.aplicarTreinoNoPj(pj, 'dormindo', 5)).toBeNull();
  });
  it('nunca rebaixa', () => {
    const pj = { magias: { cura: 3 }, tecnicas: {}, treinos: fila() };
    expect(G.aplicarTreinoNoPj(pj, 'orando', 24).magias.cura).toBe(3);
  });
  it('técnica concluída vai para tecnicas', () => {
    const pj = { magias: {}, tecnicas: { golpe: 0 }, treinos: fila() };
    expect(G.aplicarTreinoNoPj(pj, 'treinando', 72).tecnicas).toEqual({ golpe: 1 });
  });
  it('horas que só mexem na fila também gravam', () => {
    const r = G.aplicarTreinoNoPj({ magias: {}, tecnicas: {}, treinos: fila() }, 'treinando', 10);
    expect(r.treinos.find((t) => t.id === 't').horas_restantes).toBe(62);
  });
});

describe('fila nas contas', () => {
  it('nivelNaFila e comFila', () => {
    expect(G.nivelNaFila(fila(), 'tecnica', 'golpe')).toBe(1);
    expect(G.nivelNaFila(fila(), 'tecnica', 'outra')).toBe(0);
    expect(G.comFila({ cura: 0, luz: 2 }, fila(), 'magia')).toEqual({ cura: 1, luz: 2, bencao: 1 });
  });
  it('magia com 1 passo na fila: o próximo é o 2', () => {
    const CURA = { key: 'cura', nome: 'Cura', custo: 1, classe: 'Feitiço', nivel_1: 'a', nivel_3: 'b' };
    const pj = { profissao: 'Mago', experiencia: 0, intelecto_base: 3, aura_base: 2, deus: 'Lena', magias: {},
      treinos: [{ tipo: 'magia', key: 'cura', nivel: 1, atividade: 'estudando', horas_restantes: 24 }] };
    // passo 2 = nível 3 > estágio 1
    expect(G.bloqueioAprenderMagia(CURA, pj, [CURA]).motivo).toBe('acima_do_estagio');
  });
});

describe('ATIVIDADE_DA_CLASSE e Praticando', () => {
  it('cada classe treina na sua atividade', () => {
    expect(G.ATIVIDADE_DA_CLASSE).toEqual({ 'Feitiço': 'estudando', Milagre: 'orando', 'Transmutação': 'meditando', Encanto: 'praticando' });
    /* 28/10/2026, usuário: "uma habilidade demora 12 horas, uma magia 24
       horas, uma técnica 36 horas". Técnica caiu pela metade e habilidade
       entrou — ela não existia nesta tabela. */
    expect(G.HORAS_TREINO).toEqual({ tecnica: 36, magia: 24, habilidade: 12 });
  });
  /* Praticar DEIXOU de recuperar como Estudar (27/10/2026): o usuário deu a
     cada ofício uma barra própria — praticar acalma a Loucura, estudar lava a
     Má Fama. Eram iguais desde 22/10 ("recupera igual estudando"). */
  it('Praticando existe e tem receita própria', () => {
    expect(G.ATIVIDADES.map((a) => a.id)).toContain('praticando');
    expect(G.ATIVIDADE_EFEITO.praticando).toEqual({ hora: [{ cond: 'sanidade', base: 2 }] });
    expect(G.ATIVIDADE_EFEITO.estudando).toEqual({ hora: [{ cond: 'reputacao', base: 2 }] });
    expect(G.ATIVIDADE_EFEITO.treinando).toEqual({ hora: [{ cond: 'euforia', base: 2 }] });
  });
});
