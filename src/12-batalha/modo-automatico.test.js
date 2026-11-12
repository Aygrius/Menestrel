/* ============================================================
   modo-automatico.test.js — 08/11/2026
   ============================================================
   "Crie um 'modo automático' para o personagem durante a batalha." A escolha
   da jogada é pura (decidirJogadaAutomatica): contra o inimigo mais perto,
   técnica > magia > arma; nada alcança, anda; sem nada a fazer, passa.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.decidirJogadaAutomatica).toBeTypeOf('function'); });

const base = { status: 'ativo', status_temp: [], pa_max: 1, pa_rest: 1, mov_rest: 5, ef: 20, ef_max: 20, eh: 0, eh_max: 0, karma: 0 };
const orc = (over = {}) => ({ ...base, tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Orc', ordem: 1, atual: true, pos: { x: 0, y: 0 }, ...over });
const pj = (over = {}) => ({ ...base, tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Lirael', ordem: 2, pos: { x: 2, y: 0 }, ...over });
const CAT = { criById: { 1: { id: 1, nome: 'Orc', ataque: 'Machado', dano_100: 10, dano_l: 1, dano_m: 2, dano_p: 3 } },
  pjById: {}, catalogoBySlug: {}, tecnicasByKey: {}, magiasByKey: {} };

describe('decidirJogadaAutomatica', () => {
  it('inimigo ao lado: ataca com a arma, nele', () => {
    const r = M.decidirJogadaAutomatica(orc(), [orc(), pj()], CAT);
    expect(r).toMatchObject({ tipo: 'acao', aba: 'arma', alvoId: 'pj:7' });
  });
  it('inimigo longe: anda na direção dele', () => {
    const r = M.decidirJogadaAutomatica(orc(), [orc(), pj({ pos: { x: 20, y: 0 } })], CAT);
    expect(r.tipo).toBe('mover');
    expect(r.destino.x).toBeGreaterThan(0);
  });
  it('sem movimento e longe: passa', () => {
    const r = M.decidirJogadaAutomatica(orc({ mov_rest: 0, moveu_na_rodada: true, movimentos_rodada: 2 }),
      [orc(), pj({ pos: { x: 20, y: 0 } })], CAT);
    expect(['passar', 'mover']).toContain(r.tipo);
  });
  it('não escolhe aliado: criatura com dono (animal do PJ) é do lado dos personagens', () => {
    const lobo = { ...base, tipo: 'criatura', ref_id: 2, inst_id: 'cri:2', nome: 'Lobo', dono_pj: 7, pos: { x: 2, y: 0 } };
    const r = M.decidirJogadaAutomatica(pj({ atual: true, pos: { x: 0, y: 0 } }), [pj({ atual: true, pos: { x: 0, y: 0 } }), lobo], CAT);
    expect(r).toMatchObject({ tipo: 'passar', motivo: 'sem_alvo' });
  });
  it('sem ações: passa', () => {
    expect(M.decidirJogadaAutomatica(orc({ pa_rest: 0 }), [orc(), pj()], CAT)).toMatchObject({ tipo: 'passar' });
  });
});

/* 08/11/2026: "O modo automático deve priorizar o último combatente que lhe
   atacou, inimigo ou amigo." */
describe('revide: o último que o atacou vem primeiro', () => {
  const lobo = (over = {}) => ({ ...base, tipo: 'criatura', ref_id: 3, inst_id: 'cri:3', nome: 'Lobo', pos: { x: 2, y: 2 }, ...over });
  it('entre dois inimigos, revida o que atacou (mesmo não sendo o mais perto)', () => {
    const eu = pj({ atual: true, pos: { x: 0, y: 0 } });
    const perto = orc({ atual: false, pos: { x: 2, y: 0 } });
    const longeQueAtacou = { ...orc({ atual: false }), inst_id: 'cri:9', ref_id: 9, nome: 'Ogro', pos: { x: 2, y: 2 } };
    const log = [{ acao: 'arma', autor_inst_id: 'cri:9', alvo_inst_id: 'pj:7' }];
    const cat = { ...CAT, criById: { ...CAT.criById, 9: CAT.criById[1] } };
    const r = M.decidirJogadaAutomatica(eu, [eu, perto, longeQueAtacou], cat, [], log);
    expect(r.alvoId).toBe('cri:9');
  });
  it('revida até um aliado que o atacou', () => {
    const eu = orc();
    const aliado = lobo();   // criatura do mesmo lado (sem dono) — normalmente nunca seria alvo
    const log = [{ acao: 'magia', autor_inst_id: 'cri:3', alvo_inst_id: 'cri:1' }];
    const r = M.decidirJogadaAutomatica(eu, [eu, aliado, pj()], CAT, [], log);
    expect(r.alvoId).toBe('cri:3');
  });
  it('entrada antiga, sem inst_id: casa por tipo, ref_id e nome', () => {
    const eu = orc();
    const log = [{ acao: 'arma', autor_tipo: 'pj', autor_ref_id: 7, autor_nome: 'Lirael', alvo_tipo: 'criatura', alvo_ref_id: 1, alvo_nome: 'Orc' }];
    expect(M.ultimoAtacanteDe(eu, [eu, pj()], log).inst_id).toBe('pj:7');
  });
  it('quem atacou e já caiu: volta ao inimigo mais perto', () => {
    const eu = pj({ atual: true, pos: { x: 0, y: 0 } });
    const caido = { ...orc({ atual: false }), inst_id: 'cri:9', ref_id: 9, nome: 'Ogro', status: 'morto', pos: { x: 2, y: 2 } };
    const perto = orc({ atual: false, pos: { x: 2, y: 0 } });
    const log = [{ acao: 'arma', autor_inst_id: 'cri:9', alvo_inst_id: 'pj:7' }];
    expect(M.decidirJogadaAutomatica(eu, [eu, perto, caido], CAT, [], log).alvoId).toBe('cri:1');
  });
});

/* 08/11/2026: "eu quero que no modo automático eu diga de qual lado o
   combatente está" — um orc posto com os aliados ataca os outros orcs. */
describe('o lado escolhido pelo Mestre', () => {
  it('ladoNaBatalha: p.lado manda; sem ele, o lado da criação', () => {
    expect(M.ladoNaBatalha(orc())).toBe('inimigos');
    expect(M.ladoNaBatalha(orc({ lado: 'aliados' }))).toBe('aliados');
    expect(M.ladoNaBatalha(pj({ lado: 'inimigos' }))).toBe('inimigos');
  });
  it('orc do lado dos aliados ataca o outro orc, não o personagem', () => {
    const traidor = orc({ lado: 'aliados', pos: { x: 0, y: 0 } });
    const outroOrc = { ...orc({ atual: false }), inst_id: 'cri:2', pos: { x: 2, y: 0 } };
    const r = M.decidirJogadaAutomatica(traidor, [traidor, outroOrc, pj({ pos: { x: 0, y: 2 } })], CAT);
    expect(r.alvoId).toBe('cri:2');
  });
});

/* 11/11/2026: "No modo automático, adicione a movimentação das criaturas.
   Atacar e se afastar, ou se afastar para lançar magias de longe ou usar
   arco e flecha." */
describe('a criatura se move no automático', () => {
  const T = () => window.MotorTabuleiro;
  const autoOrc = (over = {}) => orc({ auto: true, pos: { x: 10, y: 10 }, mov_rest: 5, ...over });
  const perto = (over = {}) => pj({ pos: { x: 12, y: 10 }, ...over });

  it('o recuo vai para a casa mais longe do inimigo, dentro do passo', () => {
    const eu = autoOrc();
    const d = M.destinoDeRecuo(eu, [eu, perto()]);
    expect(d).toBeTruthy();
    expect(T().distanciaEntre({ pos: d }, perto())).toBeGreaterThan(T().distanciaEntre(eu, perto()));
    expect(T().validarMovimento(eu, d, [eu, perto()]).ok).toBe(true);
  });
  it('com alvo e alcance, o recuo não tira o alvo do alcance', () => {
    const eu = autoOrc();
    const d = M.destinoDeRecuo(eu, [eu, perto()], { alvo: perto(), alcance: 4 });
    expect(T().distanciaEntre({ pos: d }, perto())).toBeLessThanOrEqual(4);
  });
  it('atacou sem se mover e o inimigo está perto: segura a vez e recua', () => {
    const eu = autoOrc({ pa_rest: 0 });
    expect(M.querRecuarDepoisDoAtaque(eu, [eu, perto()])).toBe(true);
    const r = M.decidirJogadaAutomatica(eu, [eu, perto()], CAT);
    expect(r).toMatchObject({ tipo: 'mover', recuo: true });
  });
  it('já se moveu na rodada, inimigo longe, ou fora do automático: não segura a vez', () => {
    expect(M.querRecuarDepoisDoAtaque(autoOrc({ pa_rest: 0, movimentos_na_rodada: 1 }), [autoOrc(), perto()])).toBe(false);
    const longe = perto({ pos: { x: 25, y: 10 } });
    expect(M.querRecuarDepoisDoAtaque(autoOrc({ pa_rest: 0 }), [autoOrc(), longe])).toBe(false);
    expect(M.querRecuarDepoisDoAtaque(autoOrc({ pa_rest: 0, auto: false }), [autoOrc(), perto()])).toBe(false);
    expect(M.querRecuarDepoisDoAtaque(pj({ auto: true, pa_rest: 0, pos: { x: 10, y: 10 } }), [perto()])).toBe(false);
  });
  it('os fins de vez seguram quem ainda vai recuar', () => {
    const fonte = require('node:fs').readFileSync(require('node:path').resolve(__dirname, './batalha.jsx'), 'utf8');
    expect((fonte.match(/!querRecuarDepoisDoAtaque\(/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
