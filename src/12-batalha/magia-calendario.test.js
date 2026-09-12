/* ============================================================
   magia-calendario.test.js — degrau 3
   ============================================================
   57 magias duram minutos, horas, dias ou anos. Fora de combate elas não têm
   rodadas para contar — mas têm a data do jogo, que já existe e que
   somarDiasFantasy já sabia somar (construída para a cura de Doenças).

   O que as torna ÚTEIS é o que acontece depois: uma Bênção de "1 hora"
   lançada antes de entrar na masmorra precisa estar ativa quando a luta
   começa. Por isso a magia ativa fica na FICHA com data de vencimento, e o
   snapshot de batalha a transforma em status_temp ao montar.

   VENCIMENTO PREGUIÇOSO: expira por comparação NA LEITURA, nunca por rotina
   de fundo. Nada avança a data do jogo sozinho — se o vencimento dependesse
   de um processo, os bônus nunca acabariam.

   Ver docs/fora-de-combate.md §3, degrau 3.
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

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Textos e durações literais do banco.
const BENCAO_1H = { key: 'bencao', nome: 'Bênção', duracao: '1 hora',
                    nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };
const PELE = { key: 'pele_de_arvore', nome: 'Pele de Árvore', duracao: '30 dias',
               nivel_1: 'Reduza 4 de dano máximo.' };
const CURAS = { key: 'curas_espirituais', nome: 'Curas Espirituais',
                duracao: 'Instantânea', nivel_1: 'Restaura 20 de energia heroica.' };
const ESCURIDAO = { key: 'escuridao', nome: 'Escuridão', duracao: 'Variável',
                    nivel_1: 'A magia tem duração de 1 rodada.',
                    nivel_5: 'A magia tem duração de 10 minutos.' };
const HOJE = { dia: 10, mes: 5, ano: 12 };

describe('quantos dias de jogo a magia dura', () => {
  it.each([
    ['30 dias', 30], ['7 dias', 7], ['1 dia', 1],
    ['1 hora', 0], ['24 horas', 0], ['30 minutos', 0],
    ['50 anos', 50 * 361], ['60 dias', 60],
  ])('%s → %i dias', (duracao, esperado) => {
    expect(window.duracaoEmDiasDeJogo({ duracao }, 1)).toBe(esperado);
  });

  it('"1 ano e 1 dia" SOMA as duas parcelas', () => {
    expect(window.duracaoEmDiasDeJogo({ duracao: '1 ano e 1 dia' }, 1)).toBe(362);
  });

  it('minutos e horas dão ZERO — o calendário tem grão de dia', () => {
    /* Fingir precisão de hora num calendário que só conta dias seria mentir
       com mais casas. Quando o Mestre avança a data, elas acabaram. */
    expect(window.duracaoEmDiasDeJogo({ duracao: '6 horas' }, 1)).toBe(0);
  });

  it('magia que não dura no calendário devolve null', () => {
    expect(window.duracaoEmDiasDeJogo({ duracao: '10 rodadas' }, 1)).toBeNull();
    expect(window.duracaoEmDiasDeJogo(CURAS, 1)).toBeNull();
  });

  it('o texto do NÍVEL manda — a mesma magia muda de balde', () => {
    expect(window.duracaoEmDiasDeJogo(ESCURIDAO, 1)).toBeNull();   // rodada
    expect(window.duracaoEmDiasDeJogo(ESCURIDAO, 5)).toBe(0);      // 10 minutos
  });
});

describe('a magia ativa que a evocação cria', () => {
  it('30 dias a partir de 10/Mês do Ouro vence em 10 do mês seguinte', () => {
    // Mês tem 30 dias: 10/5 + 30 = 10/6.
    const a = window.magiaAtivaDaEvocacao(PELE, 1, HOJE);
    expect(a).toMatchObject({ key: 'pele_de_arvore', nivel: 1 });
    expect(a.vence_em).toEqual({ dia: 10, mes: 6, ano: 12 });
  });

  it('1 hora vence HOJE mesmo', () => {
    expect(window.magiaAtivaDaEvocacao(BENCAO_1H, 1, HOJE).vence_em).toEqual(HOJE);
  });

  it('guarda o NÍVEL, não os números calculados', () => {
    /* O texto do nível é a fonte. Congelar valores aqui criaria uma segunda
       cópia que sairia de sincronia no primeiro ajuste do catálogo. */
    const a = window.magiaAtivaDaEvocacao(BENCAO_1H, 1, HOJE);
    expect(a).not.toHaveProperty('efeitos');
    expect(a.nivel).toBe(1);
  });

  it('magia instantânea não vira magia ativa', () => {
    expect(window.magiaAtivaDaEvocacao(CURAS, 1, HOJE)).toBeNull();
  });

  it('história SEM data definida não cria vencimento', () => {
    expect(window.magiaAtivaDaEvocacao(PELE, 1, null)).toBeNull();
  });
});

describe('vencimento preguiçoso: expira na leitura', () => {
  const ativa = (venceEm) => ({ key: 'bencao', nome: 'Bênção', nivel: 1, vence_em: venceEm });

  it('vale enquanto a data do jogo não chegou', () => {
    const r = window.magiasAtivasVigentes([ativa({ dia: 20, mes: 5, ano: 12 })], HOJE);
    expect(r).toHaveLength(1);
  });

  it('NO DIA do vencimento já não vale', () => {
    expect(window.magiasAtivasVigentes([ativa(HOJE)], HOJE)).toHaveLength(0);
  });

  it('depois do vencimento também não', () => {
    const r = window.magiasAtivasVigentes([ativa({ dia: 1, mes: 5, ano: 12 })], HOJE);
    expect(r).toHaveLength(0);
  });

  it('atravessa a virada do ano corretamente', () => {
    // Vence em 1/1 do ano 13; em 30/12 do ano 12 ainda vale.
    const r = window.magiasAtivasVigentes([ativa({ dia: 1, mes: 1, ano: 13 })],
      { dia: 30, mes: 12, ano: 12 });
    expect(r).toHaveLength(1);
  });

  it('sem data do jogo, nada vence — não há como comparar', () => {
    expect(window.magiasAtivasVigentes([ativa(HOJE)], null)).toHaveLength(1);
  });

  it('filtra só as vencidas, mantendo as outras', () => {
    const r = window.magiasAtivasVigentes([
      { key: 'a', nivel: 1, vence_em: { dia: 1, mes: 5, ano: 12 } },    // venceu
      { key: 'b', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } },   // vale
    ], HOJE);
    expect(r.map((x) => x.key)).toEqual(['b']);
  });
});

describe('a magia entra valendo na batalha', () => {
  /* É o que dá sentido ao degrau: uma Bênção de 1 hora lançada antes da
     masmorra está ativa quando a luta começa. */
  const snap = () => ({
    inst_id: 'pj:1', tipo: 'pj', nome: 'Mago', status: 'ativo',
    eh: 10, eh_max: 10, ef: 20, ef_max: 20, status_temp: [],
  });
  const pjCom = (ativas) => ({ estado_atual: { magias_ativas: ativas } });
  const CAT = { bencao: BENCAO_1H, pele_de_arvore: PELE };

  it('semeia o status a partir da ficha', () => {
    const r = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'bencao', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    expect(r.status_temp.some((s) => s.efeito.tipo === 'mod_ataque')).toBe(true);
  });

  it('e o valor é o do NÍVEL guardado', () => {
    const r = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'bencao', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    expect(r.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.valor).toBe(1);
  });

  it('dura a batalha INTEIRA — uma hora é mais longa que qualquer combate', () => {
    const r = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'bencao', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    expect(r.status_temp[0].rodadas_rest).toBeNull();
  });

  it('magia VENCIDA não entra', () => {
    const r = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'bencao', nivel: 1, vence_em: { dia: 1, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    expect(r.status_temp).toHaveLength(0);
  });

  it('duas magias ativas entram as duas', () => {
    const r = M.semearMagiasAtivas(snap(), pjCom([
      { key: 'bencao', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } },
      { key: 'pele_de_arvore', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } },
    ]), CAT, HOJE);
    expect(r.status_temp.map((s) => s.efeito.tipo).sort())
      .toEqual(['mod_ataque', 'mod_dano_max', 'mod_eh_temp']);
  });

  it('magia fora do catálogo é ignorada em silêncio', () => {
    const r = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'nao_existe', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    expect(r.status_temp).toHaveLength(0);
  });

  it('ficha sem magias ativas devolve o MESMO snapshot', () => {
    const s = snap();
    expect(M.semearMagiasAtivas(s, { estado_atual: {} }, CAT, HOJE)).toBe(s);
    expect(M.semearMagiasAtivas(s, null, CAT, HOJE)).toBe(s);
  });

  it('reusa aplicarEfeitoMagia — o mesmo caminho da conjuração em batalha', () => {
    /* Um segundo caminho daria números diferentes para a mesma magia conforme
       onde foi evocada. O status semeado é indistinguível do conjurado. */
    const semeado = M.semearMagiasAtivas(snap(),
      pjCom([{ key: 'bencao', nivel: 1, vence_em: { dia: 20, mes: 5, ano: 12 } }]),
      CAT, HOJE);
    const conjurado = M.aplicarEfeitoMagia(snap(), BENCAO_1H, 1);
    expect(semeado.status_temp.map((s) => s.efeito))
      .toEqual(conjurado.status_temp.map((s) => s.efeito));
  });
});
